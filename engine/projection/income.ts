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
  /** Taxable income with no payroll tax: the "other" type. */
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
  return type === "rental" ? "other" : type;
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

export function streamActive(stream: IncomeStream, ctx: YearContext): boolean {
  if (stream.start && ctx.year < parseYearMonth(stream.start).year) return false;
  return !endReached(stream.end, ctx);
}

/** Real growth rate (percent) for a stream: its own override, else the band default for its type. */
export function streamGrowth(stream: IncomeStream, band: BandNumbers): number {
  if (stream.growth) return pickBand(stream.growth.value, band.band === "best" ? "high" : band.band === "worst" ? "low" : "likely");
  return band.incomeGrowth[growthTypeFor(stream.type)];
}

export function incomeForYear(streams: readonly IncomeStream[], ctx: YearContext, band: BandNumbers): YearIncome {
  const out: YearIncome = { streams: [], wages: 0, selfEmploymentNet: 0, otherTaxable: 0, nonTaxable: 0, grossTotal: 0, netTotal: 0 };
  for (const s of streams) {
    if (!streamActive(s, ctx)) continue;
    const g = streamGrowth(s, band) / 100;
    const gross = s.grossAnnual.value * Math.pow(1 + g, ctx.t);
    const expenses = s.businessExpensesAnnual?.value ?? 0;
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
      case "rental":
      case "other":
        out.otherTaxable += gross;
        break;
    }
  }
  return out;
}
