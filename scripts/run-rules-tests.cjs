// Runs the database rules tests (.claude-sync/rulestest) in the local Firestore emulator.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, ".claude-sync", "rulestest");
const log = path.join(root, ".claude-sync", "rulestest-run.txt");
const write = (text) => fs.appendFileSync(log, text + "\n");
fs.writeFileSync(log, "Rules test run " + new Date().toISOString() + "\n");

function findJava() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  for (const base of ["C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Java", "C:\\Program Files\\Microsoft", "C:\\Program Files\\Zulu"]) {
    try {
      fs.readdirSync(base).forEach((name) => candidates.push(path.join(base, name)));
    } catch {}
  }
  candidates.push("C:\\Program Files\\Android\\Android Studio\\jbr");
  return candidates.find((dirPath) => fs.existsSync(path.join(dirPath, "bin", "java.exe")));
}

function run(command, cwd, env) {
  write("> " + command);
  try {
    const output = execSync(command, { cwd, env, stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: true });
    write(output.slice(-6000));
    return true;
  } catch (error) {
    write(String(error.stdout || "").slice(-6000));
    write(String(error.stderr || "").slice(-6000));
    write("EXIT " + error.status);
    return false;
  }
}

fs.copyFileSync(path.join(root, "firestore.rules"), path.join(dir, "firestore.rules"));
const java = findJava();
write("Java: " + (java || "NOT FOUND"));
const env = { ...process.env };
if (java) {
  env.JAVA_HOME = java;
  env.Path = path.join(java, "bin") + ";" + (env.Path || env.PATH || "");
  env.PATH = env.Path;
}
console.log("Installing test tools (first time takes a few minutes)...");
if (run("npm install --no-audit --no-fund", dir, env)) {
  console.log("Running database rules tests...");
  run('npx firebase emulators:exec --only firestore --project demo-sohba "node test.cjs"', dir, env);
}
write("DONE");
console.log("Done. Results saved.");
