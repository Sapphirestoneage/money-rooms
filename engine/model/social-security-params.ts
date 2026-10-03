/**
 * Social Security parameters, loaded from data/social-security/<year>.json
 * (data dictionary 4.4). The engine reads bend points, retirement ages, and
 * claiming factors only from the file.
 */

import ss2026 from "../../data/social-security/2026.json";
import type { AgeYearsMonths } from "./types";

export interface PiaParams {
  /** Monthly dollar bend points, ascending. */
  bendPointsMonthly: readonly number[];
  /** Percent applied to each segment. One more rate than bend points. */
  rates: readonly number[];
  roundDownToCents: number;
  averagingYears: number;
  eligibilityAge: number;
}

export interface EarlyReduction {
  firstMonths: number;
  ratePerMonthFirst: number;
  ratePerMonthBeyond: number;
}

export interface SocialSecurityParams {
  year: number;
  retrieved: string;
  pia: PiaParams;
  earliestClaimingAge: number;
  latestCreditedAge: number;
  earlyReduction: EarlyReduction;
  normalRetirementAge: (birthYear: number) => AgeYearsMonths;
  delayedCreditPercentPerYear: (birthYear: number) => number;
}

type ThroughYearRow<T> = { throughYear: number | null } & T;

function byBirthYear<T>(rows: readonly ThroughYearRow<T>[], where: string): (birthYear: number) => ThroughYearRow<T> {
  if (rows.length === 0) throw new Error(`${where}: no rows`);
  let last = -Infinity;
  for (const r of rows) {
    if (r.throughYear !== null) {
      if (!(r.throughYear > last)) throw new Error(`${where}: throughYear must ascend`);
      last = r.throughYear;
    }
  }
  if (rows[rows.length - 1]?.throughYear !== null) throw new Error(`${where}: the last row must be open-ended (null)`);
  return (birthYear: number) => {
    for (const r of rows) if (r.throughYear === null || birthYear <= r.throughYear) return r;
    throw new Error(`${where}: no row for birth year ${birthYear}`);
  };
}

let cache: SocialSecurityParams | undefined;

export function loadSocialSecurityParams(year = 2026): SocialSecurityParams {
  if (year !== 2026) throw new Error(`No Social Security parameters for ${year}. Add data/social-security/${year}.json first.`);
  if (cache) return cache;
  const raw = ss2026;

  const pia = raw.pia;
  if (pia.rates.length !== pia.bendPointsMonthly.length + 1) throw new Error("PIA formula needs one more rate than bend points");
  for (let i = 1; i < pia.bendPointsMonthly.length; i++) {
    const a = pia.bendPointsMonthly[i - 1];
    const b = pia.bendPointsMonthly[i];
    if (a === undefined || b === undefined || !(b > a)) throw new Error("PIA bend points must ascend");
  }
  for (const r of pia.rates) if (!(r >= 0 && r <= 100)) throw new Error("PIA rates must be percents");

  const nra = byBirthYear(raw.normalRetirementAge.byBirthYear, "normal retirement age");
  const drc = byBirthYear(raw.claiming.delayedCredit.byBirthYear, "delayed retirement credit");

  cache = Object.freeze({
    year: raw._meta.year,
    retrieved: raw._meta.retrieved,
    pia: {
      bendPointsMonthly: pia.bendPointsMonthly,
      rates: pia.rates,
      roundDownToCents: pia.roundDownToCents,
      averagingYears: pia.averagingYears,
      eligibilityAge: pia.eligibilityAge,
    },
    earliestClaimingAge: raw.claiming.earliestAge,
    latestCreditedAge: raw.claiming.latestCreditedAge,
    earlyReduction: {
      firstMonths: raw.claiming.earlyReduction.firstMonths,
      ratePerMonthFirst: raw.claiming.earlyReduction.ratePerMonthFirst,
      ratePerMonthBeyond: raw.claiming.earlyReduction.ratePerMonthBeyond,
    },
    normalRetirementAge: (birthYear: number) => {
      const r = nra(birthYear);
      return { years: r.years, months: r.months };
    },
    delayedCreditPercentPerYear: (birthYear: number) => drc(birthYear).percentPerYear,
  });
  return cache;
}
