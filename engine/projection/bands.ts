/**
 * Turning resolved assumptions (low, likely, high) into one set of numbers
 * for a band (engine spec section 6). Which end of each band is "best" depends
 * on the assumption: high returns are good, high inflation is bad.
 */

import type { AssetClass, BandName, IncomeGrowthType, LifePhase, ResolvedAssumptions } from "../model";
import { ASSET_CLASSES, INCOME_GROWTH_TYPES, pickBand } from "../model";

export interface BandNumbers {
  band: BandName;
  /** Real percent per year by asset class. */
  returns: Record<AssetClass, number>;
  /** Percent per year. */
  inflation: number;
  /** Real percent per year by income type. */
  incomeGrowth: Record<IncomeGrowthType, number>;
  /** Fraction of the scheduled Social Security benefit paid. */
  socialSecurityPolicy: number;
  planToAge: number;
  phases: readonly LifePhase[];
}

type End = "low" | "likely" | "high";

/** For assumptions where more is better (returns, income growth, Social Security). */
function higherIsBetter(band: BandName): End {
  return band === "best" ? "high" : band === "worst" ? "low" : "likely";
}

/** For assumptions where more is worse (inflation). */
function lowerIsBetter(band: BandName): End {
  return band === "best" ? "low" : band === "worst" ? "high" : "likely";
}

export function resolveBand(a: ResolvedAssumptions, band: BandName): BandNumbers {
  const up = higherIsBetter(band);
  const down = lowerIsBetter(band);

  const returns = {} as Record<AssetClass, number>;
  for (const cls of ASSET_CLASSES) returns[cls] = pickBand(a.returns[cls].value, up);

  const incomeGrowth = {} as Record<IncomeGrowthType, number>;
  for (const type of INCOME_GROWTH_TYPES) incomeGrowth[type] = pickBand(a.incomeGrowth[type].value, up);

  return {
    band,
    returns,
    inflation: pickBand(a.inflation.value, down),
    incomeGrowth,
    socialSecurityPolicy: pickBand(a.socialSecurityPolicy.value, up),
    planToAge: a.planToAge.value,
    phases: a.phases.value,
  };
}

export const BAND_NAMES: readonly BandName[] = ["best", "likely", "worst"];
