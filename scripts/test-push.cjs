// Sends one test notification to the owner's own phone(s) to check that phone notifications work end to end.
const path = require("path");
const fs = require("fs");
const rootDir = path.resolve(__dirname, "..");
require(path.join(rootDir, "node_modules", "dotenv")).config({ path: path.join(rootDir, "backend", ".env") });
let admin;
try { admin = require(path.join(rootDir, "backend", "node_modules", "firebase-admin")); } catch { admin = require(path.join(rootDir, "node_modules", "firebase-admin")); }
const ownerId = process.argv[2];
const out = [];
async function main() {
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
    }),
  });
  const db = admin.firestore(app);
  const snap = await db.collection("devicePushTokens").where("userId", "==", ownerId).get();
  out.push(`Phones registered for this account: ${snap.size}`);
  const fcm = [];
  snap.forEach((doc) => {
    const d = doc.data();
    out.push(`- provider=${d.provider || "expo"} platform=${d.platform || "?"} updated=${d.updatedAt || "?"}`);
    if ((d.provider || "") === "fcm" && d.token) fcm.push(d.token);
  });
  if (fcm.length) {
    const res = await admin.messaging(app).sendEachForMulticast({
      tokens: fcm,
      notification: { title: "Sohba test", body: "Phone notifications are working." },
      android: { priority: "high", notification: { channelId: "pulseora-social" } },
      data: { type: "system" },
    });
    out.push(`FCM sent: ${res.successCount} ok, ${res.failureCount} failed`);
    res.responses.forEach((r, i) => { if (!r.success) out.push(`  error ${i}: ${r.error && r.error.code}`); });
  }
  const notes = await db.collection("notifications").where("userId", "==", ownerId).orderBy("createdAt", "desc").limit(5).get().catch((e) => { out.push("notifications query: " + e.message); return null; });
  if (notes) { out.push(`Latest notifications for this account: ${notes.size}`); notes.forEach((d) => out.push(`- ${d.get("createdAt")} ${d.get("type")}`)); }
}
main().catch((e) => out.push("FAILED: " + (e && e.message))).finally(() => {
  fs.writeFileSync(path.join(rootDir, ".claude-sync", "push-test-output.txt"), out.join("\n"));
  console.log(out.join("\n"));
});
