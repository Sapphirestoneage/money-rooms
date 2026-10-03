/**
 * The FI date (engine spec section 6): the earliest retirement year that is
 * fully funded through plan-to age, found by testing each year with a full
 * timeline run, once per band.
 */

import type { BandName, Household, SocialSecurityParams, TaxTables } from "../model";
import { loadSocialSecurityParams, loadTaxTables, parseYearMonth, resolveAssumptions } from "../model";
import { BAND_NAMES, resolveBand, type BandNumbers } from "./bands";
import type { DrawdownPolicy } from "./policy";
import { requireComplete, runTimeline, type CompleteHousehold, type EngineConventions, type TieOutSettings, type TimelineResult } from "./timeline";

export interface BandResult {
  band: BandName;
  funded: boolean;
  /** The first calendar year with no work income, when funded. */
  retirementYear: number | null;
  /** Age at the end of that year. */
  fiAge: number | null;
  /** The timeline for the FI date (or for never retiring, when not funded). */
  timeline: TimelineResult;
  /** When funded: the first shortfall if the person retired one year earlier. */
  oneYearEarlier: { year: number; age: number; amount: number } | null;
  /** When never funded: where the shortfall begins even working to plan-to age. */
  neverFundedShortfall: { year: number; age: number; amount: number } | null;
}

export interface ProjectionResult {
  asOf: string;
  bands: Record<BandName, BandResult>;
}

export interface Deps {
  tables: TaxTables;
  ssParams: SocialSecurityParams;
  /** Test-only settings for hand tie-outs. The app never sets these. */
  testSettings?: TieOutSettings;
  /** m1 (the tied-out skeleton) or m2 (full depth). Blank means m1. */
  conventions?: EngineConventions;
  /** M2: the drawdown policy. Blank means the conventional order with no strategies. */
  policy?: DrawdownPolicy;
  /** Stress test: rules treated as gone. */
  disabledRules?: readonly string[];
  /** Spending scaled every year (1 = as entered). */
  spendingScale?: number;
}

/** What the app uses: M2 depth with the default policy. */
export function defaultDeps(): Deps {
  return { tables: loadTaxTables(2026), ssParams: loadSocialSecurityParams(2026), conventions: "m2" };
}

/** The walking skeleton's method, for M1 tests and the Maya tie-out. */
export function m1Deps(): Deps {
  return { tables: loadTaxTables(2026), ssParams: loadSocialSecurityParams(2026), conventions: "m1" };
}

export function isFunded(t: TimelineResult): boolean {
  return t.firstShortfall === null;
}

/** Searches retirement years from year 0 forward and returns the first fully funded one. */
/** One timeline run under the deps, for a retirement year. */
export function runFor(hh: CompleteHousehold, band: BandNumbers, deps: Deps, retirementYear: number): TimelineResult {
  return runTimeline(hh, {
    band,
    retirementYear,
    tables: deps.tables,
    ssParams: deps.ssParams,
    ...(deps.testSettings ? { testSettings: deps.testSettings } : {}),
    ...(deps.conventions ? { conventions: deps.conventions } : {}),
    ...(deps.policy ? { policy: deps.policy } : {}),
    ...(deps.disabledRules ? { disabledRules: deps.disabledRules } : {}),
    ...(deps.spendingScale !== undefined ? { spendingScale: deps.spendingScale } : {}),
  });
}

/**
 * The FI search. `near` is a hint from an earlier search: the walk starts there, steps back while
 * still funded, and steps forward while not, so the answer is the same earliest funded year with
 * far fewer runs. Without a hint it walks up from year 0.
 */
export function findFiDate(hh: CompleteHousehold, band: BandNumbers, deps: Deps, near?: number): BandResult {
  const year0 = parseYearMonth(hh.asOf.slice(0, 7)).year;
  const birthYear = parseYearMonth(hh.birthDate).year;
  const lastYear = birthYear + band.planToAge;
  const run = (retirementYear: number) => runFor(hh, band, deps, retirementYear);

  if (near !== undefined && near > year0 && near <= lastYear) {
    let y = near;
    let t = run(y);
    if (isFunded(t)) {
      // Step back to the earliest funded year.
      while (y > year0) {
        const earlier = run(y - 1);
        if (!isFunded(earlier)) {
          return { band: band.band, funded: true, retirementYear: y, fiAge: y - birthYear, timeline: t, oneYearEarlier: earlier.firstShortfall, neverFundedShortfall: null };
        }
        y -= 1;
        t = earlier;
      }
      return { band: band.band, funded: true, retirementYear: y, fiAge: y - birthYear, timeline: t, oneYearEarlier: null, neverFundedShortfall: null };
    }
    let previous = t;
    for (let z = y + 1; z <= lastYear; z++) {
      const later = run(z);
      if (isFunded(later)) return { band: band.band, funded: true, retirementYear: z, fiAge: z - birthYear, timeline: later, oneYearEarlier: previous.firstShortfall, neverFundedShortfall: null };
      previous = later;
    }
    const never = run(Infinity);
    return { band: band.band, funded: false, retirementYear: null, fiAge: null, timeline: never, oneYearEarlier: null, neverFundedShortfall: never.firstShortfall ?? previous.firstShortfall };
  }

  let previous: TimelineResult | null = null;
  for (let y = year0; y <= lastYear; y++) {
    const t = run(y);
    if (isFunded(t)) {
      return {
        band: band.band,
        funded: true,
        retirementYear: y,
        fiAge: y - birthYear,
        timeline: t,
        oneYearEarlier: previous?.firstShortfall ?? null,
        neverFundedShortfall: null,
      };
    }
    previous = t;
  }
  const never = run(Infinity);
  return {
    band: band.band,
    funded: false,
    retirementYear: null,
    fiAge: null,
    timeline: never,
    oneYearEarlier: null,
    neverFundedShortfall: never.firstShortfall ?? previous?.firstShortfall ?? null,
  };
}

/** Runs the FI search in all three bands. */
export function project(household: Household, deps: Deps = defaultDeps()): ProjectionResult {
  const hh = requireComplete(household);
  const resolved = resolveAssumptions(household.assumptions);
  const bands = {} as Record<BandName, BandResult>;
  for (const name of BAND_NAMES) bands[name] = findFiDate(hh, resolveBand(resolved, name), deps);
  return { asOf: household.asOf, bands };
}
