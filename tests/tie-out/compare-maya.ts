/**
 * Compares the engine to Eli's hand-calculated checkpoint rows
 * (tests/workpapers/maya-checkpoints.csv): strategy "Entered only",
 * retirement at 42, likely band, today's dollars.
 *
 * Run: npm run tie-out:compare
 *
 * The tie-out settings below are test-only. The app never sets them.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import maya from "../households/maya.json";
import {
  findFiDate,
  householdFromExample,
  loadSocialSecurityParams,
  loadTaxTables,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  runTimeline,
  userValue,
  type ExampleHouseholdFile,
  type TaxTables,
  type TieOutSettings,
  type YearRow,
} from "../../engine";

// ---- Tie-out conventions (test-only) ---------------------------------------
// 1. The workpaper's first row is the full year 2026, so the plan date is January (no stub period).
const AS_OF = "2026-01-01";
// 2. Social Security: $20,000 a year from 67, untaxed, instead of the computed benefit.
// 3. Healthcare in retirement: $7,200 a year before 65, $3,600 from 65.
const TEST_SETTINGS: TieOutSettings = {
  socialSecurityOverride: { annual: 20000, fromAge: 67 },
  retirementHealthcare: { before65: 7200, from65: 3600 },
};
// 4. New York: flat 5% on wages minus pretax contributions (no state standard deduction).
function tieOutTables(): TaxTables {
  const real = loadTaxTables(2026);
  const flat = [{ from: 0, rate: 5 }];
  return {
    ...real,
    states: { ...real.states, NY: { ...real.states.NY, structure: "flat", brackets: { single: flat, marriedJoint: flat }, standardDeduction: null } },
  };
}

const household = householdFromExample(maya as ExampleHouseholdFile, AS_OF);
household.savingsStrategy = userValue("enteredOnly", AS_OF);
const hh = requireComplete(household);
const band = resolveBand(resolveAssumptions(household.assumptions), "likely");
const deps = { tables: tieOutTables(), ssParams: loadSocialSecurityParams(2026), testSettings: TEST_SETTINGS };

// ---- The engine's version of each CSV column --------------------------------
const cashIds = ["chk", "hysa"];
const sum = (o: Record<string, number>, ids: string[]) => ids.reduce((s, id) => s + (o[id] ?? 0), 0);

const columns: Record<string, (r: YearRow) => number> = {
  Age: (r) => r.age,
  Salary: (r) => r.income.wages,
  FedTax: (r) => (r.retired ? 0 : r.taxes.federalIncome),
  StateTax: (r) => (r.retired ? 0 : r.taxes.state),
  FICA: (r) => r.taxes.fica,
  TakeHome: (r) => (r.retired ? 0 : r.takeHome),
  SpendWork: (r) => (r.retired ? 0 : r.spending),
  SpendRetired: (r) => (r.retired ? r.spending : 0),
  LoanPay: (r) => r.debt.scheduled,
  LoanEnd: (r) => r.balances["loan"] ?? 0,
  SS: (r) => r.socialSecurity,
  Gap: (r) => (r.retired ? r.socialSecurity - r.spending : r.gap),
  ToRoth: (r) => r.contributions["engine:rothIRA"] ?? 0,
  ToTaxable: (r) => r.contributions["engine:brokerage"] ?? 0,
  FromCash: (r) => sum(r.withdrawals, cashIds),
  FromTaxable: (r) => r.withdrawals["engine:brokerage"] ?? 0,
  From401kGross: (r) => r.withdrawals["k401"] ?? 0,
  Tax401k: (r) => (r.retired ? r.taxes.total : 0),
  FromRoth: (r) => r.withdrawals["engine:rothIRA"] ?? 0,
  Shortfall: (r) => r.shortfall,
  CashEnd: (r) => sum(r.balances, cashIds),
  TaxableEnd: (r) => r.balances["engine:brokerage"] ?? 0,
  "401kEnd": (r) => r.balances["k401"] ?? 0,
  RothEnd: (r) => r.balances["engine:rothIRA"] ?? 0,
  TotalEnd: (r) => r.assets,
};
const BALANCES = new Set(["LoanEnd", "CashEnd", "TaxableEnd", "401kEnd", "RothEnd", "TotalEnd"]);

/** Flows must match within $10. Balances within 0.5% (or $10 when the expected balance is under $2,000). */
function differs(column: string, expected: number, actual: number): boolean {
  const diff = Math.abs(actual - expected);
  if (BALANCES.has(column) && Math.abs(expected) >= 2000) return diff > Math.abs(expected) * 0.005;
  return diff > 10;
}

// ---- Run ----------------------------------------------------------------------
const csv = readFileSync(join(import.meta.dirname, "..", "workpapers", "maya-checkpoints.csv"), "utf8").trim().split(/\r?\n/);
const header = csv[0]!.split(",");
const expectedRows = csv.slice(1).map((line) => Object.fromEntries(line.split(",").map((v, i) => [header[i]!, Number(v)])));

const fi = findFiDate(hh, band, deps);
console.log(`FI age under the tie-out settings: ${fi.fiAge} (retire in ${fi.retirementYear}). Workpaper: 42 (2043).`);
if (fi.oneYearEarlier) console.log(`Retiring one year earlier first falls short at age ${fi.oneYearEarlier.age}. Workpaper (entered only): 85.`);

console.log("");
console.log("By strategy (workpaper values from tests/households/maya.json):");
const expectedByStrategy = (maya as unknown as { expected: { byStrategy: Record<string, { fiAgeLikely: number; assetsAtRetirement: number; lifetimeTaxes: number; oneYearEarlierFailsAt: number }> } }).expected.byStrategy;
for (const strategy of ["maxTaxSavingsNow", "maxTaxFreeGrowth", "enteredOnly"] as const) {
  const h2 = householdFromExample(maya as ExampleHouseholdFile, AS_OF);
  h2.savingsStrategy = userValue(strategy, AS_OF);
  const r = findFiDate(requireComplete(h2), band, deps);
  const e = expectedByStrategy[strategy]!;
  console.log(
    `  ${strategy}: FI age ${r.fiAge} (workpaper ${e.fiAgeLikely}); assets at retirement ${Math.round(r.timeline.assetsAtRetirement ?? 0)} (${e.assetsAtRetirement}); lifetime taxes ${Math.round(r.timeline.lifetimeTaxes)} (${e.lifetimeTaxes}); one year earlier fails at ${r.oneYearEarlier?.age ?? "never"} (${e.oneYearEarlierFailsAt})`,
  );
}

const timeline = runTimeline(hh, { band, retirementYear: 2043, tables: deps.tables, ssParams: deps.ssParams, testSettings: TEST_SETTINGS });
console.log(`With retirement fixed at 42 (2043): first shortfall ${timeline.firstShortfall ? `age ${timeline.firstShortfall.age}` : "none"}; lifetime taxes ${Math.round(timeline.lifetimeTaxes)} (workpaper 416,466).`);

const money = (n: number) => Math.round(n).toLocaleString("en-US");
let first: string | null = null;
const perYear: string[] = [];
for (const e of expectedRows) {
  const row = timeline.rows.find((r) => r.year === e.Year);
  if (!row) { perYear.push(`${e.Year}: engine has no row`); continue; }
  const diffs: string[] = [];
  for (const col of header.slice(1)) {
    const fn = columns[col];
    if (!fn) continue;
    const actual = fn(row);
    const expected = e[col]!;
    if (differs(col, expected, actual)) {
      const text = `${col}: workpaper ${money(expected)}, engine ${money(actual)} (${actual - expected >= 0 ? "+" : ""}${money(actual - expected)})`;
      diffs.push(text);
      if (!first) first = `${e.Year} (age ${e.Age}), ${text}`;
    }
  }
  perYear.push(`${e.Year} age ${e.Age}: ${diffs.length === 0 ? "all 25 columns match" : `${diffs.length} differ -> ${diffs.join("; ")}`}`);
}

console.log(`\nFIRST DIFFERENCE: ${first ?? "none, every checkpoint matches"}`);
console.log("\nBy checkpoint year:");
for (const line of perYear) console.log("  " + line);

// Precise values for the first checkpoint row, for the explanation.
const y0 = timeline.rows[0]!;
console.log("\n2026 detail (engine, unrounded):");
for (const col of ["TakeHome", "Gap", "ToRoth", "ToTaxable", "LoanPay", "LoanEnd", "CashEnd", "TaxableEnd", "401kEnd", "RothEnd", "TotalEnd"]) {
  console.log(`  ${col}: ${columns[col]!(y0).toFixed(2)} (workpaper ${expectedRows[0]![col]})`);
}
