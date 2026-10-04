/**
 * The ratio registry (docs/m4-spec.md section 2.1): every ratio computed from
 * the household and the engine's results, each with its formula and inputs.
 * Nothing stored. Definitions from data/ratios.json.
 */

import ratiosFile from "../../data/ratios.json";
import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { runway } from "../levels/resilience";
import { estateView } from "../levels/legacy";
import { fiNumbers } from "../optimizer/fi-numbers";
import { optimize } from "../optimizer/search";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { goalsInPlan } from "../whatifs/goals";

export type RatioUnit = "percent" | "years" | "months" | "ratio" | "dollars" | "hours";

export interface RatioDefinition {
  id: string;
  name: string;
  formula: string;
  inputs: string[];
  unit: RatioUnit;
  unlockLevel: number;
  sentence: string;
  bands?: { below?: number; words: string }[];
  lenses: string[];
}

export interface RatioValue extends RatioDefinition {
  /** Null when the inputs are missing. */
  value: number | null;
  /** The sentence with the number in it, or why there is none. */
  text: string;
  /** The plain-word band the value falls in, when the ratio has bands. */
  band: string | null;
  /** True when the ratio's level is not yet passed (shown locked unless asked for). */
  locked: boolean;
}

export function loadRatios(): readonly RatioDefinition[] {
  return ratiosFile.ratios as RatioDefinition[];
}

export function formatRatio(value: number, unit: RatioUnit): string {
  switch (unit) {
    case "percent": return `${Math.round(value)}%`;
    case "years": return `${value.toFixed(1)} ${Math.abs(value - 1) < 0.05 ? "year" : "years"}`;
    case "months": return `${Math.round(value)} ${Math.round(value) === 1 ? "month" : "months"}`;
    case "dollars": return `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
    case "hours": return `${Math.round(value)} hours`;
    case "ratio": return value.toFixed(2);
  }
}

/** The inputs every ratio reads, computed once. Expensive pieces are lazy. */
export interface RatioInputs {
  year1: { takeHome: number; contributions: number; gap: number; taxes: number; gross: number } | null;
  netWorth: number;
  assets: number;
  spendingAnnual: number;
  grossIncome: number;
  hoursPerYear: number;
  debtPaymentsAnnual: number;
  housingAnnual: number;
  fiNumber: number | null;
  lifetimeTaxes: number;
  lifetimeIncome: number;
  runwayMonths: () => number;
  dreamLoadYears: () => number | null;
  trueFiGap: () => number | null;
  heirsShare: () => number | null;
}

export function ratioInputs(h: Household, deps: Deps = defaultDeps()): RatioInputs {
  const hh = requireComplete(h);
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const fi = findFiDate(hh, band, deps);
  const t = fi.timeline;
  const full = t.rows.find((r) => r.fraction === 1 && !r.retired) ?? t.rows[0] ?? null;
  const contributions = full ? Object.values(full.contributions).reduce((s, v) => s + v, 0) - full.employerMatch : 0;
  const accounts = h.accounts.kind === "rows" ? h.accounts.rows : [];
  const assets = accounts.filter((a) => a.side === "asset").reduce((s, a) => s + (a.balance.value ?? 0), 0);
  const debts = accounts.filter((a) => a.side === "debt").reduce((s, a) => s + (a.balance.value ?? 0), 0);
  const spending = h.spending.kind === "rows" ? h.spending.rows : [];
  const streams = h.self.income.kind === "rows" ? h.self.income.rows : [];
  const hours = streams.reduce((s, r) => s + (r.hoursPerWeek?.value ? r.hoursPerWeek.value * 52 : 0), 0) || 2000;
  const lifetimeIncome = t.rows.reduce((s, r) => s + r.income.gross + Object.values(r.withdrawals).reduce((a, b) => a + b, 0), 0);
  return {
    year1: full ? { takeHome: full.takeHome, contributions: Math.max(0, contributions), gap: full.gap, taxes: full.taxes.total, gross: full.income.gross } : null,
    netWorth: assets - debts,
    assets,
    spendingAnnual: spending.reduce((s, r) => s + r.annual.value, 0),
    grossIncome: streams.reduce((s, r) => s + r.grossAnnual.value, 0),
    hoursPerYear: hours,
    debtPaymentsAnnual: accounts.filter((a) => a.side === "debt").reduce((s, a) => s + (a.side === "debt" ? a.actualPaymentAnnual.value : 0), 0),
    housingAnnual: spending.filter((r) => r.category === "accommodation" || r.category === "utilities").reduce((s, r) => s + r.annual.value, 0),
    fiNumber: fi.timeline.assetsAtRetirement,
    lifetimeTaxes: t.lifetimeTaxes,
    lifetimeIncome,
    runwayMonths: () => runway(h).totalMonths,
    dreamLoadYears: () => {
      if (!h.goals.length) return 0;
      const g = goalsInPlan(h, deps);
      return g.baseline.retirementYear === null || g.withAll.retirementYear === null ? null : g.withAll.retirementYear - g.baseline.retirementYear;
    },
    trueFiGap: () => {
      const o = optimize(h, { objective: "earliestFi" }, deps);
      const n = fiNumbers(h, o, runFor(hh, band, deps, Infinity));
      return n.netFi === null ? null : n.grossFi - n.netFi;
    },
    heirsShare: () => {
      const e = estateView(h, deps).byBand.likely;
      return e.before > 0 ? (e.after / e.before) * 100 : null;
    },
  };
}

/** One ratio's value from the inputs. */
export function ratioValue(def: RatioDefinition, i: RatioInputs): number | null {
  switch (def.id) {
    case "savingsRate": return i.year1 && i.year1.takeHome > 0 ? (i.year1.contributions / i.year1.takeHome) * 100 : null;
    case "gap": return i.year1 ? i.year1.gap : null;
    case "yearsSaved": return i.spendingAnnual > 0 ? i.netWorth / i.spendingAnnual : null;
    case "fiProgress": return i.fiNumber && i.fiNumber > 0 ? (i.assets / i.fiNumber) * 100 : null;
    case "effectiveTaxRate": return i.year1 && i.year1.gross > 0 ? (i.year1.taxes / i.year1.gross) * 100 : null;
    case "realHourlyWage": return i.year1 && i.hoursPerYear > 0 ? i.year1.takeHome / i.hoursPerYear : null;
    case "runwayMonths": return i.runwayMonths();
    case "debtToIncome": return i.grossIncome > 0 ? (i.debtPaymentsAnnual / i.grossIncome) * 100 : null;
    case "housingShare": return i.year1 && i.year1.takeHome > 0 ? (i.housingAnnual / i.year1.takeHome) * 100 : null;
    case "dreamLoad": return i.dreamLoadYears();
    case "taxEfficiency": return i.lifetimeIncome > 0 ? (i.lifetimeTaxes / i.lifetimeIncome) * 100 : null;
    case "trueFiGap": return i.trueFiGap();
    case "heirsShare": return i.heirsShare();
    default: return null;
  }
}

/** Every ratio for this household. `levelsPassed` decides which are locked; `includeLocked` computes them anyway (the person asked). */
export function ratios(h: Household, levelsPassed: readonly number[], options: { includeLocked?: boolean; deps?: Deps } = {}): RatioValue[] {
  const i = ratioInputs(h, options.deps);
  return loadRatios().map((def) => {
    const locked = !levelsPassed.includes(def.unlockLevel) && def.unlockLevel !== 1;
    const value = locked && !options.includeLocked ? null : ratioValue(def, i);
    const band = value !== null && def.bands ? (def.bands.find((b) => b.below === undefined || value < b.below)?.words ?? null) : null;
    const text = value === null ? (locked ? `Unlocks with Level ${def.unlockLevel}.` : "Not enough information yet.") : def.sentence.replace("{value}", formatRatio(value, def.unit)) + (band ? ` That is ${band}.` : "");
    return { ...def, value, text, band, locked };
  });
}
