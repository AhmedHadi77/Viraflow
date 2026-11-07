// Checks that the Sohba server is running the latest update (public status pages only, no sign-in).
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", ".claude-sync", "server-update-output.txt");
const base = "https://viraflow-srrs.onrender.com";
async function checkOnce() {
  const lines = [new Date().toISOString()];
  for (const route of ["/api/meta/health", "/api/media/status"]) {
    try {
      const response = await fetch(base + route, { signal: AbortSignal.timeout(90000) });
      lines.push(`${route} ${response.status} ${(await response.text()).slice(0, 1500)}`);
    } catch (error) {
      lines.push(`${route} FAILED ${error.message}`);
    }
  }
  // The captions route must exist now (it answers 401 without sign-in instead of 404).
  try {
    const response = await fetch(base + "/api/media/captions", { method: "POST", signal: AbortSignal.timeout(60000) });
    lines.push(`/api/media/captions (no sign-in) ${response.status}`);
  } catch (error) {
    lines.push(`/api/media/captions FAILED ${error.message}`);
  }
  fs.writeFileSync(out, lines.join("\n"));
  console.log(lines.join("\n"));
  return lines.join("\n");
}

// Keeps checking for up to 25 minutes while the server finishes updating.
(async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const result = await checkOnce();
    if (!result.includes("captions (no sign-in) 404") && !result.includes("FAILED")) {
      fs.appendFileSync(out, "\nUPDATED");
      console.log("UPDATED");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
  fs.appendFileSync(out, "\nSTILL OLD AFTER 25 MINUTES");
})();
