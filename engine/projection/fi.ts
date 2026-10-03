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
export function findFiDate(hh: CompleteHousehold, band: BandNumbers, deps: Deps): BandResult {
  const year0 = parseYearMonth(hh.asOf.slice(0, 7)).year;
  const birthYear = parseYearMonth(hh.birthDate).year;
  const lastYear = birthYear + band.planToAge;
  const run = (retirementYear: number) =>
    runTimeline(hh, {
      band,
      retirementYear,
      tables: deps.tables,
      ssParams: deps.ssParams,
      ...(deps.testSettings ? { testSettings: deps.testSettings } : {}),
      ...(deps.conventions ? { conventions: deps.conventions } : {}),
      ...(deps.policy ? { policy: deps.policy } : {}),
    });

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
