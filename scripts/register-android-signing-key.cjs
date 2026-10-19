// Registers the release signing key of the Sohba Android app with Firebase.
// Google sign-in only works for an APK whose signing certificate (SHA-1) is registered on the Firebase
// Android app; without it Google returns DEVELOPER_ERROR. After registering, the fresh
// google-services.json is downloaded into the project so the next build carries it.
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
const packageName = "com.viraflow.app";

// Fingerprints of mobile/android/app/pulseora-release.keystore (alias pulseora-release).
const releaseHashes = [
  { certType: "SHA_1", shaHash: "2b72a3263a2289e62103d098ecdf76a95dcc14e5" },
  {
    certType: "SHA_256",
    shaHash: "e5c77c6487f862c733bf20aeb2156be21fab06e0bf84e0a5e00e8991f96b0bc7",
  },
];

const configTargets = [
  path.join(rootDir, "google-services.json"),
  path.join(rootDir, "mobile", "google-services.json"),
  path.join(rootDir, "mobile", "android", "app", "google-services.json"),
];

async function main() {
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in backend/.env.");
  }

  const client = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
  });
  const base = `https://firebase.googleapis.com/v1beta1/projects/${projectId}`;

  const apps = await client.request({ url: `${base}/androidApps?pageSize=100` });
  const app = (apps.data.apps || []).find((item) => item.packageName === packageName);
  if (!app) {
    throw new Error(`No Firebase Android app with package ${packageName} in project ${projectId}.`);
  }

  const existing = await client.request({ url: `${base}/androidApps/${app.appId}/sha` });
  const known = new Set((existing.data.certificates || []).map((cert) => cert.shaHash.toLowerCase()));

  for (const hash of releaseHashes) {
    if (known.has(hash.shaHash)) {
      console.log(`${hash.certType} release fingerprint already registered.`);
      continue;
    }
    await client.request({
      url: `${base}/androidApps/${app.appId}/sha`,
      method: "POST",
      data: hash,
    });
    console.log(`Registered ${hash.certType} release fingerprint.`);
  }

  // Firebase creates the Android OAuth client for the new fingerprint in the background.
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const config = await client.request({ url: `${base}/androidApps/${app.appId}/config` });
  const contents = Buffer.from(config.data.configFileContents, "base64").toString("utf8");
  JSON.parse(contents);
  for (const target of configTargets) {
    if (fs.existsSync(path.dirname(target))) {
      fs.writeFileSync(target, contents);
    }
  }
  console.log("SIGNING KEY OK - google-services.json updated.");
}

main().catch((error) => {
  const message = error?.response?.data?.error?.message || error?.message || String(error);
  console.error(`SIGNING KEY REGISTRATION FAILED: ${message}`);
  process.exit(1);
});
