/**
 * Historical backtests (docs/m6-spec.md section 2.2): the whole plan replayed
 * from every start year in the return series, with that year's and the
 * following years' real returns in place of the band's single return. Pure.
 * The series comes from data/returns-history.json and is flagged while unverified.
 */

import history from "../../data/returns-history.json";
import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand, type BandNumbers } from "../projection/bands";
import { defaultDeps, isFunded, runFor, type Deps } from "../projection/fi";
import { requireComplete, type CompleteHousehold, type TimelineOptions, type TimelineResult } from "../projection/timeline";

export interface ReturnYear {
  year: number;
  stocks: number;
  bonds: number;
  cash: number;
  inflation: number;
}

export const RETURN_SERIES: readonly ReturnYear[] = history.series;
export const SERIES_SOURCE = { source: history._meta.source, url: history._meta.url, lastVerified: history._meta.lastVerified, unverified: history._meta.lastVerified === null, years: [history.series[0]!.year, history.series[history.series.length - 1]!.year] as [number, number] };

/** Real returns by plan year for a start year in the series, with the band's return where the series runs out. */
export function returnsFromStart(startYear: number, firstPlanYear: number, lastPlanYear: number, band: BandNumbers): { byYear: Record<number, { stocks: number; bonds: number; cash: number }>; filledYears: number } {
  const byYear: Record<number, { stocks: number; bonds: number; cash: number }> = {};
  const first = RETURN_SERIES[0]!.year;
  let filled = 0;
  for (let y = firstPlanYear; y <= lastPlanYear; y++) {
    const idx = startYear - first + (y - firstPlanYear);
    const row = RETURN_SERIES[idx];
    if (row) byYear[y] = { stocks: row.stocks, bonds: row.bonds, cash: row.cash };
    else {
      byYear[y] = { ...band.returns };
      filled += 1;
    }
  }
  return { byYear, filledYears: filled };
}

export interface StartResult {
  startYear: number;
  funded: boolean;
  /** Age the shortfall began, when not funded. */
  shortfallAge: number | null;
  estate: number;
  filledYears: number;
  /** Lowest spending year under a spending rule, as a share of planned (1 when no rule). */
  lowestSpendingShare: number;
}

export interface Backtest {
  retirementYear: number;
  starts: StartResult[];
  successRate: number;
  worstStarts: StartResult[];
  medianEstate: number;
  worstEstate: number;
  startsFilled: number;
  series: typeof SERIES_SOURCE;
  flags: string[];
}

export interface BacktestOptions {
  /** Starts need at least this many years of real history; the rest of the horizon is filled with the band. */
  minHistoryYears?: number;
  /** Called once per start to make the spending rule, so it can keep state. */
  spendingAdjuster?: () => NonNullable<TimelineOptions["spendingAdjuster"]>;
  deps?: Deps;
}

/** Replays the plan from every start year that leaves at least `minHistoryYears` of history, at one retirement year. */
export function backtest(h: Household, retirementYear: number, options: BacktestOptions = {}): Backtest {
  const deps = options.deps ?? defaultDeps();
  const hh: CompleteHousehold = requireComplete(h);
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const year0 = Number(hh.asOf.slice(0, 4));
  const birthYear = Number(hh.birthDate.slice(0, 4));
  const lastYear = birthYear + band.planToAge;
  const horizon = lastYear - year0 + 1;
  const minHistory = options.minHistoryYears ?? Math.min(30, horizon);
  const lastStart = RETURN_SERIES[RETURN_SERIES.length - 1]!.year - minHistory + 1;
  const starts: StartResult[] = [];
  for (const row of RETURN_SERIES) {
    if (row.year > lastStart) break;
    const { byYear, filledYears } = returnsFromStart(row.year, year0, lastYear, band);
    const adjuster = options.spendingAdjuster?.();
    let lowest = 1;
    const tracking: TimelineOptions["spendingAdjuster"] | undefined = adjuster
      ? (ctx) => {
          const f = adjuster(ctx);
          lowest = Math.min(lowest, f);
          return f;
        }
      : undefined;
    const t: TimelineResult = runFor(hh, band, { ...deps, returnsByYear: byYear, ...(tracking ? { spendingAdjuster: () => tracking } : {}) }, retirementYear);
    starts.push({ startYear: row.year, funded: isFunded(t), shortfallAge: t.firstShortfall?.age ?? null, estate: t.estate, filledYears, lowestSpendingShare: lowest });
  }
  const funded = starts.filter((s) => s.funded).length;
  const estates = starts.map((s) => s.estate).sort((a, b) => a - b);
  const flags: string[] = [];
  if (SERIES_SOURCE.unverified) flags.push("The return series behind this backtest has not been verified against its source yet, so these results are illustrative until it is.");
  const filled = starts.filter((s) => s.filledYears > 0).length;
  if (filled) flags.push(`${filled} of ${starts.length} starts ran out of history before plan-to age; the missing years use the likely band's return.`);
  return {
    retirementYear,
    starts,
    successRate: starts.length ? funded / starts.length : 0,
    worstStarts: starts.filter((s) => !s.funded).sort((a, b) => (a.shortfallAge ?? 999) - (b.shortfallAge ?? 999)),
    medianEstate: estates.length ? estates[Math.floor(estates.length / 2)]! : 0,
    worstEstate: estates[0] ?? 0,
    startsFilled: filled,
    series: SERIES_SOURCE,
    flags,
  };
}

/** The earliest retirement year whose backtest success rate reaches the threshold, searching up from a first year. */
export function sturdyFiYear(h: Household, fromYear: number, thresholdPercent: number, options: BacktestOptions = {}): { year: number | null; age: number | null; successRate: number | null; tested: number } {
  const hh = requireComplete(h);
  const birthYear = Number(hh.birthDate.slice(0, 4));
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const lastYear = birthYear + band.planToAge;
  let tested = 0;
  for (let y = fromYear; y <= lastYear; y++) {
    const b = backtest(h, y, options);
    tested += 1;
    if (b.successRate * 100 >= thresholdPercent) return { year: y, age: y - birthYear, successRate: b.successRate, tested };
  }
  return { year: null, age: null, successRate: null, tested };
}
