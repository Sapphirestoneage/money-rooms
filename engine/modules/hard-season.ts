/**
 * Hard season (dictionary 9.18, decision A15; module data/modules/hard-season.json, beta). The engine
 * suggests the setting from the numbers and, while it is on, says what comes first: stability items,
 * runway and the staircase, with a flexible family loan payment ahead of any spending cut. It never
 * turns the setting on. Pure.
 */

import type { Household } from "../model";
import { firstYearGapAnnual, runway, shockTests, staircase } from "../levels/resilience";

export interface HardSeasonSuggestion {
  suggested: boolean;
  reasons: string[];
}

export interface StabilityItem {
  id: string;
  label: string;
  /** One sentence with the numbers in it. */
  sentence: string;
  /** Dollars a month it frees or protects, when known. */
  monthly: number | null;
  effortMinutes: number;
}

export interface HardSeasonView {
  on: boolean;
  suggestion: HardSeasonSuggestion;
  runwayMonths: number;
  staircaseSteps: { label: string; monthly: number }[];
  items: StabilityItem[];
  sentences: string[];
}

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** Whether the numbers point to a hard season: a debt that weighs 4 or more, or a shock that leaves under three months of runway. */
export function hardSeasonSuggestion(h: Household, options: { runShocks?: boolean } = {}): HardSeasonSuggestion {
  const reasons: string[] = [];
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.side === "debt" && (a.stress?.value ?? 0) >= 4) reasons.push(`${a.name?.value ?? a.preset} weighs ${a.stress!.value} of 5 on you.`);
    }
  }
  if (options.runShocks !== false) {
    try {
      for (const s of shockTests(h)) if (s.runwayMonthsAfter < 3) reasons.push(s.runwayMonthsAfter < 0.05 ? `${s.label} would leave no runway at all.` : `${s.label} would leave ${s.runwayMonthsAfter.toFixed(1)} months of runway.`);
    } catch {
      // Shocks need a complete household; without one, the stress ratings alone decide.
    }
  }
  return { suggested: reasons.length > 0, reasons };
}

/** The stability items, in the order they come first: the flexible payment, then the reserve, then the staircase. Spending cuts are never first. */
export function stabilityItems(h: Household): StabilityItem[] {
  const items: StabilityItem[] = [];
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.side !== "debt") continue;
      const flex = a.paymentFlexibility?.value;
      if (flex === "pausable" || flex === "flexible") {
        const monthly = a.actualPaymentAnnual.value / 12;
        items.push({
          id: `loan.${a.id}.pause`,
          label: `${flex === "pausable" ? "Pause" : "Reduce"} the ${a.name?.value ?? "family loan"} payment for now`,
          sentence: `The ${money(monthly)} a month to ${a.name?.value ?? "the family loan"} can ${flex === "pausable" ? "pause" : "come down"} without a penalty; that is ${money(monthly)} a month of breathing room while things are hard.`,
          monthly,
          effortMinutes: 15,
        });
      }
    }
  }
  let gap: number | null = null;
  try {
    gap = firstYearGapAnnual(h);
  } catch {
    gap = null;
  }
  if (gap !== null && gap < -1) items.push({ id: "gap", label: "Know the size of the gap", sentence: `This year runs about ${money(-gap)} short before any saving, about ${money(-gap / 12)} a month. The items here come before any spending cut.`, monthly: null, effortMinutes: 1 });
  const r = runway(h);
  items.push({ id: "runway", label: "Know your runway", sentence: `At full spending the cash on hand lasts about ${r.totalMonths.toFixed(1)} months.`, monthly: null, effortMinutes: 2 });
  const steps = staircase(h);
  if (steps.length) items.push({ id: "staircase", label: "The spending staircase", sentence: `If income stops, each step down the staircase stretches the runway: ${steps.map((s) => s.label).join(", ")}.`, monthly: null, effortMinutes: 3 });
  return items;
}

export function hardSeasonView(h: Household): HardSeasonView {
  const on = h.hardSeason?.value === true;
  const suggestion = hardSeasonSuggestion(h, { runShocks: !on });
  const r = runway(h);
  const steps = staircase(h).map((s) => ({ label: s.label, monthly: s.monthly }));
  const items = stabilityItems(h);
  const sentences = [
    ...(on ? ["Hard season is on: the plan's nudges are paused, and stability comes first."] : suggestion.suggested ? ["The numbers look heavy right now. Hard season mode puts stability first and pauses the rest; it is here if it helps."] : []),
    ...suggestion.reasons,
    ...items.map((i) => i.sentence),
  ];
  return { on, suggestion, runwayMonths: r.totalMonths, staircaseSteps: steps, items, sentences };
}
