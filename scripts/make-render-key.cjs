// Makes a one-line copy of the working Firebase private key (from backend/.env) for Render's
// FIREBASE_PRIVATE_KEY setting, checks it is valid, and opens it in Notepad. The key is never printed.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const raw = (process.env.FIREBASE_PRIVATE_KEY || "").trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
const outFile = path.join(rootDir, ".claude-sync", "render-firebase-key.txt");
const statusFile = path.join(rootDir, ".claude-sync", "render-key-status.txt");

try {
  crypto.createPrivateKey(raw);
  const oneLine = Buffer.from(raw, "utf8").toString("base64");
  // Check the one-line copy turns back into the same valid key.
  crypto.createPrivateKey(Buffer.from(oneLine, "base64").toString("utf8"));
  fs.writeFileSync(outFile, oneLine);
  fs.writeFileSync(statusFile, `OK one-line key written (${oneLine.length} characters)`);
  console.log("Key is valid. Notepad will open with the one-line key - copy ALL of it (Ctrl+A, Ctrl+C).");
  execSync(`start "" notepad "${outFile}"`, { shell: "cmd.exe" });
} catch (error) {
  fs.writeFileSync(statusFile, `FAILED ${error.message}`);
  console.error("The key in backend/.env is not valid:", error.message);
  process.exit(1);
}
