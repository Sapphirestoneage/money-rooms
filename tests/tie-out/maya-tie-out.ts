/**
 * The Maya tie-out: the engine against Eli's hand-calculated checkpoint rows.
 * Shared by the comparison printout (npm run tie-out:compare) and the tests.
 *
 * The settings here are test-only. The app never sets them.
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
  type BandResult,
  type Deps,
  type ExampleHouseholdFile,
  type SavingsStrategy,
  type TaxTables,
  type TieOutSettings,
  type TimelineResult,
  type YearRow,
} from "../../engine";

// ---- Tie-out conventions (tests/tie-out-conventions.md) ----------------------
/** The workpaper's first row is the full year 2026, so the plan date is January (no stub period). */
export const TIE_OUT_AS_OF = "2026-01-01";

export const TIE_OUT_SETTINGS: TieOutSettings = {
  /** Social Security: $20,000 a year from 67, untaxed, instead of the computed benefit. */
  socialSecurityOverride: { annual: 20000, fromAge: 67 },
  /** Healthcare in retirement: $7,200 a year before 65, $3,600 from 65. */
  retirementHealthcare: { before65: 7200, from65: 3600 },
};

/** New York as a flat 5% on wages minus pretax contributions, with no state standard deduction. */
export function tieOutTables(): TaxTables {
  const real = loadTaxTables(2026);
  const flat = [{ from: 0, rate: 5 }];
  return {
    ...real,
    states: { ...real.states, NY: { ...real.states.NY, structure: "flat", brackets: { single: flat, marriedJoint: flat }, standardDeduction: null } },
  };
}

export function tieOutDeps(): Deps {
  return { tables: tieOutTables(), ssParams: loadSocialSecurityParams(2026), testSettings: TIE_OUT_SETTINGS };
}

export function mayaFor(strategy: SavingsStrategy) {
  const household = householdFromExample(maya as ExampleHouseholdFile, TIE_OUT_AS_OF);
  household.savingsStrategy = userValue(strategy, TIE_OUT_AS_OF);
  const band = resolveBand(resolveAssumptions(household.assumptions), "likely");
  return { household, hh: requireComplete(household), band };
}

/** The FI search for a strategy under the tie-out settings, likely band. */
export function mayaFi(strategy: SavingsStrategy): BandResult {
  const { hh, band } = mayaFor(strategy);
  return findFiDate(hh, band, tieOutDeps());
}

/** The timeline with retirement fixed at 42 (2043), as the checkpoint files assume. */
export function mayaTimelineAt42(strategy: SavingsStrategy): TimelineResult {
  const { hh, band } = mayaFor(strategy);
  const deps = tieOutDeps();
  return runTimeline(hh, { band, retirementYear: 2043, tables: deps.tables, ssParams: deps.ssParams, testSettings: TIE_OUT_SETTINGS });
}

// ---- The engine's version of each checkpoint column ---------------------------
const CASH = ["chk", "hysa"];
const ROTH_IRA = "engine:rothIRA";
const ROTH_401K = "engine:roth401k";
const TAXABLE = "engine:brokerage";
const sum = (o: Record<string, number>, ids: string[]) => ids.reduce((s, id) => s + (o[id] ?? 0), 0);

export const COLUMNS: Record<string, (r: YearRow) => number> = {
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
  ToRothIRA: (r) => r.contributions[ROTH_IRA] ?? 0,
  ToRoth401k: (r) => r.contributions[ROTH_401K] ?? 0,
  ToTaxable: (r) => r.contributions[TAXABLE] ?? 0,
  FromCash: (r) => sum(r.withdrawals, CASH) - r.fromReserve,
  FromTaxable: (r) => r.withdrawals[TAXABLE] ?? 0,
  From401kGross: (r) => r.withdrawals["k401"] ?? 0,
  Tax401k: (r) => (r.retired ? r.taxes.total : 0),
  FromRothTotal: (r) => (r.withdrawals[ROTH_IRA] ?? 0) + (r.withdrawals[ROTH_401K] ?? 0),
  FromRoth401k: (r) => r.withdrawals[ROTH_401K] ?? 0,
  FromReserve: (r) => r.fromReserve,
  Shortfall: (r) => r.shortfall,
  CashEnd: (r) => sum(r.balances, CASH),
  TaxableEnd: (r) => r.balances[TAXABLE] ?? 0,
  "401kEnd": (r) => r.balances["k401"] ?? 0,
  RothIRAEnd: (r) => r.balances[ROTH_IRA] ?? 0,
  Roth401kEnd: (r) => r.balances[ROTH_401K] ?? 0,
  TotalEnd: (r) => r.assets,
};

const BALANCES = new Set(["LoanEnd", "CashEnd", "TaxableEnd", "401kEnd", "RothIRAEnd", "Roth401kEnd", "TotalEnd"]);

/** Flows must match within $10. Balances within 0.5% (or $10 when the expected balance is under $2,000). */
export function differs(column: string, expected: number, actual: number): boolean {
  const diff = Math.abs(actual - expected);
  if (BALANCES.has(column) && Math.abs(expected) >= 2000) return diff > Math.abs(expected) * 0.005;
  return diff > 10;
}

export interface Checkpoint {
  [column: string]: number;
}

export function readCheckpoints(fileName: string): { header: string[]; rows: Checkpoint[] } {
  const lines = readFileSync(join(import.meta.dirname, "..", "workpapers", fileName), "utf8").trim().split(/\r?\n/);
  const header = lines[0]!.split(",");
  const rows = lines.slice(1).map((line) => Object.fromEntries(line.split(",").map((v, i) => [header[i]!, Number(v)])));
  return { header, rows };
}

export interface Difference {
  year: number;
  age: number;
  column: string;
  expected: number;
  actual: number;
}

/** Every checkpoint cell where the engine and the workpaper differ beyond tolerance, in file order. */
export function compareToCheckpoints(fileName: string, timeline: TimelineResult): { checked: number; differences: Difference[] } {
  const { header, rows } = readCheckpoints(fileName);
  const differences: Difference[] = [];
  let checked = 0;
  for (const e of rows) {
    const row = timeline.rows.find((r) => r.year === e.Year);
    if (!row) throw new Error(`The engine has no row for ${e.Year}`);
    for (const column of header.slice(1)) {
      const fn = COLUMNS[column];
      if (!fn) throw new Error(`No engine mapping for checkpoint column "${column}"`);
      checked += 1;
      const actual = fn(row);
      if (differs(column, e[column]!, actual)) differences.push({ year: e.Year!, age: e.Age!, column, expected: e[column]!, actual });
    }
  }
  return { checked, differences };
}

export const CHECKPOINT_FILES: { file: string; strategy: SavingsStrategy }[] = [
  { file: "maya-checkpoints.csv", strategy: "enteredOnly" },
  { file: "maya-checkpoints-taxfree.csv", strategy: "maxTaxFreeGrowth" },
];
