/**
 * Gross FI vs Net FI, and the True FI reveal (M2 spec sections 2 and 9).
 * Gross FI is the 4% rule: 25 times spending. Net FI is what the optimized
 * plan shows is enough: assets at retirement. Pure functions.
 */

import type { Household } from "../model";
import { isAnswered } from "../model";
import type { OptimizerResult } from "./search";

export interface FiNumbers {
  /** Annual spending the 4% rule is applied to (today's dollars, current full spending). */
  annualSpending: number;
  /** 25 times spending. */
  grossFi: number;
  /** Assets at the optimized FI date, or null when never funded. */
  netFi: number | null;
  /** Net minus gross: negative means the homework is worth that much. */
  differenceDollars: number | null;
  /** The year the plan's assets first reach the gross number, working on, or null if never. */
  grossFiYear: number | null;
  /** The optimized FI year. */
  netFiYear: number | null;
  /** Gross year minus net year: positive means the homework is worth that many years. */
  differenceYears: number | null;
}

/** The current full annual spending from the stored rows (not the engine's retirement baseline). */
export function currentAnnualSpending(h: Household): number {
  if (h.spending.kind !== "rows") return 0;
  return h.spending.rows.reduce((s, r) => s + r.annual.value, 0);
}

export function fiNumbers(h: Household, optimized: OptimizerResult, workingOn: { rows: { year: number; assets: number }[] }): FiNumbers {
  const annualSpending = currentAnnualSpending(h);
  const grossFi = 25 * annualSpending;
  const best = optimized.best.result;
  const netFi = best.funded ? best.timeline.assetsAtRetirement : null;
  const grossFiYear = workingOn.rows.find((r) => r.assets >= grossFi)?.year ?? null;
  const netFiYear = best.retirementYear;
  return {
    annualSpending,
    grossFi,
    netFi,
    differenceDollars: netFi === null ? null : netFi - grossFi,
    grossFiYear,
    netFiYear,
    differenceYears: grossFiYear === null || netFiYear === null ? null : grossFiYear - netFiYear,
  };
}

/** One drawdown input still needed before the True FI number unlocks (M2 spec section 9). */
export interface UnlockItem {
  id: string;
  label: string;
  /** About two minutes each, so the card can say how long is left. */
  minutes: number;
}

/**
 * The drawdown inputs (spec section 7) not yet answered, roughly, or marked not for me.
 * Not having an account type counts as complete. "Roughly" counts (decision N9).
 */
export function drawdownUnlockItems(h: Household): UnlockItem[] {
  const items: UnlockItem[] = [];
  const accounts = h.accounts.kind === "rows" ? h.accounts.rows : [];
  for (const a of accounts) {
    if (a.side !== "asset" || !isAnswered(a.balance)) continue;
    const name = a.name?.value ?? a.preset;
    if (a.taxBucket.value === "taxable" && !a.costBasis) items.push({ id: `account.${a.id}.costBasis`, label: `Cost basis of ${name}`, minutes: 2 });
    if (a.taxBucket.value === "roth" && !a.rothBasis) items.push({ id: `account.${a.id}.rothBasis`, label: `Contributions so far to ${name}`, minutes: 2 });
    if (a.taxBucket.value === "hsa" && !a.savedReceipts) items.push({ id: `account.${a.id}.savedReceipts`, label: `Saved medical receipts for ${name}`, minutes: 2 });
  }
  const hasRoth = accounts.some((a) => a.side === "asset" && a.taxBucket.value === "roth");
  if (hasRoth && !h.drawdown?.firstRothYear) items.push({ id: "drawdown.firstRothYear", label: "Year of your first Roth contribution", minutes: 1 });
  const hasWorkplace = accounts.some((a) => a.side === "asset" && (a.preset === "trad401k" || a.preset === "roth401k")) || (h.self.income.kind === "rows" && h.self.income.rows.some((s) => s.preTaxDeductions?.some((d) => d.type === "401k" || d.type === "403b")));
  if (hasWorkplace) {
    const plan = h.plans?.[0];
    if (!plan || plan.ruleOf55Allowed.value === "unknown") items.push({ id: "plan.ruleOf55Allowed", label: "Does your workplace plan allow the rule of 55?", minutes: 2 });
    if (!plan) items.push({ id: "plan.planType", label: "Is your workplace plan a governmental 457(b)?", minutes: 1 });
  }
  if (!h.drawdown?.heirTaxRatePercent) items.push({ id: "drawdown.heirTaxRatePercent", label: "Expected heir tax rate", minutes: 1 });
  if (!h.drawdown?.acaHouseholdSize) items.push({ id: "drawdown.acaHouseholdSize", label: "Household size for health insurance", minutes: 1 });
  if (!h.drawdown?.medicaidExpansionState) items.push({ id: "drawdown.medicaidExpansionState", label: "Is your state a Medicaid expansion state?", minutes: 1 });
  return items;
}
