// Lets Google sign-in work on the Sohba web app by adding its address to Firebase Auth's allowed domains.
const path = require("path");
const fs = require("fs");
const { JWT } = require("google-auth-library");
const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, "backend", ".env") });
const domain = process.argv[2];
const projectId = process.env.FIREBASE_PROJECT_ID;
const out = [];
async function main() {
  const client = new JWT({
    email: process.env.FIREBASE_CLIENT_EMAIL,
    key: process.env.FIREBASE_PRIVATE_KEY.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
  });
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const current = await client.request({ url });
  const domains = current.data.authorizedDomains || [];
  out.push(`Allowed domains before: ${domains.join(", ")}`);
  if (!domains.includes(domain)) {
    const next = [...domains, domain];
    await client.request({ url: `${url}?updateMask=authorizedDomains`, method: "PATCH", data: { authorizedDomains: next } });
    out.push(`Added ${domain}`);
  } else {
    out.push(`${domain} was already allowed`);
  }
}
main()
  .catch((e) => out.push("FAILED: " + (e?.response?.data?.error?.message || e.message)))
  .finally(() => { fs.writeFileSync(path.join(rootDir, ".claude-sync", "auth-domain-output.txt"), out.join("\n")); console.log(out.join("\n")); });
