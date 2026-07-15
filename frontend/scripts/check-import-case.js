// Windows and macOS filesystems are case-insensitive by default, so an import like
// `from "./pages/ordersPage"` resolves fine locally even if the real file is
// `OrdersPage.jsx`. Linux (what Docker/Render builds run on) is case-sensitive, so the
// same import fails there with a confusing "Module not found" error deep in Rolldown's
// stack trace. This script catches the mismatch immediately, with a clear message,
// before any build (local or Docker) gets that far. Wired as "prebuild" in package.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const importRe = /from\s+["'](\.[^"']+)["']/g;
const allFiles = walk(srcRoot);
const mismatches = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRe.exec(content))) {
    const importPath = match[1];
    const baseDir = path.dirname(file);
    const resolved = path.resolve(baseDir, importPath);

    const candidates = /\.(jsx?|tsx?|css|json)$/.test(resolved)
      ? [resolved]
      : [
          resolved + ".jsx",
          resolved + ".js",
          resolved + ".tsx",
          resolved + ".ts",
          path.join(resolved, "index.js"),
          path.join(resolved, "index.jsx"),
        ];

    for (const candidate of candidates) {
      const dir = path.dirname(candidate);
      const base = path.basename(candidate);
      if (!fs.existsSync(dir)) continue;

      const actualNames = fs.readdirSync(dir);
      if (actualNames.includes(base)) break;

      const caseInsensitiveMatch = actualNames.find((n) => n.toLowerCase() === base.toLowerCase());
      if (caseInsensitiveMatch) {
        mismatches.push({
          file: path.relative(srcRoot, file),
          importPath,
          actual: caseInsensitiveMatch,
        });
        break;
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error("\n✗ Case-sensitivity import mismatch(es) found.");
  console.error("  These work on Windows/macOS but WILL FAIL on Linux (Docker/Render):\n");
  for (const { file, importPath, actual } of mismatches) {
    console.error(`  src/${file}`);
    console.error(`    imports "${importPath}"`);
    console.error(`    actual file is "${actual}"\n`);
  }
  process.exit(1);
}

console.log("✓ No case-sensitivity import mismatches found.");
