/**
 * Getting money out before and after 59 and a half (M2 spec section 4 A and B5):
 * Roth ordering with contribution basis and per-conversion five-year clocks,
 * required minimum distributions, and 72(t) payments by all three IRS methods.
 * Pure helpers. Every number comes from data/ through the rules ledger or the
 * life expectancy tables.
 */

import tables from "../../data/life-expectancy-tables.json";
import type { RuleLedger, SeppMethod } from "../model";

// ---------------------------------------------------------------------------
// Life expectancy tables
// ---------------------------------------------------------------------------

export type LifeTable = "uniformLifetime" | "singleLife";

/** The divisor for an age from one of the IRS tables. Ages past the table use its last entry. */
export function lifeExpectancy(age: number, table: LifeTable = "uniformLifetime"): number {
  const t = tables[table] as Record<string, number>;
  const ages = Object.keys(t).map(Number);
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  const a = Math.min(Math.max(Math.floor(age), min), max);
  const v = t[String(a)];
  if (v === undefined) throw new Error(`No life expectancy for age ${a}`);
  return v;
}

export const LIFE_TABLES_SOURCE = tables.sources;

// ---------------------------------------------------------------------------
// Required minimum distributions (B5)
// ---------------------------------------------------------------------------

interface RmdStartRule {
  bornThrough1950: number;
  born1951to1959: number;
  born1960orLater: number;
}

/** The age required distributions begin, by birth year (SECURE 2.0 section 107). */
export function rmdStartAge(birthYear: number, ledger: RuleLedger): number {
  const r = ledger.get<RmdStartRule>("rmd.startAge");
  if (birthYear <= 1950) return r.bornThrough1950;
  if (birthYear <= 1959) return r.born1951to1959;
  return r.born1960orLater;
}

/** This year's required distribution from a pretax balance: the prior year-end balance over the Uniform Lifetime divisor. */
export function requiredMinimumDistribution(priorYearEndBalance: number, age: number, birthYear: number, ledger: RuleLedger): number {
  if (age < rmdStartAge(birthYear, ledger) || !(priorYearEndBalance > 0)) return 0;
  return priorYearEndBalance / lifeExpectancy(age, "uniformLifetime");
}

// ---------------------------------------------------------------------------
// Roth ordering (A1, A2)
// ---------------------------------------------------------------------------

export interface RothLayer {
  /** Regular contributions: out first, always free. */
  basis: number;
  /** Conversions oldest first: the taxable part converted, with the year the clock started. */
  conversions: { year: number; amount: number }[];
  /** The year of the first Roth contribution, for the five-year earnings clock. */
  firstYear: number;
}

export interface RothDraw {
  /** Dollars that come out free of tax and penalty (contribution basis plus seasoned conversions). */
  free: number;
  /** The part of `free` that was contribution basis. */
  fromBasis: number;
  /** The part of `free` that was conversions past their five-year clock (or drawn at 59 and a half or later). */
  seasonedConversions: number;
  /** Conversion dollars inside their five-year clock, drawn under 59 and a half: the 10% additional tax applies, no income tax. */
  penalizedConversions: number;
  /** Earnings drawn. Taxable as ordinary income, and penalized, only when the distribution is not qualified (59 and a half and the five-year clock). */
  earnings: number;
  earningsPenalized: boolean;
  /** True when the distribution is qualified: the earnings come out free of tax and penalty. */
  earningsQualified: boolean;
  /** The layers after the draw. */
  after: RothLayer;
}

interface RothOrderingRule {
  order: string[];
}

/**
 * Takes `amount` out of a Roth account in the IRS order: contributions, then conversions
 * oldest first, then earnings. `balance` is the whole account; earnings are what is not basis
 * or conversion. The penalty-free age and the five-year clocks come from the rule.
 */
export function drawRoth(amount: number, balance: number, layers: RothLayer, year: number, age: number, penaltyFreeAge: number, ledger: RuleLedger): RothDraw {
  ledger.get<RothOrderingRule>("access.rothOrdering");
  const after: RothLayer = { basis: layers.basis, conversions: layers.conversions.map((c) => ({ ...c })), firstYear: layers.firstYear };
  let need = Math.max(0, Math.min(amount, balance));
  let free = 0;
  let penalizedConversions = 0;
  let seasonedConversions = 0;

  const fromBasis = Math.min(need, after.basis);
  after.basis -= fromBasis;
  free += fromBasis;
  need -= fromBasis;

  for (const c of after.conversions) {
    if (need <= 0) break;
    const take = Math.min(need, c.amount);
    c.amount -= take;
    need -= take;
    const clockDone = year - c.year >= 5;
    if (clockDone || age >= penaltyFreeAge) {
      free += take;
      seasonedConversions += take;
    } else penalizedConversions += take;
  }
  after.conversions = after.conversions.filter((c) => c.amount > 0.005);

  const earnings = need;
  const qualified = age >= penaltyFreeAge && year - layers.firstYear >= 5;
  return { free, fromBasis, seasonedConversions, penalizedConversions, earnings, earningsPenalized: !qualified && earnings > 0, earningsQualified: qualified, after };
}

// ---------------------------------------------------------------------------
// 72(t) substantially equal periodic payments (A3)
// ---------------------------------------------------------------------------

export type { SeppMethod } from "../model";

export interface SeppInput {
  balance: number;
  /** Age on the birthday in the first distribution year. */
  age: number;
  method: SeppMethod;
  /** Percent per year, no more than the greater of 5% and 120% of the federal mid-term rate. */
  interestRatePercent: number;
  table?: LifeTable;
}

/** The allowed ceiling on the 72(t) interest rate for a federal mid-term rate (percent). */
export function seppMaxRate(federalMidTermRatePercent: number, ledger: RuleLedger): number {
  ledger.get("access.sepp72t");
  return Math.max(5, 1.2 * federalMidTermRatePercent);
}

/** The first year's payment under each IRS method. The RMD method is recomputed yearly by the caller; the other two stay fixed. */
export function seppPayment(input: SeppInput, ledger: RuleLedger): number {
  ledger.get("access.sepp72t");
  const n = lifeExpectancy(input.age, input.table ?? "uniformLifetime");
  const i = input.interestRatePercent / 100;
  if (!(input.balance > 0)) return 0;
  switch (input.method) {
    case "rmd":
      return input.balance / n;
    case "fixedAmortization": {
      // Level payment that amortizes the balance over n years at rate i (annuity-immediate).
      if (i === 0) return input.balance / n;
      return (input.balance * i) / (1 - Math.pow(1 + i, -n));
    }
    case "fixedAnnuitization": {
      // Notice 2022-6 derives an annuity factor from the 1.401(a)(9)-9(e) mortality rates. That table is not in
      // data/, so the factor is approximated by a level annuity over the Single Life expectancy at rate i.
      // The result is close to the amortization method and is marked approximate in the plan text.
      const ns = lifeExpectancy(input.age, "singleLife");
      if (i === 0) return input.balance / ns;
      return (input.balance * i) / (1 - Math.pow(1 + i, -ns));
    }
  }
}

/** Payments must continue for the longer of five years or until 59 and a half (whole years here). */
export function seppYearsRequired(startAge: number, penaltyFreeAge: number): number {
  return Math.max(5, Math.ceil(penaltyFreeAge - startAge));
}

// ---------------------------------------------------------------------------
// Rule of 55 and governmental 457(b) (A4, A7)
// ---------------------------------------------------------------------------

interface RuleOf55 {
  age: number;
  publicSafetyAge: number;
}

/** True when a withdrawal from the plan of the employer just left owes no penalty: separated in or after the year of the 55th birthday. */
export function ruleOf55Applies(ageAtSeparation: number, age: number, year: number, separationYear: number, ledger: RuleLedger, publicSafety = false): boolean {
  const r = ledger.get<RuleOf55>("access.ruleOf55");
  const threshold = publicSafety ? r.publicSafetyAge : r.age;
  return ageAtSeparation >= threshold && year >= separationYear && age >= threshold;
}

/** Governmental 457(b) money owes no penalty once the person has left that employer. */
export function governmental457bPenaltyFree(year: number, separationYear: number, ledger: RuleLedger): boolean {
  ledger.get("access.457bNoPenalty");
  return year >= separationYear;
}
