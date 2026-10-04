/**
 * The M2 tie-out: the engine under M2 conventions mode against Eli's hand-calculated
 * Plan A and Plan B workpapers (tests/m2-tie-out-conventions.md). Test-only settings;
 * the app never sets them.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultPolicy, findFiDate, loadSocialSecurityParams, runTimeline, type BandResult, type Deps, type DrawdownPolicy, type TieOutSettings, type TimelineResult, type YearRow } from "../../engine";
import { mayaFor, tieOutTables } from "./maya-tie-out";

/** The workpapers retire Maya at 41: 2042 is the first year with no work income. */
export const M2_RETIREMENT_YEAR = 2042;

export const M2_TIE_OUT_SETTINGS: TieOutSettings = {
  socialSecurityOverride: { annual: 20000, fromAge: 67 },
  m2TieOut: { acaBenchmarkBefore65: 7200, from65: 3600, reserveHealthcarePlaceholder: { before65: 7200, from65: 3600 } },
};

/** Plan A: the engine's default policy (conventional order, no conversions). */
export function planAPolicy(): DrawdownPolicy {
  return defaultPolicy();
}

/** Plan B: convert to the 200% ACA target, draw Roth contributions and conversions before the 401(k), Roth earnings after. */
export function planBPolicy(): DrawdownPolicy {
  return { ...defaultPolicy(), conversionTarget: "fillToAcaTarget", acaTarget: 200, withdrawalOrder: "rothLayersFirst" };
}

export function m2TieOutDeps(policy: DrawdownPolicy): Deps {
  return { tables: tieOutTables(), ssParams: loadSocialSecurityParams(2026), testSettings: M2_TIE_OUT_SETTINGS, conventions: "m2", policy };
}

export function m2Timeline(policy: DrawdownPolicy, retirementYear = M2_RETIREMENT_YEAR): TimelineResult {
  const { hh, band } = mayaFor("maxTaxSavingsNow");
  const d = m2TieOutDeps(policy);
  return runTimeline(hh, { band, retirementYear, tables: d.tables, ssParams: d.ssParams, testSettings: M2_TIE_OUT_SETTINGS, conventions: "m2", policy });
}

export function m2Fi(policy: DrawdownPolicy): BandResult {
  const { hh, band } = mayaFor("maxTaxSavingsNow");
  return findFiDate(hh, band, m2TieOutDeps(policy));
}

const CASH = ["chk", "hysa"];
const TAXABLE = "engine:brokerage";
const sum = (o: Record<string, number>, ids: string[]) => ids.reduce((s, id) => s + (o[id] ?? 0), 0);
const rothIds = (r: YearRow) => Object.keys(r.balances).filter((id) => id === "engine:rothIRA" || id === "engine:roth401k" || id.startsWith("roth"));
const ret = (r: YearRow, v: number) => (r.retired ? v : 0);

export const M2_COLUMNS: Record<string, (r: YearRow) => number> = {
  age: (r) => r.age,
  conversion: (r) => r.m2?.conversion ?? 0,
  from_cash: (r) => sum(r.withdrawals, CASH),
  from_taxable: (r) => r.withdrawals[TAXABLE] ?? 0,
  gains: (r) => r.m2?.gainsRealized ?? 0,
  from_401k: (r) => r.withdrawals["k401"] ?? 0,
  from_roth_contrib: (r) => r.m2?.rothDraw.basis ?? 0,
  from_roth_conv: (r) => r.m2?.rothDraw.seasonedConversions ?? 0,
  from_roth_conv_unseasoned: (r) => r.m2?.rothDraw.unseasonedConversions ?? 0,
  from_roth_earnings: (r) => r.m2?.rothDraw.earnings ?? 0,
  healthcare: (r) => r.m2?.healthcare.total ?? 0,
  magi: (r) => ret(r, r.m2?.magiAca ?? 0),
  taxes_retired: (r) => ret(r, r.taxes.total),
  penalty: (r) => ret(r, r.taxes.penalty),
  cash_end: (r) => sum(r.balances, CASH),
  taxable_end: (r) => r.balances[TAXABLE] ?? 0,
  basis_end: (r) => r.m2?.taxableBasisEnd ?? 0,
  k401_end: (r) => r.balances["k401"] ?? 0,
  roth_end: (r) => rothIds(r).reduce((s, id) => s + (r.balances[id] ?? 0), 0),
  total_end: (r) => r.assets,
};

const BALANCES = new Set(["cash_end", "taxable_end", "basis_end", "k401_end", "roth_end", "total_end"]);

/** Flows within $10; balances within 0.5% (or $10 when the expected balance is under $2,000). */
export function m2Differs(column: string, expected: number, actual: number): boolean {
  const diff = Math.abs(actual - expected);
  if (BALANCES.has(column) && Math.abs(expected) >= 2000) return diff > Math.abs(expected) * 0.005;
  return diff > 10;
}

export interface M2Difference { year: number; age: number; column: string; expected: number; actual: number }

export function readM2Workpaper(fileName: string): Record<string, number>[] {
  const lines = readFileSync(join(import.meta.dirname, "..", "workpapers", fileName), "utf8").trim().split(/\r?\n/);
  const header = lines[0]!.split(",");
  return lines.slice(1).map((line) => Object.fromEntries(line.split(",").map((v, i) => [header[i]!, Number(v)])));
}

export function compareM2(fileName: string, timeline: TimelineResult): { checked: number; differences: M2Difference[] } {
  const rows = readM2Workpaper(fileName);
  const differences: M2Difference[] = [];
  let checked = 0;
  for (const e of rows) {
    const row = timeline.rows.find((r) => r.year === e.year);
    if (!row) throw new Error(`The engine has no row for ${e.year}`);
    for (const [column, read] of Object.entries(M2_COLUMNS)) {
      if (!(column in e)) continue;
      checked += 1;
      const actual = read(row);
      if (m2Differs(column, e[column]!, actual)) differences.push({ year: e.year!, age: e.age ?? 0, column, expected: e[column]!, actual });
    }
  }
  return { checked, differences };
}

export const M2_FILES: { file: string; plan: "A" | "B"; policy: () => DrawdownPolicy }[] = [
  { file: "maya-m2-planA.csv", plan: "A", policy: planAPolicy },
  { file: "maya-m2-planB.csv", plan: "B", policy: planBPolicy },
];
