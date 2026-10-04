/**
 * Goal buckets in the projection (data dictionary 5.1 layer 3, roadmap M5):
 * each goal is a dated cost with a priority. When the plan is short, dreams
 * are trimmed first, then wants; musts are protected. With a surplus, the
 * engine says which trimmed goals fit and when. Pure.
 */

import type { GoalBucket, Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, isFunded, runFor, type BandResult, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";

const clone = <T>(x: T): T => structuredClone(x);
const PRIORITY_ORDER = { dream: 0, want: 1, must: 2 } as const;

/** A copy of the household with the goals laid into spending as dated rows. */
export function withGoals(h: Household, goals: readonly GoalBucket[], startAgeOverride: Record<string, number> = {}): Household {
  const c = clone(h);
  if (c.spending.kind !== "rows") c.spending = { kind: "rows", rows: [] };
  const birthYear = Number((h.self.birthDate?.value ?? "2000-01").slice(0, 4));
  for (const g of goals) {
    const startAge = startAgeOverride[g.id] ?? g.startAge;
    const startYm = `${birthYear + startAge}-01`;
    if (g.cadence === "oneOff") c.spending.rows.push({ id: `goal-${g.id}`, category: "everythingElse", label: g.name, annual: { ...g.cost, value: g.cost.value * 12 }, start: startYm, end: { kind: "date", date: startYm } });
    else c.spending.rows.push({ id: `goal-${g.id}`, category: "everythingElse", label: g.name, annual: g.cost, start: startYm, end: { kind: "date", date: `${birthYear + startAge + Math.max(0, g.endAge - startAge)}-12` } });
  }
  return c;
}

export interface GoalsResult {
  /** The FI date with no goals. */
  baseline: BandResult;
  /** The FI date with every goal. */
  withAll: BandResult;
  /** Goals the plan keeps when held to the baseline FI year. */
  kept: GoalBucket[];
  /** Goals trimmed to stay funded at the baseline FI year, dreams first. */
  trimmed: GoalBucket[];
  /** For each trimmed goal: the earliest start age at which adding it back keeps the plan funded, or null. */
  affordableAt: Record<string, number | null>;
  /** The FI date with the kept goals. */
  withKept: BandResult;
}

/** Runs the plan with the goals, trimming by priority when it is short at the baseline FI year (spec: dream first, then want, musts protected). */
export function goalsInPlan(h: Household, deps: Deps = defaultDeps()): GoalsResult {
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const baseline = findFiDate(requireComplete(h), band, deps);
  const goals = [...h.goals];
  const withAll = findFiDate(requireComplete(withGoals(h, goals)), band, deps, baseline.retirementYear ?? undefined);
  const year = baseline.retirementYear ?? Infinity;
  const fundedAt = (list: readonly GoalBucket[]) => isFunded(runFor(requireComplete(withGoals(h, list)), band, deps, year));
  let kept = [...goals];
  const trimmed: GoalBucket[] = [];
  const byPriority = [...goals].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.cost.value - a.cost.value);
  for (const g of byPriority) {
    if (fundedAt(kept)) break;
    if (g.priority === "must") break;
    kept = kept.filter((x) => x.id !== g.id);
    trimmed.push(g);
  }
  const affordableAt: Record<string, number | null> = {};
  const birthYear = Number((h.self.birthDate?.value ?? "2000-01").slice(0, 4));
  const planTo = band.planToAge;
  for (const g of trimmed) {
    affordableAt[g.id] = null;
    for (let age = g.startAge; age <= planTo - 1; age++) {
      if (fundedAt([...kept, { ...g, startAge: age, endAge: Math.max(age, g.endAge + (age - g.startAge)) }])) {
        affordableAt[g.id] = age;
        break;
      }
    }
  }
  void birthYear;
  const withKept = findFiDate(requireComplete(withGoals(h, kept)), band, deps, baseline.retirementYear ?? undefined);
  return { baseline, withAll, kept, trimmed, affordableAt, withKept };
}
