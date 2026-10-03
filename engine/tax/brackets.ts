/**
 * Marginal bracket math. Used for federal and state ordinary income tax.
 * Rates in the schedules are percents (data/tax conventions).
 */

import type { BracketSchedule } from "../model";

/** Tax on a taxable income under an ascending marginal schedule. */
export function taxFromBrackets(taxableIncome: number, schedule: BracketSchedule): number {
  if (!(taxableIncome > 0)) return 0;
  let tax = 0;
  for (let i = 0; i < schedule.length; i++) {
    const bracket = schedule[i];
    if (!bracket) break;
    if (taxableIncome <= bracket.from) break;
    const next = schedule[i + 1];
    const top = next ? next.from : Infinity;
    const slice = Math.min(taxableIncome, top) - bracket.from;
    tax += (slice * bracket.rate) / 100;
  }
  return tax;
}

/** The rate (percent) that applies to the next dollar of taxable income. */
export function marginalRateFromBrackets(taxableIncome: number, schedule: BracketSchedule): number {
  let rate = schedule[0]?.rate ?? 0;
  for (const bracket of schedule) {
    if (taxableIncome >= bracket.from) rate = bracket.rate;
    else break;
  }
  return rate;
}
