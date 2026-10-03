/**
 * The price card (docs/levels/level-3-life-plans.md sections 3, 4, and 6,
 * decisions G1 and G2): every dream's cost in time, its true amount, and its
 * best timing, with markers from events already in the plan. Pure.
 */

import blocksFile from "../../data/scenario-blocks.json";
import type { GoalBucket, Household } from "../model";
import { resolveAssumptions } from "../model";
import { milestones } from "../levels/milestones";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { withGoals } from "./goals";

export interface TimingPoint {
  startAge: number;
  /** Years the FI date moves with the dream at this age (positive means later), or null when never funded. */
  costYears: number | null;
  /** Events already in the plan at or just before this age. */
  markers: string[];
}

export interface PriceCard {
  goalId: string;
  name: string;
  cost: number;
  /** 1. The cost in time: years the FI date moves at the chosen age. */
  costYears: number | null;
  /** 2. The true amount: the cost grown at the likely return to the stated age, in today's dollars. */
  trueAmount: number;
  trueAmountAge: number;
  /** 3. The other side of the trade is the person's to weigh; the card asks. */
  otherSide: string;
  /** 4. The best timing: the curve across the window and the cheapest age. */
  curve: TimingPoint[];
  cheapestAge: number | null;
  cheapestCostYears: number | null;
  /** The milestones the dream moves and by how much (section 6). */
  milestonesMoved: { label: string; from: number | null; to: number | null }[];
  waysToLower: string[];
}

/** The true amount: cost grown at the likely blended real return from the start age to the stated age (acceptance test 2). */
export function trueAmount(cost: number, fromAge: number, toAge: number, likelyBlendedReturnPercent: number): number {
  return cost * Math.pow(1 + likelyBlendedReturnPercent / 100, Math.max(0, toAge - fromAge));
}

/** Events already in the plan, by age: debt payoffs, milestones, income changes, other dreams ending. */
export function planMarkers(h: Household, deps: Deps = defaultDeps()): { age: number; label: string }[] {
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const r = findFiDate(requireComplete(h), band, deps);
  const out: { age: number; label: string }[] = [];
  const debts = r.timeline.accounts.filter((a) => a.kind === "debt");
  for (const d of debts) {
    const paid = r.timeline.rows.find((row, i) => i > 0 && (row.balances[d.id] ?? 0) <= 0 && (r.timeline.rows[i - 1]!.balances[d.id] ?? 0) > 0);
    if (paid) out.push({ age: paid.age, label: `${d.label} paid off` });
  }
  for (const m of milestones(h, deps)) if (m.age !== null && !m.comingSoon && (m.id === "coast" || m.id === "lean" || m.id === "fi")) out.push({ age: m.age, label: m.label });
  if (h.self.income.kind === "rows") {
    const birthYear = Number((h.self.birthDate?.value ?? "2000-01").slice(0, 4));
    for (const s of h.self.income.rows) {
      if (s.start) out.push({ age: Number(s.start.slice(0, 4)) - birthYear, label: `${s.label ?? s.type} starts` });
      if (s.end.kind === "date") out.push({ age: Number(s.end.date.slice(0, 4)) - birthYear, label: `${s.label ?? s.type} ends` });
      if (s.end.kind === "age") out.push({ age: s.end.age, label: `${s.label ?? s.type} ends` });
    }
  }
  for (const g of h.goals) if (g.cadence === "annual") out.push({ age: g.endAge + 1, label: `${g.name} ends` });
  return out.sort((a, b) => a.age - b.age);
}

/** The price card for one goal (spec section 3), with the timing curve across its window (section 4). */
export function priceCard(h: Household, goal: GoalBucket, deps: Deps = defaultDeps(), windowYears = 10): PriceCard {
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const others = h.goals.filter((g) => g.id !== goal.id);
  const base = findFiDate(requireComplete(withGoals(h, others)), band, deps);
  const blended = 0.9 * band.returns.stocks + 0.1 * band.returns.bonds;
  const markers = planMarkers(h, deps);
  const costAt = (age: number): number | null => {
    const r = findFiDate(requireComplete(withGoals(h, [...others, goal], { [goal.id]: age })), band, deps, base.retirementYear ?? undefined);
    return base.retirementYear === null || r.retirementYear === null ? null : r.retirementYear - base.retirementYear;
  };
  const ageNow = Number(h.asOf.slice(0, 4)) - Number((h.self.birthDate?.value ?? "2000-01").slice(0, 4));
  const first = Math.max(ageNow, goal.startAge);
  const curve: TimingPoint[] = [];
  for (let age = first; age <= first + windowYears; age++) {
    curve.push({ startAge: age, costYears: costAt(age), markers: markers.filter((m) => m.age === age).map((m) => m.label) });
  }
  const chosen = curve.find((p) => p.startAge === Math.max(first, goal.startAge)) ?? curve[0]!;
  const dated = curve.filter((p) => p.costYears !== null);
  const cheapest = dated.length ? dated.reduce((a, b) => (b.costYears! < a.costYears! ? b : a)) : null;
  const toAge = blocksFile.dreams.trueAmountAge;
  const cost = goal.cadence === "oneOff" ? goal.cost.value : goal.cost.value * Math.max(1, goal.endAge - goal.startAge + 1);
  const baseMilestones = milestones(withGoals(h, others), deps);
  const withMilestones = milestones(withGoals(h, [...others, goal]), deps);
  const moved = baseMilestones
    .filter((m) => !m.comingSoon && (m.id === "coast" || m.id === "fi" || m.id === "walkAway" || m.id === "lean"))
    .map((m) => ({ label: m.label, from: m.age, to: withMilestones.find((x) => x.id === m.id)?.age ?? null }));
  const ways: string[] = [];
  if (cheapest && chosen.costYears !== null && cheapest.costYears! < chosen.costYears) ways.push(`Shift the timing to ${cheapest.startAge}: ${cheapest.costYears} ${cheapest.costYears === 1 ? "year" : "years"} instead of ${chosen.costYears}.`);
  if (goal.cadence === "oneOff" && goal.cost.value > 2000) ways.push("Split the dream in two, a smaller version now and the rest later.");
  ways.push("Pair it with a side hustle block that pays for it.");
  return {
    goalId: goal.id,
    name: goal.name,
    cost,
    costYears: chosen.costYears,
    trueAmount: trueAmount(cost, goal.startAge, toAge, blended),
    trueAmountAge: toAge,
    otherSide: "What is this worth to you: the memory, the years you'll look back on it, the timing that only exists now? The app does not put a dollar value on that. What would you rather have?",
    curve,
    cheapestAge: cheapest?.startAge ?? null,
    cheapestCostYears: cheapest?.costYears ?? null,
    milestonesMoved: moved,
    waysToLower: ways,
  };
}
