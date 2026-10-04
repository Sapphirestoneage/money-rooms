/**
 * Level 5: Legacy (docs/levels/level-5-legacy.md). The estate after heirs'
 * taxes in each band, the basics checklist, giving (annual and forever),
 * legacy projects, Legacy FI with the breathing-room margin, and the freedom
 * budget. Pure functions. Defaults from data/milestones.json (level5).
 */

import milestonesFile from "../../data/milestones.json";
import type { BandName, Household, LegacyProject } from "../model";
import { resolveAssumptions } from "../model";
import { estateAfterHeirsTaxes } from "../optimizer/objectives";
import { resolveBand } from "../projection/bands";
import { BAND_NAMES } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";

export const LEGACY_DEFAULTS = milestonesFile.level5;

export interface EstateView {
  heirTaxRatePercent: number;
  byBand: Record<BandName, { before: number; after: number; pretax: number; roth: number; taxable: number; cash: number }>;
}

/** The balance at plan-to age in each band, before and after heirs' taxes, by money type (spec section 3). */
export function estateView(h: Household, deps: Deps = defaultDeps()): EstateView {
  const hh = requireComplete(h);
  const heir = h.drawdown?.heirTaxRatePercent?.value ?? milestonesFile.level5.heirTaxRatePercent;
  const resolved = resolveAssumptions(h.assumptions);
  const byBand = {} as EstateView["byBand"];
  for (const name of BAND_NAMES) {
    const band = resolveBand(resolved, name);
    const r = findFiDate(hh, band, deps);
    const t = r.timeline;
    const last = t.rows[t.rows.length - 1]!;
    const sum = (bucket: string) => t.accounts.filter((a) => a.kind === "asset" && a.taxBucket === bucket).reduce((s, a) => s + (last.balances[a.id] ?? 0), 0);
    byBand[name] = { before: last.netWorth, after: estateAfterHeirsTaxes(t, heir), pretax: sum("pretax") + sum("hsa"), roth: sum("roth"), taxable: sum("taxable"), cash: sum("cash") };
  }
  return { heirTaxRatePercent: heir, byBand };
}

export interface BasicsItem {
  id: "beneficiaries" | "will" | "healthcareProxy" | "powerOfAttorney";
  label: string;
  answer: "yes" | "no" | "unsure";
  without: string;
}

/** The basics checklist (spec section 3), with what happens without each. No legal advice. */
export function basicsChecklist(h: Household): BasicsItem[] {
  const b = h.legacy?.basics;
  const items: Omit<BasicsItem, "answer">[] = [
    { id: "beneficiaries", label: "Beneficiaries named on every account", without: "Without a named beneficiary, a retirement account usually goes through probate and loses the stretch its rules allow." },
    { id: "will", label: "A will", without: "Without a will, your state's default rules decide who gets what." },
    { id: "healthcareProxy", label: "A healthcare proxy", without: "Without one, medical decisions fall to whoever the state's rules name, who may not know your wishes." },
    { id: "powerOfAttorney", label: "A power of attorney", without: "Without one, nobody can handle your money if you cannot, until a court appoints someone." },
  ];
  return items.map((i) => ({ ...i, answer: b?.[i.id]?.value ?? "unsure" }));
}

/** Annual giving from the giving spending category. */
export function annualGiving(h: Household): number {
  if (h.spending.kind !== "rows") return 0;
  return h.spending.rows.filter((r) => r.category === milestonesFile.level5.givingCategory).reduce((s, r) => s + r.annual.value, 0);
}

/** The plan's own sustainable withdrawal rate: first retired year's spending over assets at retirement. */
export function sustainableWithdrawalRate(h: Household, deps: Deps = defaultDeps()): number | null {
  const hh = requireComplete(h);
  const r = findFiDate(hh, resolveBand(resolveAssumptions(h.assumptions), "likely"), deps);
  const first = r.timeline.rows.find((x) => x.retired);
  if (!r.funded || !first || !r.timeline.assetsAtRetirement) return null;
  return first.spending / r.timeline.assetsAtRetirement;
}

/** Giving forever: the endowment that pays an annual amount indefinitely at the plan's sustainable rate (acceptance test 2). */
export function givingForever(annual: number, withdrawalRate: number | null): number | null {
  if (withdrawalRate === null || withdrawalRate <= 0) return null;
  return annual / withdrawalRate;
}

export interface LegacyFi {
  /** The earliest age the plan stays funded with every project's money added, or null. */
  age: number | null;
  year: number | null;
  /** The FI number plus the breathing-room margin. */
  targetWithRoom: number | null;
  /** The year the working plan's assets reach that target, or null. */
  roomReachedYear: number | null;
  projectsAnnual: number;
  projectsOneOff: number;
}

const clone = <T>(x: T): T => structuredClone(x);

/** Legacy FI (spec section 5, acceptance test 3): the earliest year the plan is funded and pays for every legacy project. */
export function legacyFi(h: Household, deps: Deps = defaultDeps()): LegacyFi {
  const projects: LegacyProject[] = h.legacy?.projects ?? [];
  const birthYear = Number((h.self.birthDate?.value ?? "2000-01").slice(0, 4));
  const c = clone(h);
  let annual = 0;
  let oneOff = 0;
  if (c.spending.kind !== "rows") c.spending = { kind: "rows", rows: [] };
  for (const p of projects) {
    const startYm = `${birthYear + p.startAge}-01`;
    if (p.annualCost.value > 0) {
      annual += p.annualCost.value;
      c.spending.rows.push({ id: `legacy-${p.id}`, category: "giving", label: p.name, annual: { ...p.annualCost, source: "computed" }, start: startYm, ...(p.horizonYears !== null ? { end: { kind: "date", date: `${birthYear + p.startAge + p.horizonYears - 1}-12` } } : {}) });
    }
    if (p.oneOffCost.value > 0) {
      oneOff += p.oneOffCost.value;
      c.spending.rows.push({ id: `legacy-${p.id}-once`, category: "giving", label: `${p.name} (one-off)`, annual: { ...p.oneOffCost, value: p.oneOffCost.value * 12, source: "computed" }, start: startYm, end: { kind: "date", date: startYm } });
    }
  }
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const hh = requireComplete(c);
  const r = findFiDate(hh, band, deps);
  const base = findFiDate(requireComplete(h), band, deps);
  const room = (h.legacy?.breathingRoomPercent?.value ?? milestonesFile.level5.breathingRoomPercent) / 100;
  const target = base.timeline.assetsAtRetirement !== null ? base.timeline.assetsAtRetirement * (1 + room) : null;
  const working = runFor(requireComplete(h), band, deps, Infinity);
  const reached = target === null ? null : working.rows.find((x) => x.assets >= target)?.year ?? null;
  return { age: r.fiAge, year: r.retirementYear, targetWithRoom: target, roomReachedYear: reached, projectsAnnual: annual, projectsOneOff: oneOff };
}

export interface FreedomBudget {
  freeHours: number;
  projectHours: number;
  leftHours: number;
  overCommitted: boolean;
  sentence: string;
}

/** The weekly time budget after FI with legacy projects placed in it (spec section 5, acceptance test 4). */
export function freedomBudget(h: Household): FreedomBudget {
  const free = h.legacy?.freeHoursPerWeek?.value ?? milestonesFile.level5.freeHoursPerWeekAfterFi;
  const hours = (h.legacy?.projects ?? []).reduce((s, p) => s + p.hoursPerWeek.value, 0);
  const left = free - hours;
  return {
    freeHours: free,
    projectHours: hours,
    leftHours: left,
    overCommitted: left < 0,
    sentence: left >= 0 ? `After FI you'd have about ${free} free hours a week. Your legacy projects use ${hours}. That leaves ${left} for everything else.` : `Your legacy projects ask for ${hours} hours a week, ${-left} more than the ${free} free hours after FI.`,
  };
}

/** Tagging a dream as legacy moves it into the projects while keeping its price card (acceptance test 5). */
export function legacyProjectsFromGoals(h: Household): LegacyProject[] {
  return h.goals
    .filter((g) => g.legacy)
    .map((g) => ({ id: `goal-${g.id}`, name: g.name, type: "other" as const, oneOffCost: g.cadence === "oneOff" ? g.cost : { ...g.cost, value: 0 }, annualCost: g.cadence === "annual" ? g.cost : { ...g.cost, value: 0 }, hoursPerWeek: { ...g.cost, value: 0 }, startAge: g.startAge, horizonYears: g.cadence === "annual" ? Math.max(1, g.endAge - g.startAge + 1) : 1 }));
}
