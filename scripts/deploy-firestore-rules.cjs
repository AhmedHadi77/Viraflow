const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
const rulesPath = path.join(rootDir, "firestore.rules");

async function main() {
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in backend/.env.");
  }

  const rulesContent = fs.readFileSync(rulesPath, "utf8");
  const client = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const rulesetResponse = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    method: "POST",
    data: {
      source: {
        files: [
          {
            name: "firestore.rules",
            content: rulesContent,
          },
        ],
      },
    },
  });

  const rulesetName = rulesetResponse.data?.name;
  if (!rulesetName) {
    throw new Error("Firebase Rules API did not return a ruleset name.");
  }

  await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
    method: "PATCH",
    data: {
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName,
      },
      updateMask: "rulesetName",
    },
  });

  console.log(`Deployed ${rulesetName} to ${projectId}/cloud.firestore.`);
}

main().catch((error) => {
  const message = error?.response?.data?.error?.message || error?.message || String(error);
  console.error(`Firestore rules deployment failed: ${message}`);
  process.exit(1);
});
