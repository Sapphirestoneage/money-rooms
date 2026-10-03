/**
 * What the optimizer optimizes (M2 spec section 3): one objective, the others
 * as limits. A score is a number where higher is better; a plan that breaks a
 * limit scores minus infinity. Pure functions over timeline results.
 */

import type { BandResult } from "../projection/fi";
import type { TimelineResult } from "../projection/timeline";
import type { PolicyLimits } from "../projection/policy";

export type Objective = "earliestFi" | "mostSpending" | "leastLifetimeTax" | "biggestEstate";

export const OBJECTIVES: readonly Objective[] = ["earliestFi", "mostSpending", "leastLifetimeTax", "biggestEstate"];

export const OBJECTIVE_QUESTION: Readonly<Record<Objective, string>> = {
  earliestFi: "How soon can I stop, at my planned spending?",
  mostSpending: "How much can I spend every year without running out?",
  leastLifetimeTax: "How do I keep the most from the IRS?",
  biggestEstate: "How much can I leave behind, after heirs' taxes?",
};

/**
 * The estate after heirs' taxes (M2 spec G1, G2; Level 5): pretax money is taxed at the heir's
 * rate, Roth and cash land whole, and taxable gets a stepped-up basis so its gains are untaxed.
 */
export function estateAfterHeirsTaxes(t: TimelineResult, heirTaxRatePercent: number): number {
  const last = t.rows[t.rows.length - 1];
  if (!last) return 0;
  let estate = 0;
  for (const a of t.accounts) {
    if (a.kind !== "asset") continue;
    const balance = last.balances[a.id] ?? 0;
    estate += a.taxBucket === "pretax" || a.taxBucket === "hsa" ? balance * (1 - heirTaxRatePercent / 100) : balance;
  }
  return estate - last.debts;
}

/** Whether a result stays inside the limits that the engine cannot enforce on its own. */
export function withinLimits(t: TimelineResult, limits: PolicyLimits, heirTaxRatePercent: number): boolean {
  if (limits.estateFloor !== null && estateAfterHeirsTaxes(t, heirTaxRatePercent) < limits.estateFloor) return false;
  return true;
}

export interface Scored {
  score: number;
  /** The headline the score stands for, in the objective's own unit. */
  headline: number;
}

/** Scores a band result for an objective. `sustainableSpending` is supplied by the search for the most-spending objective. */
export function scoreResult(objective: Objective, r: BandResult, limits: PolicyLimits, heirTaxRatePercent: number, sustainableSpending?: number): Scored {
  const t = r.timeline;
  if (!r.funded || !withinLimits(t, limits, heirTaxRatePercent)) return { score: -Infinity, headline: NaN };
  switch (objective) {
    case "earliestFi":
      // Earlier is better; among equal years, the bigger estate wins.
      return { score: -(r.retirementYear ?? Infinity) * 1e12 + estateAfterHeirsTaxes(t, heirTaxRatePercent), headline: r.retirementYear ?? NaN };
    case "mostSpending":
      return { score: sustainableSpending ?? 0, headline: sustainableSpending ?? NaN };
    case "leastLifetimeTax":
      return { score: -t.lifetimeTaxes, headline: t.lifetimeTaxes };
    case "biggestEstate": {
      const e = estateAfterHeirsTaxes(t, heirTaxRatePercent);
      return { score: e, headline: e };
    }
  }
}
