import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const standaloneStaticDir = join(standaloneDir, ".next", "static");
const standalonePublicDir = join(standaloneDir, "public");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");

if (!existsSync(standaloneDir)) {
  console.warn("Standalone output not found. Skipping asset copy.");
  process.exit(0);
}

copyDir(staticDir, standaloneStaticDir);

if (existsSync(publicDir)) {
  copyDir(publicDir, standalonePublicDir);
}

console.log("Standalone static assets prepared.");

function copyDir(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, force: true });
}
