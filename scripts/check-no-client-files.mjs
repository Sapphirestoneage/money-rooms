#!/usr/bin/env node
/**
 * Refuses a commit that stages a client file (DATA_MODEL.md section 6): anything under /clients or
 * matching *.client.json. Runs from the pre-commit hook (.githooks/pre-commit) and as a test.
 * Usage: node scripts/check-no-client-files.mjs            (checks the staged files)
 *        node scripts/check-no-client-files.mjs a b c      (checks the given paths)
 */
import { execSync } from "node:child_process";

export function offendingPaths(paths) {
  return paths.filter((p) => /^clients\//.test(p) || /(^|\/)clients\//.test(p) || /\.client\.json$/i.test(p));
}

function stagedPaths() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const paths = process.argv.length > 2 ? process.argv.slice(2) : stagedPaths();
  const bad = offendingPaths(paths);
  if (bad.length) {
    console.error("Refused: these look like client files and must never be committed:");
    for (const p of bad) console.error(`  ${p}`);
    console.error("Keep client files in a folder outside the repo (app/docs/DATA_MODEL.md section 6).");
    process.exit(1);
  }
  process.exit(0);
}
