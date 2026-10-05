/**
 * The assumptions drawer (DATA_MODEL.md section 4): three cases with the same fields, one active,
 * real dollars by default. Defaults come from app/data/assumptions.json and nowhere else.
 */

import defaults from "../data/assumptions.json";

export type AssumptionCase = "realistic" | "likely" | "unrealistic";
export const ASSUMPTION_CASES: readonly AssumptionCase[] = ["realistic", "likely", "unrealistic"];

export interface AssumptionSet {
  label: string;
  returnRealPercent: { stocks: number; bonds: number; cash: number };
  inflationPercent: number;
  incomeGrowthRealPercent: number;
  planToAge: number;
}

export interface AssumptionsDrawer {
  active: AssumptionCase;
  /** Real by default; nominal only at display time. */
  dollars: "real" | "nominal";
  cases: Record<AssumptionCase, AssumptionSet>;
}

export function defaultAssumptions(): AssumptionsDrawer {
  return structuredClone({ active: defaults.active as AssumptionCase, dollars: defaults.dollars as "real" | "nominal", cases: defaults.cases as Record<AssumptionCase, AssumptionSet> });
}

export function activeCase(d: AssumptionsDrawer): AssumptionSet {
  return d.cases[d.active];
}

export function withCase(d: AssumptionsDrawer, active: AssumptionCase): AssumptionsDrawer {
  if (!ASSUMPTION_CASES.includes(active)) throw new Error(`No assumption case named ${active}`);
  return { ...d, active };
}

/** Real dollars to nominal at a year offset, from the active case's inflation. */
export function toNominal(real: number, d: AssumptionsDrawer, yearsFromNow: number): number {
  return real * Math.pow(1 + activeCase(d).inflationPercent / 100, yearsFromNow);
}

/** Every case's value for one field, for a three-column view. */
export function acrossCases<K extends keyof AssumptionSet>(d: AssumptionsDrawer, field: K): Record<AssumptionCase, AssumptionSet[K]> {
  return { realistic: d.cases.realistic[field], likely: d.cases.likely[field], unrealistic: d.cases.unrealistic[field] };
}
