/**
 * Level 3 milestones and the FIRE spectrum (docs/levels/level-3-life-plans.md
 * section 5, decision G3): one engine, many finish lines. Each milestone has a
 * condition, and the engine finds the earliest year it holds in the likely band.
 * Flex FI needs variable returns and shows "coming soon" until M6.
 */

import milestonesFile from "../../data/milestones.json";
import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand, type BandNumbers } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type Deps } from "../projection/fi";
import { defaultPolicy, type DrawdownPolicy } from "../projection/policy";
import { requireComplete, type CompleteHousehold } from "../projection/timeline";
import { runway, staircase } from "./resilience";

export const MILESTONE_DEFAULTS = milestonesFile.level3;

export type MilestoneId = "walkAway" | "business" | "coast" | "lean" | "barista" | "flex" | "slow" | "fi" | "fat";

export interface Milestone {
  id: MilestoneId;
  label: string;
  condition: string;
  /** The earliest age the condition holds in the likely band, or null (never, or coming soon). */
  age: number | null;
  year: number | null;
  /** True for Flex FI until M6. */
  comingSoon: boolean;
  /** What the milestone leans on, in words. */
  movedBy: string;
  /** Extra numbers for the view (Slow FI's extra spending, Lean FI's spending). */
  detail?: string;
}

function settings(h: Household) {
  const d = milestonesFile.level3;
  const m = h.milestones ?? {};
  return {
    coastAge: m.coastAge?.value ?? d.coastAge,
    baristaIncomeAnnual: m.baristaIncomeAnnual?.value ?? d.baristaIncomeAnnual,
    fatFiMultiplier: m.fatFiMultiplier?.value ?? d.fatFiMultiplier,
    flexFiTrimPercent: m.flexFiTrimPercent?.value ?? d.flexFiTrimPercent,
    slowFiTargetAge: m.slowFiTargetAge?.value ?? null,
    walkAwayMonths: m.walkAwayMonths?.value ?? d.walkAwayMonths,
    businessRunwayMonths: m.businessRunwayMonths?.value ?? d.businessRunwayMonths,
  };
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The year a running plan's assets first reach a dollar target, working on. */
function firstYearAssetsReach(target: number, working: ReturnType<typeof runFor>): number | null {
  return working.rows.find((r) => r.assets >= target)?.year ?? null;
}

/** Every milestone with its date (spec section 5), using the likely band. */
export function milestones(h: Household, deps: Deps = defaultDeps(), policy: DrawdownPolicy = defaultPolicy()): Milestone[] {
  const hh: CompleteHousehold = requireComplete(h);
  const band: BandNumbers = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const s = settings(h);
  const birthYear = Number(hh.birthDate.slice(0, 4));
  const year0 = Number(hh.asOf.slice(0, 4));
  const ageNow = year0 - birthYear;
  const d: Deps = { ...deps, policy };
  const fi = findFiDate(hh, band, d);
  const fiNumber = fi.timeline.assetsAtRetirement ?? null;
  const working = runFor(hh, band, d, Infinity);
  const toAge = (year: number | null) => (year === null ? null : year - birthYear);
  const out: Milestone[] = [];

  // Freedom milestones: runway from Level 2, measured today; the date is "now" when it already holds, else the year cash reaches it.
  const fullRunway = runway(h, "full").totalMonths;
  const walkYear = fullRunway >= s.walkAwayMonths ? year0 : (() => {
    const burn = runway(h, "full").burnMonthly;
    const need = burn * s.walkAwayMonths;
    return firstYearAssetsReach(need, working);
  })();
  out.push({ id: "walkAway", label: "Walk-away money", condition: `Runway covers ${s.walkAwayMonths} months with no income`, age: toAge(walkYear), year: walkYear, comingSoon: false, movedBy: "cash, the ability to cut, and unemployment benefits" });

  const draftt = staircase(h).find((x) => x.id === milestonesFile.level3.businessRunwayStep);
  const bizRunway = runway(h, milestonesFile.level3.businessRunwayStep).totalMonths;
  const bizYear = bizRunway >= s.businessRunwayMonths ? year0 : firstYearAssetsReach((draftt?.monthly ?? 0) * s.businessRunwayMonths, working);
  out.push({ id: "business", label: "Start a business", condition: `Runway covers ${s.businessRunwayMonths} building months at the DRAFTT step`, age: toAge(bizYear), year: bizYear, comingSoon: false, movedBy: "cash and the DRAFTT step of the staircase" });

  // Coast FI: with no new contributions, investments grow to the FI number by the coast age.
  let coastYear: number | null = null;
  if (fiNumber !== null) {
    const blended = (0.9 * band.returns.stocks + 0.1 * band.returns.bonds) / 100;
    for (const r of working.rows) {
      const years = s.coastAge - r.age;
      if (years < 0) break;
      if (r.assets * Math.pow(1 + blended, years) >= fiNumber) {
        coastYear = r.year;
        break;
      }
    }
  }
  out.push({ id: "coast", label: "Coast FI", condition: `With no new contributions, investments grow to the FI number by ${s.coastAge}`, age: toAge(coastYear), year: coastYear, comingSoon: false, movedBy: "today's balances and the likely return" });

  // Lean FI: FI at the FAT step of the staircase plus must-pays (spending scaled to that step).
  const steps = staircase(h);
  const full = steps[0]?.monthly ?? 0;
  const fat = steps.find((x) => x.id === milestonesFile.level3.leanFiStep)?.monthly ?? full;
  const leanScale = full > 0 ? fat / full : 1;
  const lean = findFiDate(hh, band, { ...d, spendingScale: leanScale }, fi.retirementYear ?? undefined);
  out.push({ id: "lean", label: "Lean FI", condition: "Full spending cut to the FAT step (food, housing, transportation) plus must-pays, covered for life", age: lean.fiAge, year: lean.retirementYear, comingSoon: false, movedBy: "the FAT step of the staircase", detail: `About ${money(fat * 12)} a year` });

  // Barista FI: part-time income after leaving full-time work, through 65 (health insurance on the marketplace until Medicare).
  const locks: DrawdownPolicy["locks"] = { ...policy.locks };
  for (let y = year0; y <= birthYear + 65; y++) locks[y] = { ...(locks[y] ?? {}), workIncome: s.baristaIncomeAnnual };
  const barista = findFiDate(hh, band, { ...d, policy: { ...policy, locks } }, fi.retirementYear ?? undefined);
  out.push({ id: "barista", label: "Barista FI", condition: `Investments plus ${money(s.baristaIncomeAnnual)} a year of part-time work (to 65) cover spending for life`, age: barista.fiAge, year: barista.retirementYear, comingSoon: false, movedBy: "the part-time income and health insurance after full-time work" });

  out.push({ id: "flex", label: "Flex FI", condition: `FI if spending is trimmed ${s.flexFiTrimPercent}% in years the market is down`, age: null, year: null, comingSoon: true, movedBy: "variable returns (arrives with M6)" });

  // Slow FI: the most extra spending now that still reaches FI by the target age (FI plus five years).
  const targetAge = s.slowFiTargetAge ?? (fi.fiAge !== null ? fi.fiAge + milestonesFile.level3.slowFiYearsAfterFi : null);
  let slowDetail = "";
  let slowYear: number | null = null;
  if (targetAge !== null) {
    const targetYear = birthYear + targetAge;
    let lo = 1;
    let hi = 3;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      const t = runFor(hh, band, { ...d, spendingScale: mid }, targetYear);
      if (t.firstShortfall === null) lo = mid;
      else hi = mid;
    }
    const extra = (lo - 1) * full * 12;
    slowYear = targetYear;
    slowDetail = extra > 0 ? `You could spend about ${money(extra)} more a year and still be FI by ${targetAge}.` : `No room for extra spending while still reaching FI by ${targetAge}.`;
  }
  out.push({ id: "slow", label: "Slow FI", condition: "Enjoy the journey: the most extra spending now that still reaches FI by the target age", age: toAge(slowYear), year: slowYear, comingSoon: false, movedBy: "spending and the target age", detail: slowDetail });

  out.push({ id: "fi", label: "FI", condition: "Full spending covered for life", age: fi.fiAge, year: fi.retirementYear, comingSoon: false, movedBy: "everything: income, spending, balances, and the plan" });

  const fat2 = findFiDate(hh, band, { ...d, spendingScale: s.fatFiMultiplier }, fi.retirementYear ?? undefined);
  out.push({ id: "fat", label: "Fat FI", condition: `FI at ${s.fatFiMultiplier} times current full spending`, age: fat2.fiAge, year: fat2.retirementYear, comingSoon: false, movedBy: "the spending multiplier", detail: `About ${money(full * 12 * s.fatFiMultiplier)} a year` });

  return out.map((m) => (m.age !== null && m.age < ageNow ? { ...m, age: ageNow, year: year0 } : m));
}

/** The spectrum view: every dated milestone on one line by age. */
export function spectrumLine(list: readonly Milestone[]): string {
  return list
    .filter((m) => !m.comingSoon && m.age !== null)
    .sort((a, b) => a.age! - b.age!)
    .map((m) => `${m.label} ${m.age}`)
    .join(". ") + ".";
}
