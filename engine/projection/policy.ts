/**
 * The drawdown policy (M2 spec section 3): the knobs the optimizer searches,
 * and the per-year locks a person can set by hand (section 5). The timeline
 * reads a policy and applies it; the optimizer builds policies and compares
 * the results. Nothing here calculates.
 */

import type { AgeYearsMonths, SeppMethod } from "../model";
export type { SeppMethod } from "../model";

/** How much to convert from pretax to Roth each year, as a target for ordinary taxable income. */
export type ConversionTarget =
  | "none"
  | "fillStandardDeduction"
  | "fill10"
  | "fill12"
  | "fill22"
  /** Convert as much as the ACA income target allows. */
  | "fillToAcaTarget"
  /** Convert up to the top of the current IRMAA tier (two-year lookback applies). */
  | "fillToIrmaaTier";

export type GainHarvesting = "off" | "fillZeroBracket";

/** The ACA income target as a percent of the poverty line, or off. */
export type AcaTarget = "off" | 138 | 150 | 200 | 250 | 400;

export type WithdrawalOrder = "conventional" | "proportional" | "bracketBased";

export interface SeppPlan {
  startAge: number;
  method: SeppMethod;
  /** Percent per year. Checked against the 72(t) ceiling by the engine. */
  interestRatePercent: number;
  /** The federal mid-term rate the ceiling is measured against (percent). An input until the engine has a monthly source. */
  federalMidTermRatePercent: number;
}

export type ContributionType = "asEntered" | "traditional" | "roth" | "split";

/** One year's hand-set choices (section 5). Anything blank is left to the policy. */
export interface YearLock {
  /** Convert exactly this much this year. */
  conversion?: number;
  /** Harvest exactly this much in gains this year. */
  harvest?: number;
  acaTarget?: AcaTarget;
  /** Draw from this account first this year. */
  withdrawFirst?: "taxable" | "pretax" | "roth" | "hsa" | "cash";
  /** Part-time work this year, gross dollars (Barista FI). */
  workIncome?: number;
}

export interface DrawdownPolicy {
  conversionTarget: ConversionTarget;
  gainHarvesting: GainHarvesting;
  acaTarget: AcaTarget;
  withdrawalOrder: WithdrawalOrder;
  sepp: SeppPlan | null;
  ruleOf55: boolean;
  /** Overrides the household's claiming age when set. */
  claimingAge: AgeYearsMonths | null;
  contributionType: ContributionType;
  /** By calendar year. */
  locks: Record<number, YearLock>;
  /** Optional limits (section 3). */
  limits: PolicyLimits;
}

export interface PolicyLimits {
  /** Never pay the 10% additional tax: pretax and young-conversion draws are skipped before 59 and a half when another source exists. */
  neverPayPenalty: boolean;
  /** Keep MAGI under the ACA cliff before 65. */
  stayUnderAcaCliff: boolean;
  /** Keep MAGI at or under this IRMAA tier (0 = standard premium), or null. */
  irmaaTierCap: number | null;
  /** Dollars that must remain at plan-to age, or null. */
  estateFloor: number | null;
  /** Months of spending kept in cash. Null means the engine default. */
  cashBufferMonths: number | null;
  /** The most years of 72(t) payments, or null. */
  maxSeppYears: number | null;
}

/** What the engine does with no policy: the conventional order and no strategies. Same drawdown as M1, at M2 tax depth. */
export function defaultPolicy(): DrawdownPolicy {
  return {
    conversionTarget: "none",
    gainHarvesting: "off",
    acaTarget: "off",
    withdrawalOrder: "conventional",
    sepp: null,
    ruleOf55: false,
    claimingAge: null,
    contributionType: "asEntered",
    locks: {},
    limits: { neverPayPenalty: false, stayUnderAcaCliff: false, irmaaTierCap: null, estateFloor: null, cashBufferMonths: null, maxSeppYears: null },
  };
}

export const CONVERSION_TARGETS: readonly ConversionTarget[] = ["none", "fillStandardDeduction", "fill10", "fill12", "fill22", "fillToAcaTarget", "fillToIrmaaTier"];
export const ACA_TARGETS: readonly AcaTarget[] = ["off", 138, 150, 200, 250, 400];
export const WITHDRAWAL_ORDERS: readonly WithdrawalOrder[] = ["conventional", "proportional", "bracketBased"];
