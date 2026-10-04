/**
 * The Social Security estimate (data dictionary 4.4, engine spec section 3 step 7).
 * Earnings record in, annual benefit out. Every parameter comes from
 * data/social-security/<year>.json. All dollars are real (today's).
 */

import type { AgeYearsMonths, SocialSecurityParams } from "../model";

/** Average indexed monthly earnings: the highest N years, averaged over N years, per month. */
export function averageIndexedMonthlyEarnings(annualCoveredEarnings: readonly number[], p: SocialSecurityParams): number {
  const n = p.pia.averagingYears;
  const top = [...annualCoveredEarnings].filter((e) => e > 0).sort((a, b) => b - a).slice(0, n);
  const total = top.reduce((s, e) => s + e, 0);
  return total / (n * 12);
}

/** The monthly benefit at full retirement age, from the bend-point formula. */
export function primaryInsuranceAmount(aime: number, p: SocialSecurityParams): number {
  if (!(aime > 0)) return 0;
  const { bendPointsMonthly, rates, roundDownToCents } = p.pia;
  let pia = 0;
  let lower = 0;
  for (let i = 0; i < rates.length; i++) {
    const rate = rates[i] ?? 0;
    const upper = bendPointsMonthly[i] ?? Infinity;
    if (aime <= lower) break;
    pia += ((Math.min(aime, upper) - lower) * rate) / 100;
    lower = upper;
  }
  const unit = roundDownToCents / 100;
  return Math.floor(pia / unit + 1e-9) * unit;
}

const toMonths = (a: AgeYearsMonths): number => a.years * 12 + a.months;

/**
 * The share of the primary insurance amount paid for a claiming age:
 * reduced before full retirement age, increased after it through the last credited age.
 */
export function claimingFactor(birthYear: number, claimingAge: AgeYearsMonths, p: SocialSecurityParams): number {
  const nra = toMonths(p.normalRetirementAge(birthYear));
  const earliest = p.earliestClaimingAge * 12;
  const latest = p.latestCreditedAge * 12;
  const claim = Math.min(Math.max(toMonths(claimingAge), earliest), latest);

  if (claim < nra) {
    const months = nra - claim;
    const { firstMonths, ratePerMonthFirst, ratePerMonthBeyond } = p.earlyReduction;
    const reduction = Math.min(months, firstMonths) * ratePerMonthFirst + Math.max(0, months - firstMonths) * ratePerMonthBeyond;
    return 1 - reduction / 100;
  }
  if (claim > nra) {
    const months = claim - nra;
    const perMonth = p.delayedCreditPercentPerYear(birthYear) / 12;
    return 1 + (months * perMonth) / 100;
  }
  return 1;
}

/** The spousal reduction schedule (rules registry ss.spousalAndSurvivor, spousal.reductionBeforeOwnFra). */
export interface SpousalReductionSchedule {
  firstMonths: number;
  ratePerMonthFirst: number;
  ratePerMonthBeyond: number;
}

/**
 * The share of the maximum spousal benefit paid for the claimant's own claiming age: reduced on the
 * spousal schedule before the claimant's full retirement age, never increased after it (no delayed credits).
 */
export function spousalFactor(birthYear: number, claimingAge: AgeYearsMonths, schedule: SpousalReductionSchedule, p: SocialSecurityParams): number {
  const nra = toMonths(p.normalRetirementAge(birthYear));
  const claim = Math.max(toMonths(claimingAge), p.earliestClaimingAge * 12);
  if (claim >= nra) return 1;
  const months = nra - claim;
  const reduction = Math.min(months, schedule.firstMonths) * schedule.ratePerMonthFirst + Math.max(0, months - schedule.firstMonths) * schedule.ratePerMonthBeyond;
  return Math.max(0, 1 - reduction / 100);
}

/** The survivor schedule (rules registry ss.spousalAndSurvivor, survivor). */
export interface SurvivorReductionSchedule {
  earliestAge: number;
  /** The share paid at the earliest age (71.5 means 71.5%). */
  shareAtEarliestAgePct: number;
  /** The survivor full retirement age table, which differs from the retirement one. */
  fullRetirementAgeTable: SurvivorFraTable;
}

export interface SurvivorFraTable {
  bornThrough1939: AgeYearsMonths;
  "1940": AgeYearsMonths;
  "1941": AgeYearsMonths;
  "1942": AgeYearsMonths;
  "1943": AgeYearsMonths;
  "1944": AgeYearsMonths;
  "1945to1956": AgeYearsMonths;
  "1957": AgeYearsMonths;
  "1958": AgeYearsMonths;
  "1959": AgeYearsMonths;
  "1960": AgeYearsMonths;
  "1961": AgeYearsMonths;
  "1962orLater": AgeYearsMonths;
}

/** The survivor full retirement age for a birth year (SSA survivor table: 66 for 1945 to 1956, 67 for 1962 or later). */
export function survivorFullRetirementAge(birthYear: number, table: SurvivorFraTable): AgeYearsMonths {
  if (birthYear <= 1939) return table.bornThrough1939;
  if (birthYear <= 1944) return table[String(birthYear) as "1940"];
  if (birthYear <= 1956) return table["1945to1956"];
  if (birthYear <= 1961) return table[String(birthYear) as "1957"];
  return table["1962orLater"];
}

/**
 * The share of the deceased worker's benefit a survivor receives for the survivor's own claiming age:
 * 100% at or after the survivor's full retirement age, reduced evenly by month down to the share at
 * the earliest age (71.5% at 60), never increased after full retirement age.
 */
export function survivorFactor(birthYear: number, claimingAge: AgeYearsMonths, schedule: SurvivorReductionSchedule, _p: SocialSecurityParams): number {
  const nra = toMonths(survivorFullRetirementAge(birthYear, schedule.fullRetirementAgeTable));
  const earliest = schedule.earliestAge * 12;
  const claim = Math.max(toMonths(claimingAge), earliest);
  if (claim >= nra || nra <= earliest) return 1;
  const reductionAtEarliest = 1 - schedule.shareAtEarliestAgePct / 100;
  return 1 - reductionAtEarliest * ((nra - claim) / (nra - earliest));
}

/** Annual real benefit: PIA, scaled by the claiming factor and the policy assumption (1.0 = full scheduled). */
export function annualBenefit(pia: number, factor: number, policy: number): number {
  return pia * factor * 12 * policy;
}

export interface EarningsRecordInput {
  /** Covered earnings the projection knows about, by calendar year (real dollars, already capped at the wage base). */
  projected: Readonly<Record<number, number>>;
  birthYear: number;
  /** The first projection year. Years before it are back-filled. */
  firstProjectionYear: number;
  /** The assumed real covered earnings for each back-filled year. */
  assumedPastAnnual: number;
  /** The age work is assumed to have started for back-filling. */
  startAge: number;
}

/**
 * M1 estimate of the earnings record: projected years, plus back-filled years
 * from the start age through the year before the projection, at an assumed amount.
 * Replaced by the person's ssa.gov record when they enter it.
 */
export function estimateEarningsRecord(input: EarningsRecordInput): number[] {
  const out: number[] = [];
  const firstWorkYear = input.birthYear + input.startAge;
  for (let y = firstWorkYear; y < input.firstProjectionYear; y++) out.push(input.assumedPastAnnual);
  for (const [year, earnings] of Object.entries(input.projected)) {
    if (Number(year) >= input.firstProjectionYear) out.push(earnings);
  }
  return out;
}
