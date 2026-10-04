/**
 * Progress history (docs/history-spec.md): one snapshot a day of the plan's
 * headline numbers, and the trend sentence read back from them. Pure.
 */

import type { Household, IsoDate, ProgressSnapshot } from "../model";
import type { ProjectionResult } from "../projection/fi";

/** The list never grows past this; the first snapshot is always kept as the starting point. */
export const HISTORY_CAP = 400;
/** The trend compares against the earliest snapshot at least this many days older than the latest. */
export const TREND_MIN_DAYS = 28;

/** Builds today's snapshot from a projection the result screen already ran. */
export function snapshotFrom(h: Household, projection: ProjectionResult, today: IsoDate): ProgressSnapshot {
  const accounts = h.accounts.kind === "rows" ? h.accounts.rows : [];
  const assets = accounts.filter((a) => a.side === "asset").reduce((s, a) => s + (a.balance.value ?? 0), 0);
  const debts = accounts.filter((a) => a.side === "debt").reduce((s, a) => s + (a.balance.value ?? 0), 0);
  const likely = projection.bands.likely;
  const full = likely.timeline.rows.find((r) => r.fraction === 1 && !r.retired) ?? null;
  const contributions = full ? Object.values(full.contributions).reduce((s, v) => s + v, 0) - full.employerMatch : 0;
  const savingsRatePercent = full && full.takeHome > 0 ? (contributions / full.takeHome) * 100 : null;
  const spending = h.spending.kind === "rows" ? h.spending.rows.reduce((s, r) => s + r.annual.value, 0) : 0;
  return {
    date: today,
    fiYear: { best: projection.bands.best.retirementYear, likely: likely.retirementYear, worst: projection.bands.worst.retirementYear },
    fiAge: { likely: likely.fiAge },
    netWorth: assets - debts,
    savingsRatePercent,
    fiNumber: 25 * spending,
    conventions: likely.timeline.conventions,
  };
}

/** Adds a snapshot: one per date (the later run wins), sorted by date, capped with the first kept. */
export function addSnapshot(history: readonly ProgressSnapshot[], snap: ProgressSnapshot): ProgressSnapshot[] {
  const kept = history.filter((s) => s.date !== snap.date);
  kept.push(snap);
  kept.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (kept.length <= HISTORY_CAP) return kept;
  const first = kept[0]!;
  return [first, ...kept.slice(kept.length - (HISTORY_CAP - 1))];
}

/** Whole days from a to b (ISO dates). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** The snapshot to compare the latest against: the earliest one at least TREND_MIN_DAYS older, else the earliest of all. */
export function trendBaseline(history: readonly ProgressSnapshot[]): ProgressSnapshot | null {
  if (history.length < 2) return null;
  const latest = history[history.length - 1]!;
  const old = history.filter((s) => daysBetween(s.date, latest.date) >= TREND_MIN_DAYS);
  return (old.length ? old[0] : history[0]) ?? null;
}

const monthName = (iso: IsoDate): string => new Date(`${iso}T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
const money = (n: number): string => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const yearsWord = (n: number): string => (n === 1 ? "a year" : `${n} years`);

/** One sentence on what moved between two snapshots. Describes; never judges. */
export function trendBetween(from: ProgressSnapshot, to: ProgressSnapshot): string {
  const parts: string[] = [];
  const a = from.fiYear.likely;
  const b = to.fiYear.likely;
  if (a === null && b === null) parts.push("your likely plan is still not funded by the plan-to age");
  else if (a === null) parts.push("your likely plan is now funded");
  else if (b === null) parts.push("your likely plan is no longer funded by the plan-to age");
  else if (a === b) parts.push("your likely FI date has not moved");
  else parts.push(`your likely FI date moved ${yearsWord(Math.abs(b - a))} ${b < a ? "earlier" : "later"}`);
  const dNw = to.netWorth - from.netWorth;
  parts.push(Math.abs(dNw) < 100 ? "your net worth held steady" : `your net worth ${dNw > 0 ? "rose" : "fell"} ${money(dNw)}`);
  if (from.savingsRatePercent !== null && to.savingsRatePercent !== null && Math.abs(to.savingsRatePercent - from.savingsRatePercent) >= 1) {
    parts.push(`your savings rate went from ${Math.round(from.savingsRatePercent)}% to ${Math.round(to.savingsRatePercent)}%`);
  }
  const since = daysBetween(from.date, to.date) <= 45 ? `Since ${monthName(from.date)} ${Number(from.date.slice(8, 10))}` : `Since ${monthName(from.date)} ${from.date.slice(0, 4)}`;
  const body = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]!}`;
  return `${since}, ${body}.`;
}

/** The sentence for a history: the first-visit line, or the trend from the baseline to the latest. */
export function trendSentence(history: readonly ProgressSnapshot[]): string {
  if (history.length === 0) return "No snapshots yet.";
  const base = trendBaseline(history);
  if (!base) return "This is the first snapshot of your plan. Come back to see how it moves.";
  return trendBetween(base, history[history.length - 1]!);
}
