/**
 * Date helpers for YYYY-MM and YYYY-MM-DD strings (data dictionary 2.6, 3.1).
 * Ages are never stored. They are computed here from birth date and a point in time.
 */

import type { IsoDate, YearMonth } from "./types";

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isYearMonth(s: string): s is YearMonth {
  return YEAR_MONTH.test(s);
}

export function isIsoDate(s: string): s is IsoDate {
  return ISO_DATE.test(s);
}

export function parseYearMonth(ym: YearMonth): { year: number; month: number } {
  const match = YEAR_MONTH.exec(ym);
  if (!match) throw new Error(`Not a YYYY-MM value: ${ym}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** The month and year part of a full date. */
export function yearMonthOf(date: IsoDate): YearMonth {
  if (!isIsoDate(date)) throw new Error(`Not a YYYY-MM-DD value: ${date}`);
  return date.slice(0, 7);
}

/** Whole months from one month to another. Negative if `to` is earlier. */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
  const a = parseYearMonth(from);
  const b = parseYearMonth(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** Age in whole years at a given month. */
export function ageInYears(birthDate: YearMonth, at: YearMonth): number {
  return Math.floor(monthsBetween(birthDate, at) / 12);
}

/** Age in whole years on December 31 of a calendar year. Used by the annual loop. */
export function ageAtYearEnd(birthDate: YearMonth, year: number): number {
  return ageInYears(birthDate, `${year}-12`);
}

/**
 * The fraction of the calendar year remaining from a month through December,
 * counting that month in full (decision E8). October gives 3/12.
 */
export function stubFraction(asOf: IsoDate): number {
  const { month } = parseYearMonth(yearMonthOf(asOf));
  return (12 - month + 1) / 12;
}

/** The month n months after a given month. */
export function addMonths(ym: YearMonth, n: number): YearMonth {
  const { year, month } = parseYearMonth(ym);
  const index = year * 12 + (month - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Whole weeks from a date through the end of a month. Zero if that month has already ended. For display. */
export function weeksThroughEndOf(from: IsoDate, through: YearMonth): number {
  if (!isIsoDate(from)) throw new Error(`Not a YYYY-MM-DD value: ${from}`);
  const end = parseYearMonth(through);
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  // Day 0 of the next month is the last day of this one.
  const last = Date.UTC(end.year, end.month, 0);
  const days = (last - start) / 86_400_000 + 1;
  return Math.max(0, Math.round(days / 7));
}
