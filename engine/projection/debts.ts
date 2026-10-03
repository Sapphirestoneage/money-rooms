/**
 * Debt payments for one year (engine spec section 3, step 6).
 *
 * Real-dollar convention (data dictionary 4.2): a fixed nominal payment and a
 * nominal rate erode with inflation. The engine converts both to real terms:
 * real rate = (1 + nominal) / (1 + inflation) - 1, and the real payment in
 * year t is the nominal payment divided by (1 + inflation)^t.
 */

import engineDefaults from "../../data/engine-defaults.json";
import type { DebtAccount } from "../model";
import { parseYearMonth } from "../model";

export interface DebtYearInput {
  /** Real balance at the start of the year. */
  balance: number;
  /** Nominal percent per year, after any promo logic. */
  nominalRatePercent: number;
  /** Nominal annual payment as entered. */
  nominalPaymentAnnual: number;
  /** Percent per year. */
  inflationPercent: number;
  /** Years since year 0. */
  t: number;
  /** Fraction of the year (1, or the stub fraction in year 0). */
  fraction: number;
  /** Extra principal from the savings waterfall, in real dollars this year. */
  extraPayment: number;
}

export interface DebtYearResult {
  /** Real dollars actually paid this year (scheduled plus extra, capped at payoff). */
  paid: number;
  /** The scheduled part of `paid`. */
  scheduled: number;
  interest: number;
  principal: number;
  endBalance: number;
  paidOff: boolean;
  /** True when the scheduled payment does not cover the year's interest. */
  paymentBelowInterest: boolean;
}

export function realRate(nominalPercent: number, inflationPercent: number): number {
  return (1 + nominalPercent / 100) / (1 + inflationPercent / 100) - 1;
}

/**
 * The nominal rate in force for a year (percent per year). A promo rate holds through its end
 * month, and the rate after it starts the next month. In the year the promo ends, the two are
 * blended by months, compounding, so the year's interest is exactly the promo months at the
 * promo rate and the remaining months at the rate after. `firstMonth` is the first month the
 * year covers: 1, or the plan month in the stub year.
 */
export function nominalRateFor(debt: DebtAccount, year: number, firstMonth = 1): number {
  if (!debt.promo) return debt.rate.value;
  const end = parseYearMonth(debt.promo.endDate.value);
  const promo = debt.promo.rate.value;
  const after = debt.promo.rateAfter.value;
  if (year < end.year) return promo;
  if (year > end.year) return after;
  const months = 12 - firstMonth + 1;
  const promoMonths = Math.max(0, Math.min(months, end.month - firstMonth + 1));
  const share = promoMonths / months;
  return (Math.pow(1 + promo / 100, share) * Math.pow(1 + after / 100, 1 - share) - 1) * 100;
}

/**
 * One year of a debt with a mid-period payment: the balance grows for the
 * whole period and the payment earns back half a period of interest.
 */
export function debtYear(d: DebtYearInput): DebtYearResult {
  if (d.balance <= 0) {
    return { paid: 0, scheduled: 0, interest: 0, principal: 0, endBalance: 0, paidOff: true, paymentBelowInterest: false };
  }
  const r = realRate(d.nominalRatePercent, d.inflationPercent);
  const growthFull = Math.pow(1 + r, d.fraction);
  // A mid-period payment saves half the period's interest (engine spec section 2).
  const growthHalf = 1 + (growthFull - 1) / 2;

  const realScheduled = (d.nominalPaymentAnnual / Math.pow(1 + d.inflationPercent / 100, d.t)) * d.fraction;
  // The payment at mid-period that leaves exactly zero at period end.
  const payoff = (d.balance * growthFull) / growthHalf;
  const wanted = realScheduled + Math.max(0, d.extraPayment);
  const paid = Math.min(wanted, payoff);
  const scheduled = Math.min(realScheduled, paid);

  const endBalance = Math.max(0, d.balance * growthFull - paid * growthHalf);
  const interest = endBalance - d.balance + paid;
  const principal = paid - interest;
  const interestFullYear = d.balance * (growthFull - 1);

  return {
    paid,
    scheduled,
    interest,
    principal,
    endBalance: endBalance < 0.005 ? 0 : endBalance,
    paidOff: endBalance < 0.005,
    paymentBelowInterest: realScheduled < interestFullYear - 1e-9,
  };
}

/**
 * A stand-in for a debt's minimum payment until the person enters the real one
 * (data dictionary 3.6): each month's interest plus a set percent of the balance.
 * Annual dollars. The entry screen shows it marked roughly, never as a silent zero.
 */
export function estimatedMinimumPaymentAnnual(balance: number, nominalRatePercent: number): number {
  if (!(balance > 0)) return 0;
  const percentOfBalance = engineDefaults.estimatedMinimumPayment.percentOfBalancePerMonth;
  const monthly = (balance * nominalRatePercent) / 100 / 12 + (balance * percentOfBalance) / 100;
  return monthly * 12;
}
