// Makes sure the owner's own Sohba account (the email given on the command line, default from OWNER_EMAILS)
// has the admin role in Firestore, and prints what it found and changed.
const path = require("path");
const fs = require("fs");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const projectId = process.env.FIREBASE_PROJECT_ID;
const ownerEmail = (process.argv[2] || (process.env.OWNER_EMAILS || "").split(",")[0] || "").trim().toLowerCase();
const client = new JWT({
  email: process.env.FIREBASE_CLIENT_EMAIL,
  key: process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function main() {
  const lines = [];
  if (!ownerEmail) throw new Error("No owner email given.");
  const res = await client.request({
    url: `${base}:runQuery`,
    method: "POST",
    data: {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: ownerEmail } } },
        limit: 5,
      },
    },
  });
  const docs = (res.data || []).filter((row) => row.document).map((row) => row.document);
  lines.push(`Accounts found for the owner email: ${docs.length}`);
  for (const doc of docs) {
    const id = doc.name.split("/").pop();
    const role = doc.fields?.role?.stringValue || "user";
    const username = doc.fields?.username?.stringValue || "";
    lines.push(`- @${username} (${id}) role before: ${role}`);
    if (role !== "admin") {
      await client.request({
        url: `${base}/users/${id}?updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt`,
        method: "PATCH",
        data: { fields: { role: { stringValue: "admin" }, updatedAt: { stringValue: new Date().toISOString() } } },
      });
      lines.push(`  role is now: admin`);
    }
  }
  const out = lines.join("\n");
  console.log(out);
  fs.writeFileSync(path.join(rootDir, ".claude-sync", "owner-output.txt"), out);
}

main().catch((error) => {
  const msg = "CHECK FAILED: " + (error?.response?.data?.error?.message || error?.message || error);
  console.error(msg);
  fs.writeFileSync(path.join(rootDir, ".claude-sync", "owner-output.txt"), msg);
  process.exit(1);
});
