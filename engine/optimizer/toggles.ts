/**
 * Strategy toggles and tripwires (M2 spec sections 4 and 6): each strategy's
 * effect in years and dollars, flags for rules the plan leans on, and the
 * stress test that reruns the plan as if the watched rules changed.
 */

import type { Household } from "../model";
import { resolveAssumptions, loadRules } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type BandResult, type Deps } from "../projection/fi";
import type { DrawdownPolicy } from "../projection/policy";
import { requireComplete } from "../projection/timeline";
import { estateAfterHeirsTaxes } from "./objectives";

export interface ToggleEffect {
  id: string;
  label: string;
  on: boolean;
  /** Years the FI date moves with the strategy turned off (positive means later). Null when either run is never funded. */
  deltaYearsOff: number | null;
  /** Lifetime taxes with the strategy off minus with it on. */
  deltaLifetimeTaxesOff: number;
  /** Estate after heirs' taxes with the strategy off minus with it on. */
  deltaEstateOff: number;
}

/** Each strategy in the policy, with what turning it off would do. */
export function strategyToggles(household: Household, policy: DrawdownPolicy, deps: Deps = defaultDeps()): ToggleEffect[] {
  const hh = requireComplete(household);
  const band = resolveBand(resolveAssumptions(household.assumptions), "likely");
  const heir = hh.drawdown.heirTaxRatePercent?.value ?? 22;
  const on = findFiDate(hh, band, { ...deps, policy });
  const fixedYear = on.retirementYear ?? Infinity;
  const onEstate = estateAfterHeirsTaxes(on.timeline, heir);
  // Years from a fresh FI search with the strategy off; dollars from a rerun at the same retirement year.
  const compare = (id: string, label: string, isOn: boolean, off: DrawdownPolicy): ToggleEffect => {
    if (!isOn) return { id, label, on: false, deltaYearsOff: null, deltaLifetimeTaxesOff: 0, deltaEstateOff: 0 };
    const r = findFiDate(hh, band, { ...deps, policy: off }, on.retirementYear ?? undefined);
    const same = runFor(hh, band, { ...deps, policy: off }, fixedYear);
    return {
      id,
      label,
      on: true,
      deltaYearsOff: on.retirementYear === null || r.retirementYear === null ? null : r.retirementYear - on.retirementYear,
      deltaLifetimeTaxesOff: same.lifetimeTaxes - on.timeline.lifetimeTaxes,
      deltaEstateOff: estateAfterHeirsTaxes(same, heir) - onEstate,
    };
  };
  return [
    compare("conversions", "Roth conversion ladder", policy.conversionTarget !== "none", { ...policy, conversionTarget: "none" }),
    compare("harvesting", "0% gain harvesting", policy.gainHarvesting !== "off", { ...policy, gainHarvesting: "off" }),
    compare("aca", "ACA income targeting", policy.acaTarget !== "off", { ...policy, acaTarget: "off" }),
    compare("sepp", "72(t) payments", policy.sepp !== null, { ...policy, sepp: null }),
    compare("ruleOf55", "Rule of 55", policy.ruleOf55, { ...policy, ruleOf55: false }),
    compare("order", "Withdrawal order", policy.withdrawalOrder !== "conventional", { ...policy, withdrawalOrder: "conventional" }),
    compare("claiming", "Social Security claiming age", policy.claimingAge !== null, { ...policy, claimingAge: null }),
    compare("contributionType", "Contribution type at work", policy.contributionType !== "asEntered", { ...policy, contributionType: "asEntered" }),
  ];
}

export interface TripwireFlag {
  ruleId: string;
  sentence: string;
}

/** Plain sentences for the rules a plan leans on that are sunsetting or under watch (tripwire 1). */
export function tripwireFlags(result: BandResult): TripwireFlag[] {
  return result.timeline.tripwires.map((r) => {
    const when = r.sunset !== null ? `is scheduled to end after ${r.sunset}` : "is under watch, so it could change";
    const name = r.name.split(" (")[0]!;
    return { ruleId: r.id, sentence: `Your plan uses the ${name.charAt(0) === name.charAt(0).toUpperCase() && name.slice(1) === name.slice(1).toLowerCase() ? name.charAt(0).toLowerCase() + name.slice(1) : name}, which ${when}.${r.watch ? ` ${r.watch.endsWith(".") ? r.watch : `${r.watch}.`}` : ""}` };
  });
}

export interface StressCase {
  id: string;
  label: string;
  /** Years the FI date moves (positive means later). Null when never funded. */
  deltaYears: number | null;
  /** Dollars of estate after heirs' taxes lost (positive means less). */
  deltaEstate: number;
  funded: boolean;
}

/**
 * The stress test (tripwire 2): the plan rerun as if each watched rule changed. The ACA cliff is already
 * in the base case for 2026, so the cases are the senior deduction ending now and Social Security paying
 * its current-law floor.
 */
export function stressTest(household: Household, policy: DrawdownPolicy, deps: Deps = defaultDeps()): StressCase[] {
  const hh = requireComplete(household);
  const resolved = resolveAssumptions(household.assumptions);
  const band = resolveBand(resolved, "likely");
  const heir = hh.drawdown.heirTaxRatePercent?.value ?? 22;
  const base = findFiDate(hh, band, { ...deps, policy });
  const baseEstate = estateAfterHeirsTaxes(base.timeline, heir);
  const fixedYear = base.retirementYear ?? Infinity;
  const cases: StressCase[] = [];
  // Years from a fresh FI search; dollars from a rerun at the same retirement year, so the two are not mixed.
  const add = (id: string, label: string, bandUsed: typeof band, d: Deps) => {
    const r = findFiDate(hh, bandUsed, d, base.retirementYear ?? undefined);
    const same = runFor(hh, bandUsed, d, fixedYear);
    cases.push({
      id,
      label,
      deltaYears: base.retirementYear === null || r.retirementYear === null ? null : r.retirementYear - base.retirementYear,
      deltaEstate: baseEstate - estateAfterHeirsTaxes(same, heir),
      funded: r.funded,
    });
  };
  const sunsetting = [...loadRules().values()].filter((r) => r.status === "sunsetting").map((r) => r.id);
  if (sunsetting.length) add("sunsets", "Every sunsetting rule ends today", band, { ...deps, policy, disabledRules: sunsetting });
  const floor = resolved.socialSecurityPolicy.value[0];
  add("socialSecurityFloor", `Social Security pays ${Math.round(floor * 100)}% of scheduled benefits`, { ...band, socialSecurityPolicy: floor }, { ...deps, policy });
  add("worstBand", "Everything at the worst band", resolveBand(resolved, "worst"), { ...deps, policy });
  return cases;
}
