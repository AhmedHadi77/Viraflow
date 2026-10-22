// Pre-build check of the live Sohba services. Prints status only (no user data, no secrets).
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const out = path.join(rootDir, ".claude-sync", "checkall-output.txt");
const lines = [];
const log = (line) => {
  lines.push(line);
  console.log(line);
};

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
const API = "https://viraflow-srrs.onrender.com/api";

async function getJson(url) {
  const started = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text, ms: Date.now() - started };
}

async function checkServer() {
  log("== Server (Render)");
  try {
    const health = await getJson(`${API}/meta/health`);
    log(`health HTTP ${health.status} in ${health.ms} ms: ${health.text.slice(0, 600)}`);
  } catch (error) {
    log(`health FAILED: ${error.message}`);
  }
  try {
    const ice = await getJson(`${API}/meta/ice-servers`);
    const servers = ice.json?.iceServers ?? ice.json?.data?.iceServers ?? ice.json?.servers ?? [];
    const urls = servers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls])).filter(Boolean);
    log(
      `ice-servers HTTP ${ice.status}: ${servers.length} entries, ${urls.filter((u) => /^turns?:/.test(u)).length} relay (TURN) urls, ${urls.filter((u) => /^stun:/.test(u)).length} STUN urls, source=${ice.json?.source ?? ice.json?.data?.source ?? "?"}`
    );
  } catch (error) {
    log(`ice-servers FAILED: ${error.message}`);
  }
}

async function checkFirebase() {
  log("== Database (Firebase " + projectId + ")");
  if (!projectId || !clientEmail || !privateKey) {
    log("Missing Firebase credentials in backend/.env");
    return;
  }
  const client = new JWT({ email: clientEmail, key: privateKey, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const localRules = fs.readFileSync(path.join(rootDir, "firestore.rules"), "utf8");

  try {
    const test = await client.request({
      url: `https://firebaserules.googleapis.com/v1/projects/${projectId}:test`,
      method: "POST",
      data: { source: { files: [{ name: "firestore.rules", content: localRules }] } },
    });
    const issues = test.data?.issues ?? [];
    const errors = issues.filter((i) => i.severity === "ERROR");
    log(`rules compile: ${errors.length} errors, ${issues.length - errors.length} warnings`);
    issues.slice(0, 10).forEach((i) => log(`  ${i.severity} line ${i.sourcePosition?.line}: ${i.description}`));
  } catch (error) {
    log(`rules compile FAILED: ${error?.response?.data?.error?.message || error.message}`);
  }

  try {
    const release = await client.request({ url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore` });
    const ruleset = await client.request({ url: `https://firebaserules.googleapis.com/v1/${release.data.rulesetName}` });
    const live = ruleset.data?.source?.files?.[0]?.content ?? "";
    log(`live rules ${live.trim() === localRules.trim() ? "MATCH" : "DIFFER FROM"} the local firestore.rules (released ${release.data.updateTime})`);
  } catch (error) {
    log(`live rules read FAILED: ${error?.response?.data?.error?.message || error.message}`);
  }

  try {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const ids = await client.request({ url: `${base}:listCollectionIds`, method: "POST", data: { pageSize: 100 } });
    const collections = ids.data?.collectionIds ?? [];
    log(`collections (${collections.length}): ${collections.join(", ")}`);
    for (const name of collections) {
      try {
        const agg = await client.request({
          url: `${base}:runAggregationQuery`,
          method: "POST",
          data: { structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: name }] }, aggregations: [{ alias: "n", count: {} }] } },
        });
        const n = agg.data?.[0]?.result?.aggregateFields?.n?.integerValue ?? "?";
        log(`  ${name}: ${n} documents`);
      } catch (error) {
        log(`  ${name}: count FAILED ${error?.response?.data?.error?.message || error.message}`);
      }
    }
  } catch (error) {
    log(`database read FAILED: ${error?.response?.data?.error?.message || error.message}`);
  }
}

(async () => {
  log("Sohba check " + new Date().toISOString());
  await checkServer();
  await checkFirebase();
  fs.writeFileSync(out, lines.join("\n"));
})().catch((error) => {
  lines.push("FATAL " + error.message);
  fs.writeFileSync(out, lines.join("\n"));
});
