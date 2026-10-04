// Prints the gzipped size of the built JavaScript and warns past the performance budget. Never fails the build (decision F1, amended at Eli's review).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const TARGET_KB = 150;
const LIMIT_KB = 200;
const dir = "dist/assets";
let total = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  const gz = gzipSync(readFileSync(join(dir, name))).length;
  total += gz;
  console.log(`${name}: ${(gz / 1024).toFixed(1)} KB gzipped`);
}
const kb = total / 1024;
console.log(`JavaScript total: ${kb.toFixed(1)} KB gzipped (target ${TARGET_KB} KB, hard limit ${LIMIT_KB} KB; docs/performance-budget.md)`);
if (kb > LIMIT_KB) console.log(`::warning::The JavaScript bundle is ${kb.toFixed(1)} KB gzipped, over the ${LIMIT_KB} KB hard limit in docs/performance-budget.md.`);
else if (kb > TARGET_KB) console.log(`::notice::The JavaScript bundle is ${kb.toFixed(1)} KB gzipped, over the ${TARGET_KB} KB target in docs/performance-budget.md.`);
