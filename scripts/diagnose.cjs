// Read-only health check of the Sohba Firebase project: profile photos, push tokens and recent notifications.
const path = require("path");
const fs = require("fs");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

function value(field) {
  if (!field) return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map(value);
  if ("timestampValue" in field) return field.timestampValue;
  return JSON.stringify(field).slice(0, 60);
}

async function list(client, collection, pageSize = 30) {
  const res = await client.request({
    url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=${pageSize}`,
  });
  return (res.data.documents || []).map((doc) => {
    const out = { id: doc.name.split("/").pop() };
    for (const [key, field] of Object.entries(doc.fields || {})) out[key] = value(field);
    return out;
  });
}

async function main() {
  const client = new JWT({ email: clientEmail, key: privateKey, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const lines = [];
  const users = await list(client, "users", 50);
  lines.push(`USERS ${users.length}`);
  for (const u of users) {
    lines.push(
      `  ${u.id.slice(0, 8)} @${u.username} name=${u.name} img=${String(u.profileImage || "").slice(0, 140)} followers=${(u.followers || []).length} following=${(u.following || []).length} lang=${u.language}`
    );
  }
  const tokens = await list(client, "devicePushTokens", 50);
  lines.push(`PUSH TOKENS ${tokens.length}`);
  for (const t of tokens) {
    lines.push(`  user=${String(t.userId).slice(0, 8)} token=${String(t.token).slice(0, 28)}... platform=${t.platform} env=${t.executionEnvironment} updated=${t.updatedAt}`);
  }
  const notes = await list(client, "notifications", 40);
  lines.push(`NOTIFICATIONS (first ${notes.length})`);
  for (const n of notes.slice(0, 25)) {
    lines.push(`  ${n.type} to=${String(n.userId).slice(0, 8)} at=${n.createdAt} title=${n.title}`);
  }
  const threads = await list(client, "directThreads", 20);
  lines.push(`DIRECT THREADS ${threads.length}`);
  for (const t of threads.slice(0, 10)) lines.push(`  ${t.id.slice(0, 20)} participants=${(t.participantIds || []).map((p) => String(p).slice(0, 8)).join(",")}`);
  // Can phones load the profile photos?
  for (const u of users) {
    const url = String(u.profileImage || "");
    if (!url.startsWith("http")) continue;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "okhttp/4.12.0", Accept: "image/webp,image/*,*/*" } });
      lines.push(`  IMG @${u.username} -> ${res.status} ${res.headers.get("content-type")} ${res.headers.get("content-length")} cld-error=${res.headers.get("x-cld-error")}`);
      if (res.status !== 200) {
        lines.push(`    full=${url}`);
        const variants = [url.split("?")[0], url.split("?")[0].replace(/\/upload\/q_auto:auto,f_auto\//, "/upload/")];
        for (const variant of variants) {
          const r2 = await fetch(variant, { headers: { "User-Agent": "okhttp/4.12.0" } });
          lines.push(`    variant ${variant.slice(-60)} -> ${r2.status} ${r2.headers.get("content-type")} cld-error=${r2.headers.get("x-cld-error")}`);
        }
      }
    } catch (error) {
      lines.push(`  IMG @${u.username} -> FAILED ${error.message}`);
    }
  }
  // Is the backend awake and answering?
  try {
    const started = Date.now();
    const res = await fetch("https://viraflow-srrs.onrender.com/api/meta/health");
    lines.push(`API health -> ${res.status} in ${Date.now() - started}ms: ${(await res.text()).slice(0, 300)}`);
  } catch (error) {
    lines.push(`API health -> FAILED ${error.message}`);
  }
  try {
    const res = await fetch("https://viraflow-srrs.onrender.com/api/notifications/deliver", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    lines.push(`API deliver (no auth) -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  } catch (error) {
    lines.push(`API deliver -> FAILED ${error.message}`);
  }
  const out = lines.join("\n");
  console.log(out);
  fs.writeFileSync(path.join(rootDir, ".claude-sync", "diagnose-output.txt"), out);
}

main().catch((error) => {
  console.error("DIAGNOSE FAILED:", error?.response?.data?.error?.message || error?.message || error);
  process.exit(1);
});
