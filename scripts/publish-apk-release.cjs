// Publishes the newest Sohba APK as a GitHub release so the download page always offers the latest version:
// https://github.com/AhmedHadi77/Viraflow/releases/latest/download/Sohba.apk
// Uses this PC's saved GitHub sign-in (the same one "git push" uses). The token is never printed.
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const OWNER = "AhmedHadi77";
const REPO = "Viraflow";
const statusFile = path.join(rootDir, ".claude-sync", "release-output.txt");
const lines = [];
const log = (line) => { lines.push(line); console.log(line); };

function githubToken() {
  const output = execSync("git credential fill", { input: "protocol=https\nhost=github.com\n\n", cwd: rootDir }).toString();
  const match = output.match(/^password=(.+)$/m);
  if (!match) throw new Error("No saved GitHub sign-in found on this PC.");
  return match[1].trim();
}

async function api(token, method, url, body, headers = {}) {
  const res = await fetch(url.startsWith("http") ? url : `https://api.github.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "sohba-release", ...headers },
    body,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

// Streams the file to GitHub without a time limit (a large APK on a slow connection can take many minutes).
function uploadAsset(token, releaseId, filePath, size) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: "uploads.github.com",
        path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=Sohba.apk`,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "sohba-release",
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Length": size,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    let sent = 0;
    let lastShown = 0;
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => {
      sent += chunk.length;
      const percent = Math.floor((sent / size) * 100);
      if (percent >= lastShown + 10) {
        lastShown = percent;
        console.log(`Uploading... ${percent}%`);
        fs.writeFileSync(statusFile, lines.concat(`Uploading... ${percent}%`).join("\n"));
      }
    });
    stream.on("error", reject);
    stream.pipe(req);
  });
}

async function main() {
  const version = JSON.parse(fs.readFileSync(path.join(rootDir, "mobile", "app.json"), "utf8")).expo.version;
  const apkPath = path.join(rootDir, `Sohba-${version}-android-release.apk`);
  if (!fs.existsSync(apkPath)) throw new Error(`APK not found: ${path.basename(apkPath)}`);
  const tag = `v${version}`;
  const token = githubToken();

  let release = await api(token, "GET", `/repos/${OWNER}/${REPO}/releases/tags/${tag}`);
  if (release.status === 404) {
    release = await api(token, "POST", `/repos/${OWNER}/${REPO}/releases`, JSON.stringify({
      tag_name: tag,
      target_commitish: "main",
      name: `Sohba ${version}`,
      body: `Sohba ${version} for Android. Download Sohba.apk below and open it on your phone to install.`,
      make_latest: "true",
    }), { "Content-Type": "application/json" });
  }
  if (release.status >= 300) throw new Error(`Could not create the release (${release.status}): ${release.data && release.data.message}`);
  const releaseId = release.data.id;
  log(`Release ${tag} ready (id ${releaseId}).`);

  for (const asset of release.data.assets || []) {
    if (asset.name === "Sohba.apk") {
      await api(token, "DELETE", `/repos/${OWNER}/${REPO}/releases/assets/${asset.id}`);
      log("Replaced the previous Sohba.apk in this release.");
    }
  }

  const size = fs.statSync(apkPath).size;
  const upload = await uploadAsset(token, releaseId, apkPath, size);
  if (upload.status >= 300) throw new Error(`Upload failed (${upload.status}): ${upload.body.slice(0, 200)}`);
  log(`Uploaded Sohba.apk (${(size / 1048576).toFixed(1)} MB).`);
  log(`Download link: https://github.com/${OWNER}/${REPO}/releases/latest/download/Sohba.apk`);
}

main()
  .catch((error) => log(`FAILED: ${error.message}`))
  .finally(() => fs.writeFileSync(statusFile, lines.join("\n")));
