/**
 * Income for one year (engine spec section 3, step 2). Each stream is grown by
 * its own real rate and stops on its end rule.
 */

import type { EndRule, IncomeGrowthType, IncomeStream, IncomeType } from "../model";
import { parseYearMonth, pickBand } from "../model";
import type { BandNumbers } from "./bands";

export interface YearContext {
  /** Calendar year. */
  year: number;
  /** Years since year 0. Growth compounds on this. */
  t: number;
  /** Age at the end of the year. */
  age: number;
  /** The first year with no work income. */
  retirementYear: number;
  /** The fraction of the year this row covers: 1, or the stub fraction in year 0. Defaults to 1. */
  fraction?: number;
  /** The first month this row covers: 1, or the plan month in year 0. Defaults to 1. */
  startMonth?: number;
}

export interface StreamYear {
  id: string;
  type: IncomeType;
  /** Gross for the year before any proration. */
  gross: number;
  /** Self-employment: gross minus business expenses. Otherwise equal to gross. */
  net: number;
}

export interface YearIncome {
  streams: StreamYear[];
  /** W-2 style wages: salary and hourly. Subject to FICA. */
  wages: number;
  /** Net self-employment income: self-employed and side gigs. Subject to self-employment tax. */
  selfEmploymentNet: number;
  /** Taxable income with no payroll tax: unemployment benefits and the "other" type. */
  otherTaxable: number;
  /** Not taxed: allowance. */
  nonTaxable: number;
  /** Everything, before taxes and deductions. */
  grossTotal: number;
  /** Cash actually coming in: gross less business expenses on self-employment. */
  netTotal: number;
}

/** The growth type an income type looks up in the assumption set. Rental (Later) uses "other". */
export function growthTypeFor(type: IncomeType): IncomeGrowthType {
  return type === "rental" || type === "unemployment" ? "other" : type;
}

export function endReached(end: EndRule | undefined, ctx: YearContext): boolean {
  if (!end) return false;
  switch (end.kind) {
    case "retirement":
      return ctx.year >= ctx.retirementYear;
    case "age":
      return ctx.age >= end.age;
    case "date":
      return ctx.year >= parseYearMonth(end.date).year;
  }
}

/**
 * The share of this row's period a stream is paid for. A stream that ends on a date is paid
 * through that month, so in its last year it counts only the months it is paid. Everything
 * else is all or nothing.
 */
export function streamShare(stream: IncomeStream, ctx: YearContext): number {
  if (stream.start && ctx.year < parseYearMonth(stream.start).year) return 0;
  if (stream.end.kind !== "date") return endReached(stream.end, ctx) ? 0 : 1;
  const end = parseYearMonth(stream.end.date);
  if (ctx.year < end.year) return 1;
  if (ctx.year > end.year) return 0;
  const startMonth = ctx.startMonth ?? 1;
  const monthsInPeriod = 12 * (ctx.fraction ?? 1);
  const monthsPaid = end.month - startMonth + 1;
  return Math.max(0, Math.min(1, monthsPaid / monthsInPeriod));
}

export function streamActive(stream: IncomeStream, ctx: YearContext): boolean {
  return streamShare(stream, ctx) > 0;
}

/** Real growth rate (percent) for a stream: its own override, else the band default for its type. */
export function streamGrowth(stream: IncomeStream, band: BandNumbers): number {
  if (stream.growth) return pickBand(stream.growth.value, band.band === "best" ? "high" : band.band === "worst" ? "low" : "likely");
  return band.incomeGrowth[growthTypeFor(stream.type)];
}

export function incomeForYear(streams: readonly IncomeStream[], ctx: YearContext, band: BandNumbers): YearIncome {
  const out: YearIncome = { streams: [], wages: 0, selfEmploymentNet: 0, otherTaxable: 0, nonTaxable: 0, grossTotal: 0, netTotal: 0 };
  for (const s of streams) {
    const share = streamShare(s, ctx);
    if (share <= 0) continue;
    const g = streamGrowth(s, band) / 100;
    const gross = s.grossAnnual.value * Math.pow(1 + g, ctx.t) * share;
    const expenses = (s.businessExpensesAnnual?.value ?? 0) * share;
    const isSe = s.type === "selfEmployed" || s.type === "sideGig";
    const net = isSe ? Math.max(0, gross - expenses) : gross;
    out.streams.push({ id: s.id, type: s.type, gross, net });
    out.grossTotal += gross;
    out.netTotal += net;
    switch (s.type) {
      case "salary":
      case "hourly":
        out.wages += gross;
        break;
      case "selfEmployed":
      case "sideGig":
        out.selfEmploymentNet += net;
        break;
      case "allowance":
        out.nonTaxable += gross;
        break;
      case "unemployment":
      case "rental":
      case "other":
        out.otherTaxable += gross;
        break;
    }
  }
  return out;
}
