// Reads the Sohba server's health status (public, no sign-in) and saves it for checking.
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", ".claude-sync", "health-output.txt");
fetch("https://viraflow-srrs.onrender.com/api/meta/health")
  .then((r) => r.text())
  .then((t) => fs.writeFileSync(out, t))
  .catch((e) => fs.writeFileSync(out, "FAILED " + e.message));
