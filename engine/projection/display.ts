/**
 * Display-time conversions the UI is not allowed to do itself (README rule 4).
 * Nominal (future) dollars from real (today's) dollars, using the inflation assumption.
 */

/** The factor that turns today's dollars into dollars t years from now. */
export function nominalFactor(inflationPercent: number, t: number): number {
  return Math.pow(1 + inflationPercent / 100, t);
}

export function toNominal(real: number, inflationPercent: number, t: number): number {
  return real * nominalFactor(inflationPercent, t);
}

/** Monthly amount for display from a stored annual amount. */
export function monthlyFromAnnual(annual: number): number {
  return annual / 12;
}
