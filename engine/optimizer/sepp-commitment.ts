/**
 * The 72(t) commitment (decision A2): when the best plan takes substantially equal
 * periodic payments, what the rule binds the person to, and the best plan the search
 * finds without the payments, so the result screen can show the commitment and what it
 * buys side by side. Pure: data in, results out.
 */

import type { Household } from "../model";
import { rule } from "../model";
import { defaultDeps, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { estateAfterHeirsTaxes } from "./objectives";
import { optimize, type OptimizerResult } from "./search";

interface Sepp72tRule {
  duration: string;
  modificationPenalty: string;
  maxRate: string;
}

export interface SeppCommitment {
  /** The first age payments are taken. */
  startAge: number;
  /** The age the commitment ends: the later of five years after the first payment and 59 and a half. */
  endsAtAge: number;
  /** How long the payments run, in years. */
  years: number;
  /** The rule as the registry states it, with its source and the date it was last checked. */
  rule: { duration: string; modificationPenalty: string; source: string; url: string | null; lastVerified: string | null };
  /** The best plan the search finds with the 72(t) knob held off, same objective, same retirement year where one was fixed. */
  without: OptimizerResult;
  /** FI date without the payments minus with them, in years (positive means later). Null when either plan is never funded. */
  deltaYearsWithout: number | null;
  /** Estate after heirs' taxes with the payments, and without. */
  estateWith: number;
  estateWithout: number;
  /** Estate with the payments minus without (positive means the payments buy more estate). */
  deltaEstateWithout: number;
}

/** The commitment behind a plan that uses 72(t) payments, or null when the plan does not. */
export function seppCommitment(household: Household, optimized: OptimizerResult, deps: Deps = defaultDeps()): SeppCommitment | null {
  const sepp = optimized.best.policy.sepp;
  if (!sepp) return null;
  const r = rule<Sepp72tRule>("access.sepp72t");
  const hh = requireComplete(household);
  const heir = hh.drawdown.heirTaxRatePercent?.value ?? 22;
  const without = optimize(
    household,
    {
      objective: optimized.objective,
      knobs: optimized.knobs.filter((k) => k !== "sepp"),
      ...(optimized.retirementYear !== null ? { retirementYear: optimized.retirementYear } : {}),
    },
    deps,
  );
  const withYear = optimized.best.result.retirementYear;
  const withoutYear = without.best.result.retirementYear;
  const estateWith = estateAfterHeirsTaxes(optimized.best.result.timeline, heir);
  const estateWithout = estateAfterHeirsTaxes(without.best.result.timeline, heir);
  const endsAtAge = Math.max(sepp.startAge + 5, 59.5);
  return {
    startAge: sepp.startAge,
    endsAtAge,
    years: endsAtAge - sepp.startAge,
    rule: { duration: r.value.duration, modificationPenalty: r.value.modificationPenalty, source: r.source, url: r.url, lastVerified: r.lastVerified },
    without,
    deltaYearsWithout: withYear === null || withoutYear === null ? null : withoutYear - withYear,
    estateWith,
    estateWithout,
    deltaEstateWithout: estateWith - estateWithout,
  };
}
