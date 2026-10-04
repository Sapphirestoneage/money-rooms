/**
 * The module checklist gate (docs/module-checklist.md). A module flagged "on" must carry every item;
 * CI fails otherwise. Beta and off modules are reported in the test names, never failed.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadModules, type ModuleManifest } from "../engine";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** Every missing checklist item, in plain words. */
export function checklistGaps(m: ModuleManifest): string[] {
  const gaps: string[] = [];
  if (!m.checklist.spec) gaps.push("no spec");
  else if (!existsSync(join(root, m.checklist.spec))) gaps.push(`spec ${m.checklist.spec} is missing`);
  if (m.tests.goldenHousehold === null) gaps.push("no golden household");
  else if (!existsSync(join(root, m.tests.goldenHousehold))) gaps.push(`golden household ${m.tests.goldenHousehold} is missing`);
  if (!m.tests.acceptance.length) gaps.push("no acceptance tests");
  for (const t of m.tests.acceptance) if (!existsSync(join(root, t))) gaps.push(`acceptance test ${t} is missing`);
  if (m.tests.goldenHousehold && m.tests.acceptance.length) {
    const file = m.tests.goldenHousehold.split("/").pop()!;
    if (!m.tests.acceptance.some((t) => existsSync(join(root, t)) && read(t).includes(file))) gaps.push(`no acceptance test reads ${file}`);
  }
  for (const c of m.copy) if (!existsSync(join(root, c))) gaps.push(`copy file ${c} is missing`);
  if (!m.checklist.axe) gaps.push("no axe record");
  else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.checklist.axe.date)) gaps.push("axe record has no date");
    for (const s of m.adds.screens) if (!m.checklist.axe.routes.includes(s)) gaps.push(`axe record does not cover ${s}`);
  }
  if (!m.checklist.decision) gaps.push("no decision-log entry");
  else if (!new RegExp(`^\\| ${m.checklist.decision} \\|`, "m").test(read("docs/decisions.md"))) gaps.push(`decision ${m.checklist.decision} is not in docs/decisions.md`);
  if (!m.checklist.docs.length) gaps.push("no docs listed");
  for (const d of m.checklist.docs) {
    if (!existsSync(join(root, d))) gaps.push(`doc ${d} is missing`);
    else if (!read(d).includes(m.id) && !read(d).includes(m.name)) gaps.push(`doc ${d} does not mention ${m.name}`);
  }
  return gaps;
}

describe("the module checklist", () => {
  for (const m of loadModules()) {
    const gaps = checklistGaps(m);
    if (m.flag === "on" || m.core) {
      it(`${m.id} (${m.core ? "core" : "on"}) carries every checklist item`, () => {
        expect(gaps, gaps.join("; ")).toEqual([]);
      });
    } else {
      it(`${m.id} (${m.flag}) is reported, not gated: ${gaps.length ? gaps.join("; ") : "complete"}`, () => {
        expect(Array.isArray(gaps)).toBe(true);
      });
    }
  }
});
