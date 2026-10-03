/**
 * Annual normalization (data dictionary 2.4).
 * Entry formats are free. Storage is always annual. The UI calls these; it never multiplies.
 */

import type { PayFrequency } from "./types";

export type Cadence = "hour" | "paycheck" | "month" | "year";

export const PAY_PERIODS_PER_YEAR: Readonly<Record<PayFrequency, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

export interface CadenceContext {
  /** Needed when cadence is "paycheck". */
  payFrequency?: PayFrequency;
  /** Needed when cadence is "hour". */
  hoursPerWeek?: number;
}

/** Turns an amount at any cadence into an annual amount. */
export function annualFrom(amount: number, cadence: Cadence, context: CadenceContext = {}): number {
  switch (cadence) {
    case "year":
      return amount;
    case "month":
      return amount * MONTHS_PER_YEAR;
    case "paycheck": {
      if (!context.payFrequency) throw new Error("Pay frequency is needed to annualize a paycheck amount");
      return amount * PAY_PERIODS_PER_YEAR[context.payFrequency];
    }
    case "hour": {
      if (context.hoursPerWeek === undefined) throw new Error("Hours per week are needed to annualize an hourly amount");
      return amount * context.hoursPerWeek * WEEKS_PER_YEAR;
    }
  }
}

/** The reverse: an annual amount shown at a cadence. Display only. */
export function fromAnnual(annual: number, cadence: Cadence, context: CadenceContext = {}): number {
  const perUnit = annualFrom(1, cadence, context);
  return annual / perUnit;
}

/** Debt payments are entered monthly and stored annual (3.6). */
export function annualFromMonthly(monthly: number): number {
  return monthly * MONTHS_PER_YEAR;
}

/** A dollar contribution as a percent of pay (4 means 4%). Zero pay gives zero. */
export function percentOfPay(annualAmount: number, grossAnnual: number): number {
  return grossAnnual > 0 ? (annualAmount / grossAnnual) * 100 : 0;
}

/** The annual dollars a percent of pay comes to. */
export function amountFromPercentOfPay(percent: number, grossAnnual: number): number {
  return (percent / 100) * grossAnnual;
}
