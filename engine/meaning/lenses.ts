/**
 * Lenses (docs/m4-spec.md section 2.3): the same plan from one angle. The 4%
 * rule, Shockingly simple math, the DRAFTT scorecard, hours, and taxes. Every
 * figure comes from the engine; a lens only arranges and compares.
 */

import ratiosFile from "../../data/ratios.json";
import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { fiNumbers, type FiNumbers } from "../optimizer/fi-numbers";
import { optimize } from "../optimizer/search";
import { strategyToggles } from "../optimizer/toggles";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { ratioInputs, type RatioInputs } from "./ratios";

export const LENSES = ratiosFile.lenses;

/** The 4% rule lens (acceptance test 4): the same numbers M2 shows. */
export function fourPercentLens(h: Household, deps: Deps = defaultDeps()): FiNumbers & { sentence: string } {
  const o = optimize(h, { objective: "earliestFi" }, deps);
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const n = fiNumbers(h, o, runFor(requireComplete(h), band, deps, Infinity));
  const money = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
  const sentence = n.netFi === null ? `The 4% rule says ${money(n.grossFi)}. The plan is not fully funded in the likely band, so there is no True FI number yet.` : `The 4% rule says you need ${money(n.grossFi)}. With the optimized plan, ${money(n.netFi)} is enough${n.differenceYears !== null ? `, about ${Math.abs(n.differenceYears)} ${Math.abs(n.differenceYears) === 1 ? "year" : "years"} ${n.differenceYears >= 0 ? "sooner" : "later"}` : ""}.`;
  return { ...n, sentence };
}

/** Years to FI from a savings rate alone, at a real return and a withdrawal rate (the Shockingly simple math table). */
export function yearsToFiFromSavingsRate(savingsRatePercent: number, returnPercent: number, withdrawalRatePercent: number): number | null {
  const s = savingsRatePercent / 100;
  if (s <= 0) return null;
  if (s >= 1) return 0;
  const r = returnPercent / 100;
  // Spending is (1 - s) of take-home; the target is spending over the withdrawal rate; saving s a year grows at r.
  const target = (1 - s) / (withdrawalRatePercent / 100);
  if (r === 0) return target / s;
  // s * ((1 + r)^n - 1) / r = target  ->  n = ln(1 + target r / s) / ln(1 + r)
  return Math.log(1 + (target * r) / s) / Math.log(1 + r);
}

export interface SimpleMathLens {
  savingsRatePercent: number | null;
  yearsFromTable: number | null;
  tableReturnPercent: number;
  tableWithdrawalRatePercent: number;
  planYearsToFi: number | null;
  table: { savingsRate: number; years: number | null }[];
  sentence: string;
  source: string;
}

/** Shockingly simple math (acceptance test 5). */
export function simpleMathLens(h: Household, deps: Deps = defaultDeps(), inputs: RatioInputs = ratioInputs(h, deps)): SimpleMathLens {
  const lens = ratiosFile.lenses.find((l) => l.id === "simpleMath") as { returnPercent: number; withdrawalRatePercent: number; source: string };
  const rate = inputs.year1 && inputs.year1.takeHome > 0 ? (inputs.year1.contributions / inputs.year1.takeHome) * 100 : null;
  const years = rate === null ? null : yearsToFiFromSavingsRate(rate, lens.returnPercent, lens.withdrawalRatePercent);
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const fi = findFiDate(requireComplete(h), band, deps);
  const year0 = Number(h.asOf.slice(0, 4));
  const planYears = fi.retirementYear === null ? null : fi.retirementYear - year0;
  const table = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map((s) => ({ savingsRate: s, years: yearsToFiFromSavingsRate(s, lens.returnPercent, lens.withdrawalRatePercent) }));
  const sentence =
    rate === null || years === null
      ? "The table needs a savings rate."
      : `At a ${Math.round(rate)}% savings rate, the table says about ${Math.round(years)} years to FI from zero. Your plan, which starts from today's balances and counts taxes, Social Security, and the drawdown, says ${planYears === null ? "it is not fully funded in the likely band" : `${planYears} ${planYears === 1 ? "year" : "years"}`}.`;
  return { savingsRatePercent: rate, yearsFromTable: years, tableReturnPercent: lens.returnPercent, tableWithdrawalRatePercent: lens.withdrawalRatePercent, planYearsToFi: planYears, table, sentence, source: lens.source };
}

export interface DrafttLetter {
  id: string;
  label: string;
  sharePercent: number;
  range: [number, number];
  inRange: boolean;
  optional: boolean;
}

/** The DRAFTT scorecard (acceptance test 6): shares of take-home pay, with therapy and taxes switchable. */
export function drafttLens(h: Household, options: { therapy?: boolean; taxes?: boolean } = {}, deps: Deps = defaultDeps(), inputs: RatioInputs = ratioInputs(h, deps)): { letters: DrafttLetter[]; totalPercent: number; takeHome: number } {
  const lens = ratiosFile.lenses.find((l) => l.id === "draftt") as { letters: { id: string; label: string; categories?: string[]; debtPayments?: boolean; taxes?: boolean; optional?: boolean; range: [number, number] }[] };
  const takeHome = inputs.year1?.takeHome ?? 0;
  const spending = h.spending.kind === "rows" ? h.spending.rows : [];
  const letters: DrafttLetter[] = [];
  for (const l of lens.letters) {
    if (l.id === "T1" && options.therapy === false) continue;
    if (l.id === "T2" && options.taxes !== true) continue;
    let dollars = 0;
    if (l.debtPayments) dollars = inputs.debtPaymentsAnnual;
    else if (l.taxes) dollars = inputs.year1?.taxes ?? 0;
    else dollars = spending.filter((r) => (l.categories ?? []).includes(r.category)).reduce((s, r) => s + r.annual.value, 0);
    // Taxes are measured against gross pay, the others against take-home.
    const base = l.taxes ? (inputs.year1?.gross ?? 0) : takeHome;
    const share = base > 0 ? (dollars / base) * 100 : 0;
    letters.push({ id: l.id, label: l.label, sharePercent: share, range: l.range, inRange: share >= l.range[0] && share <= l.range[1], optional: !!l.optional });
  }
  return { letters, totalPercent: letters.filter((l) => l.id !== "T2").reduce((s, l) => s + l.sharePercent, 0), takeHome };
}

/** The hours lens: each spending row and debt payment in hours of the real hourly wage. */
export function hoursLens(h: Household, deps: Deps = defaultDeps(), inputs: RatioInputs = ratioInputs(h, deps)): { hourlyWage: number | null; lines: { label: string; annual: number; hours: number }[] } {
  const wage = inputs.year1 && inputs.hoursPerYear > 0 ? inputs.year1.takeHome / inputs.hoursPerYear : null;
  const lines: { label: string; annual: number; hours: number }[] = [];
  if (wage && wage > 0) {
    if (h.spending.kind === "rows") for (const r of h.spending.rows) lines.push({ label: r.label ?? r.category, annual: r.annual.value, hours: r.annual.value / wage });
    if (h.accounts.kind === "rows") for (const a of h.accounts.rows) if (a.side === "debt") lines.push({ label: `${a.name?.value ?? a.preset} payments`, annual: a.actualPaymentAnnual.value, hours: a.actualPaymentAnnual.value / wage });
  }
  return { hourlyWage: wage, lines: lines.sort((a, b) => b.hours - a.hours) };
}

/** The taxes lens: lifetime taxes, the effective rate, and what the plan's strategies change. */
export function taxesLens(h: Household, deps: Deps = defaultDeps(), inputs: RatioInputs = ratioInputs(h, deps)): { lifetimeTaxes: number; effectiveRateNow: number | null; taxEfficiencyPercent: number | null; strategies: { label: string; deltaLifetimeTaxesOff: number }[] } {
  const o = optimize(h, { objective: "leastLifetimeTax" }, deps);
  const toggles = strategyToggles(h, o.best.policy, deps).filter((t) => t.on);
  return {
    lifetimeTaxes: inputs.lifetimeTaxes,
    effectiveRateNow: inputs.year1 && inputs.year1.gross > 0 ? (inputs.year1.taxes / inputs.year1.gross) * 100 : null,
    taxEfficiencyPercent: inputs.lifetimeIncome > 0 ? (inputs.lifetimeTaxes / inputs.lifetimeIncome) * 100 : null,
    strategies: toggles.map((t) => ({ label: t.label, deltaLifetimeTaxesOff: t.deltaLifetimeTaxesOff })),
  };
}
