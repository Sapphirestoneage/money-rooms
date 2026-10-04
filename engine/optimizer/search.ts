/**
 * The policy-knob search (M2 spec section 3, decision N6): a small set of
 * knobs, the full projection for each candidate, the best by the chosen
 * objective within the limits. Coarse first (one knob at a time from the
 * default policy, two passes), then refined around the winner. Pure: data in,
 * the winning policy and its results out.
 */

import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand, type BandNumbers } from "../projection/bands";
import { defaultDeps, findFiDate, isFunded, runFor, type BandResult, type Deps } from "../projection/fi";
import { ACA_TARGETS, CONVERSION_TARGETS, WITHDRAWAL_ORDERS, defaultPolicy, type AcaTarget, type ContributionType, type ConversionTarget, type DrawdownPolicy, type GainHarvesting, type PolicyLimits, type WithdrawalOrder } from "../projection/policy";
import { requireComplete, type CompleteHousehold } from "../projection/timeline";
import { OBJECTIVES, estateAfterHeirsTaxes, scoreResult, type Objective } from "./objectives";

export interface OptimizerOptions {
  objective: Objective;
  limits?: Partial<PolicyLimits>;
  /** Keeps a retirement year fixed (the three objectives other than earliest FI need one). Blank means the FI year under the default policy. */
  retirementYear?: number;
  /** Year locks the person set by hand (section 5). The search plans around them. */
  locks?: DrawdownPolicy["locks"];
  /** Which knobs to search. Blank means all that apply to the household. */
  knobs?: readonly Knob[];
  /** Expected heir tax rate, percent. Blank means the household's value or 22. */
  heirTaxRatePercent?: number;
}

export type Knob = "conversionTarget" | "gainHarvesting" | "acaTarget" | "withdrawalOrder" | "sepp" | "ruleOf55" | "claimingAge" | "contributionType";

export const KNOBS: readonly Knob[] = ["conversionTarget", "gainHarvesting", "acaTarget", "withdrawalOrder", "sepp", "ruleOf55", "claimingAge", "contributionType"];

export interface Candidate {
  policy: DrawdownPolicy;
  result: BandResult;
  score: number;
  headline: number;
  /** For the most-spending objective: the annual spending the plan sustains, in today's dollars. */
  sustainableSpending?: number;
}

export interface OptimizerResult {
  objective: Objective;
  /** The plan under the default policy (no strategies), for comparison. */
  baseline: Candidate;
  best: Candidate;
  /** The retirement year the search held fixed, or null for earliest FI. */
  retirementYear: number | null;
  /** How many full projections the search ran. */
  evaluations: number;
  /** The knobs that were searched, in order. */
  knobs: Knob[];
}

/** The values a knob can take for this household. Knobs that cannot apply get one value (their off state). */
export function knobValues(hh: CompleteHousehold, knob: Knob): readonly unknown[] {
  switch (knob) {
    case "conversionTarget":
      return hh.accounts.some((a) => a.side === "asset" && a.taxBucket.value === "pretax") || hh.income.some((s) => s.preTaxDeductions?.some((d) => d.type === "401k" || d.type === "403b")) ? CONVERSION_TARGETS : ["none"];
    case "gainHarvesting":
      return ["off", "fillZeroBracket"] satisfies GainHarvesting[];
    case "acaTarget":
      return ACA_TARGETS;
    case "withdrawalOrder":
      return WITHDRAWAL_ORDERS;
    case "sepp":
      return hh.accounts.some((a) => a.side === "asset" && a.taxBucket.value === "pretax") ? ["off", "on"] : ["off"];
    case "ruleOf55":
      return hh.plans.some((p) => p.ruleOf55Allowed.value === "yes") ? [false, true] : [false];
    case "claimingAge":
      return [62, 63, 64, 65, 66, 67, 68, 69, 70];
    case "contributionType":
      return hh.income.some((s) => s.preTaxDeductions?.some((d) => d.type === "401k" || d.type === "403b")) ? (["asEntered", "traditional", "roth", "split"] satisfies ContributionType[]) : ["asEntered"];
  }
}

function withKnob(policy: DrawdownPolicy, knob: Knob, value: unknown, hh: CompleteHousehold, year0: number, seppStartAge: number): DrawdownPolicy {
  const birthYear = Number(hh.birthDate.slice(0, 4));
  void birthYear;
  switch (knob) {
    case "conversionTarget":
      return { ...policy, conversionTarget: value as ConversionTarget };
    case "gainHarvesting":
      return { ...policy, gainHarvesting: value as GainHarvesting };
    case "acaTarget":
      return { ...policy, acaTarget: value as AcaTarget };
    case "withdrawalOrder":
      return { ...policy, withdrawalOrder: value as WithdrawalOrder };
    case "sepp":
      // On means: 72(t) payments from the retirement age (the fixed year's, or the baseline FI age), amortization at the 5% floor.
      return { ...policy, sepp: value === "on" ? { startAge: seppStartAge, method: "fixedAmortization", interestRatePercent: 5, federalMidTermRatePercent: 4 } : null };
    case "ruleOf55":
      return { ...policy, ruleOf55: value as boolean };
    case "claimingAge":
      return { ...policy, claimingAge: { years: value as number, months: 0 } };
    case "contributionType":
      return { ...policy, contributionType: value as ContributionType };
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function knobValueOf(policy: DrawdownPolicy, knob: Knob): unknown {
  switch (knob) {
    case "conversionTarget": return policy.conversionTarget;
    case "gainHarvesting": return policy.gainHarvesting;
    case "acaTarget": return policy.acaTarget;
    case "withdrawalOrder": return policy.withdrawalOrder;
    case "sepp": return policy.sepp ? "on" : "off";
    case "ruleOf55": return policy.ruleOf55;
    case "claimingAge": return policy.claimingAge?.years ?? null;
    case "contributionType": return policy.contributionType;
  }
}

/** Runs the search. Likely band only: the optimizer plans for the honest best guess, and the bands show the range. */
export function optimize(household: Household, options: OptimizerOptions, deps: Deps = defaultDeps()): OptimizerResult {
  const hh = requireComplete(household);
  const band = resolveBand(resolveAssumptions(household.assumptions), "likely");
  const year0 = Number(hh.asOf.slice(0, 4));
  const heir = options.heirTaxRatePercent ?? hh.drawdown.heirTaxRatePercent?.value ?? 22;
  const base = defaultPolicy();
  const limits: PolicyLimits = { ...base.limits, ...(options.limits ?? {}) };
  const start: DrawdownPolicy = { ...base, limits, locks: options.locks ?? {} };
  const knobs = (options.knobs ?? KNOBS).filter((k) => knobValues(hh, k).length > 1);
  let evaluations = 0;

  const baselineFi = findFiDate(hh, band, { ...deps, policy: start });
  evaluations += 1;
  const fixedYear = options.objective === "earliestFi" ? null : options.retirementYear ?? baselineFi.retirementYear ?? year0;
  /** The 72(t) knob starts payments at the retirement age: the fixed year's, or for earliest FI the baseline FI age (decision T5). */
  const seppStartAge = Math.max((fixedYear ?? baselineFi.retirementYear ?? year0) - Number(hh.birthDate.slice(0, 4)), year0 - Number(hh.birthDate.slice(0, 4)));

  const evaluate = (policy: DrawdownPolicy, near: number | null): Candidate => {
    const d: Deps = { ...deps, policy };
    if (options.objective === "earliestFi") {
      const r = findFiDate(hh, band, d, near ?? undefined);
      evaluations += 1;
      const s = scoreResult("earliestFi", r, limits, heir);
      return { policy, result: r, score: s.score, headline: s.headline };
    }
    const asBand = (t: ReturnType<typeof runFor>): BandResult => ({ band: "likely", funded: isFunded(t), retirementYear: fixedYear, fiAge: fixedYear === null ? null : fixedYear - Number(hh.birthDate.slice(0, 4)), timeline: t, oneYearEarlier: null, neverFundedShortfall: t.firstShortfall });
    if (options.objective === "mostSpending") {
      // The most spending that stays funded at the fixed retirement year: bisection on the spending scale.
      let lo = 0.5;
      let hi = 3;
      let best: ReturnType<typeof runFor> | null = null;
      let bestScale = 0;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        const t = runFor(hh, band, { ...d, spendingScale: mid }, fixedYear!);
        evaluations += 1;
        if (isFunded(t) && scoreResult("earliestFi", asBand(t), limits, heir).score > -Infinity) {
          lo = mid;
          best = t;
          bestScale = mid;
        } else hi = mid;
      }
      if (!best) {
        const t = runFor(hh, band, { ...d, spendingScale: lo }, fixedYear!);
        evaluations += 1;
        best = t;
        bestScale = isFunded(t) ? lo : 0;
      }
      const spendingNow = best.rows.find((r) => r.retired)?.spending ?? 0;
      const sustainable = bestScale > 0 ? spendingNow : 0;
      const r = asBand(best);
      const s = scoreResult("mostSpending", r, limits, heir, sustainable);
      return { policy, result: r, score: s.score, headline: s.headline, sustainableSpending: sustainable };
    }
    const t = runFor(hh, band, d, fixedYear!);
    evaluations += 1;
    const r = asBand(t);
    const s = scoreResult(options.objective, r, limits, heir);
    return { policy, result: r, score: s.score, headline: s.headline };
  };

  const baseline = evaluate(start, baselineFi.retirementYear);
  let best = baseline;

  // Coarse: one knob at a time from the current best, two passes.
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (const knob of knobs) {
      for (const value of knobValues(hh, knob)) {
        if (sameValue(value, knobValueOf(best.policy, knob))) continue;
        const candidate = evaluate(withKnob(best.policy, knob, value, hh, year0, seppStartAge), best.result.retirementYear);
        if (candidate.score > best.score + 1e-6) {
          best = candidate;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  // Refine: pairs of the knobs that moved the result most are already covered by the second pass;
  // a last sweep of the two most consequential knobs together catches an interaction between them.
  const pairs: [Knob, Knob][] = [["conversionTarget", "acaTarget"], ["conversionTarget", "gainHarvesting"]];
  for (const [a, b] of pairs) {
    if (!knobs.includes(a) || !knobs.includes(b)) continue;
    for (const va of knobValues(hh, a)) {
      for (const vb of knobValues(hh, b)) {
        if (sameValue(va, knobValueOf(best.policy, a)) && sameValue(vb, knobValueOf(best.policy, b))) continue;
        const candidate = evaluate(withKnob(withKnob(best.policy, a, va, hh, year0, seppStartAge), b, vb, hh, year0, seppStartAge), best.result.retirementYear);
        if (candidate.score > best.score + 1e-6) best = candidate;
      }
    }
  }

  return { objective: options.objective, baseline, best, retirementYear: fixedYear, evaluations, knobs };
}

export { OBJECTIVES, estateAfterHeirsTaxes };
