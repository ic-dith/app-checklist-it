import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "dist", "server.cjs");

function runServer() {
  console.log(`[Starter] Root server.cjs found, launching server...`);
  const child = spawn("node", [serverPath], { stdio: "inherit" });
  child.on("close", (code) => {
    process.exit(code || 0);
  });
}

if (fs.existsSync(serverPath)) {
  runServer();
} else {
  console.log(`[Starter] dist/server.cjs not found. Running compilation on-demand...`);
  const build = spawn("npm", ["run", "build"], { stdio: "inherit", shell: true });
  build.on("close", (code) => {
    if (code === 0 && fs.existsSync(serverPath)) {
      console.log(`[Starter] Build succeeded. Starting the server.`);
      runServer();
    } else {
      console.warn(`[Starter] Build step returned code ${code} or dist/server.cjs is still missing.`);
      console.log(`[Starter] Attempting backup execution using tsx to boot server.ts directly...`);
      const backup = spawn("npx", ["tsx", "server.ts"], { stdio: "inherit", shell: true });
      backup.on("close", (backupCode) => {
        process.exit(backupCode || 1);
      });
    }
  });
}
