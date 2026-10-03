/**
 * Contribution limits for a year, by age (engine spec section 3, step 3).
 * Catch-up limits apply automatically by age (decision E10). Numbers come
 * from data/tax/<year>.json.
 */

import type { FederalTables } from "../model";

export interface YearLimits {
  /** Employee elective deferrals across 401(k), 403(b), and Roth 401(k) together. */
  workplace: number;
  /** Traditional and Roth IRA together. */
  ira: number;
  /** HSA, self-only coverage (M1 assumes self-only). */
  hsa: number;
}

/** @param age Age at the end of the year. The IRS keys catch-ups to the age reached during the year. */
export function contributionLimits(age: number, t: FederalTables): YearLimits {
  const l = t.contributionLimits;
  let workplace = l.workplaceElective;
  if (age >= 60 && age <= 63) workplace += l.workplaceCatchUp60to63;
  else if (age >= 50) workplace += l.workplaceCatchUp50;

  const ira = l.ira + (age >= 50 ? l.iraCatchUp50 : 0);
  const hsa = l.hsaSelfOnly + (age >= 55 ? l.hsaCatchUp55 : 0);
  return { workplace, ira, hsa };
}
