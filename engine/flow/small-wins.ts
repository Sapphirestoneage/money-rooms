/**
 * Small wins (docs/m3-spec.md section 10): everything under the clearly-trivial
 * line, with a running total and a promotion to the main path when the open
 * wins add up to something material. Definitions from data/small-wins.json.
 */

import winsFile from "../../data/small-wins.json";
import type { Household } from "../model";

export type WinState = "open" | "done" | "notForMe" | "later";

export interface SmallWin {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  /** Dollars a year, low and high, personalized where possible. */
  estimate: [number, number];
  minutes: number;
  note?: string;
  state: WinState;
}

interface WinDefinition {
  id: string;
  category: string;
  title: string;
  estimate: [number, number];
  minutes: number;
  note?: string;
  personalize?: { spendingCategory?: string; share?: [number, number]; cashBalance?: boolean; ratePointsGained?: number; spendingShare?: number };
}

function spendingIn(h: Household, category: string): number {
  if (h.spending.kind !== "rows") return 0;
  return h.spending.rows.filter((r) => r.category === category).reduce((s, r) => s + r.annual.value, 0);
}

/** Every win with its estimate personalized to the household's numbers where the data allows. */
export function smallWins(h: Household, states: Record<string, WinState> = {}): SmallWin[] {
  const categories = new Map(winsFile.categories.map((c) => [c.id, c.label]));
  const totalSpending = h.spending.kind === "rows" ? h.spending.rows.reduce((s, r) => s + r.annual.value, 0) : 0;
  const cash = h.accounts.kind === "rows" ? h.accounts.rows.filter((a) => a.side === "asset" && a.taxBucket.value === "cash").reduce((s, a) => s + (a.balance.value ?? 0), 0) : 0;
  return (winsFile.wins as unknown as WinDefinition[]).map((w) => {
    let estimate: [number, number] = [...w.estimate] as [number, number];
    const p = w.personalize;
    if (p?.spendingCategory && p.share) {
      const base = spendingIn(h, p.spendingCategory);
      if (base > 0) estimate = [Math.round(base * p.share[0]), Math.round(base * p.share[1])];
    } else if (p?.cashBalance && p.ratePointsGained && cash > 0) {
      estimate = [Math.round(cash * p.ratePointsGained * 0.5), Math.round(cash * p.ratePointsGained)];
    } else if (p?.spendingShare && totalSpending > 0) {
      estimate = [Math.round(totalSpending * p.spendingShare * 0.5), Math.round(totalSpending * p.spendingShare)];
    }
    return { id: w.id, category: w.category, categoryLabel: categories.get(w.category) ?? w.category, title: w.title, estimate, minutes: w.minutes, ...(w.note ? { note: w.note } : {}), state: states[w.id] ?? "open" };
  });
}

export interface SmallWinsTotal {
  doneCount: number;
  /** Dollars a year from the wins marked done, at the midpoint of each estimate. */
  doneAnnual: number;
  /** Dollars a year still open (not done, not "not for me"), at the midpoint. */
  openAnnual: number;
  /** Months of FI date the done wins are worth, when the materiality engine has run. */
  doneMonths: number | null;
  /** True when the open wins add up past the material line, so a card appears on the main path. */
  promote: boolean;
}

export function smallWinsTotal(wins: readonly SmallWin[], materialDollars: number | null, dollarsPerMonth: number | null): SmallWinsTotal {
  const mid = (w: SmallWin) => (w.estimate[0] + w.estimate[1]) / 2;
  const done = wins.filter((w) => w.state === "done");
  const open = wins.filter((w) => w.state === "open" || w.state === "later");
  const doneAnnual = done.reduce((s, w) => s + mid(w), 0);
  const openAnnual = open.reduce((s, w) => s + mid(w), 0);
  // A dollar a year of spending cut is worth about 25 dollars of FI number (the 4% rule), the same scale the material line uses.
  return {
    doneCount: done.length,
    doneAnnual,
    openAnnual,
    doneMonths: dollarsPerMonth ? (doneAnnual * 25) / dollarsPerMonth : null,
    promote: materialDollars !== null && openAnnual * 25 >= materialDollars,
  };
}
