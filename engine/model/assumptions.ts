/**
 * Assumption sets, loaded from data/assumption-sets.json, and life phases from
 * data/life-phases.json (data dictionary section 4, decisions D11 to D17).
 *
 * A household stores only the set name and its overrides. This module merges
 * them into the effective assumptions the engine reads.
 */

import setsJson from "../../data/assumption-sets.json";
import phasesJson from "../../data/life-phases.json";
import type {
  AssetClass,
  AssumptionOverrides,
  Band,
  HouseholdAssumptions,
  IncomeGrowthType,
  IsoDate,
  LifePhase,
  ResolvedAssumptions,
  Value,
} from "./types";
import { assumptionValue } from "./values";

export const ASSET_CLASSES: readonly AssetClass[] = ["stocks", "bonds", "cash"];

export const INCOME_GROWTH_TYPES: readonly IncomeGrowthType[] = [
  "salary",
  "hourly",
  "selfEmployed",
  "sideGig",
  "allowance",
  "other",
];

/** A fully resolved set: inheritance applied, every field present, plain numbers. */
export interface AssumptionSet {
  key: string;
  label: string;
  description: string;
  returns: Record<AssetClass, Band>;
  inflation: Band;
  incomeGrowth: Record<IncomeGrowthType, Band>;
  socialSecurityPolicy: Band;
  citations: readonly string[];
}

export interface PlanToAgeBounds {
  default: number;
  min: number;
  max: number;
}

export const ASSUMPTIONS_UPDATED: IsoDate = setsJson._meta.updated;
export const PHASES_UPDATED: IsoDate = phasesJson._meta.updated;

type RawSet = {
  label: string;
  description: string;
  inherits?: string;
  returns?: Partial<Record<AssetClass, readonly number[]>>;
  inflation?: readonly number[];
  incomeGrowth?: Partial<Record<IncomeGrowthType, readonly number[]>>;
  socialSecurityPolicy?: readonly number[];
  citations?: readonly string[];
};

const rawSets: Record<string, RawSet> = setsJson.sets;

export function isBand(x: unknown): x is Band {
  return Array.isArray(x) && x.length === 3 && x.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Checks a band is three numbers in order: low <= likely <= high. */
export function parseBand(raw: unknown, where: string): Band {
  if (!isBand(raw)) throw new Error(`${where}: must be [low, likely, high]`);
  const [low, likely, high] = raw;
  if (!(low <= likely && likely <= high)) throw new Error(`${where}: must be ordered low <= likely <= high`);
  return [low, likely, high];
}

/** Picks one end of a band. The engine decides which end each band name uses. */
export function pickBand(band: Band, which: "low" | "likely" | "high"): number {
  switch (which) {
    case "low":
      return band[0];
    case "likely":
      return band[1];
    case "high":
      return band[2];
  }
}

export function listAssumptionSets(): readonly { key: string; label: string; description: string }[] {
  return Object.entries(rawSets).map(([key, s]) => ({ key, label: s.label, description: s.description }));
}

export function defaultAssumptionSetKey(): string {
  return setsJson.default;
}

export function isAssumptionSetKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(rawSets, key);
}

const setCache = new Map<string, AssumptionSet>();

/** Resolves a set, following `inherits` until every field is filled. */
export function loadAssumptionSet(key: string, chain: readonly string[] = []): AssumptionSet {
  const cached = setCache.get(key);
  if (cached) return cached;
  const raw = rawSets[key];
  if (!raw) throw new Error(`Unknown assumption set "${key}"`);
  if (chain.includes(key)) throw new Error(`Assumption set inheritance loops: ${[...chain, key].join(" -> ")}`);

  const parent = raw.inherits ? loadAssumptionSet(raw.inherits, [...chain, key]) : undefined;
  const where = `assumption set "${key}"`;

  const returns = {} as Record<AssetClass, Band>;
  for (const cls of ASSET_CLASSES) {
    const own = raw.returns?.[cls];
    const band = own !== undefined ? parseBand(own, `${where} returns.${cls}`) : parent?.returns[cls];
    if (!band) throw new Error(`${where}: missing returns.${cls}`);
    returns[cls] = band;
  }

  const incomeGrowth = {} as Record<IncomeGrowthType, Band>;
  for (const type of INCOME_GROWTH_TYPES) {
    const own = raw.incomeGrowth?.[type];
    const band = own !== undefined ? parseBand(own, `${where} incomeGrowth.${type}`) : parent?.incomeGrowth[type];
    if (!band) throw new Error(`${where}: missing incomeGrowth.${type}`);
    incomeGrowth[type] = band;
  }

  const inflation = raw.inflation !== undefined ? parseBand(raw.inflation, `${where} inflation`) : parent?.inflation;
  if (!inflation) throw new Error(`${where}: missing inflation`);

  const socialSecurityPolicy =
    raw.socialSecurityPolicy !== undefined
      ? parseBand(raw.socialSecurityPolicy, `${where} socialSecurityPolicy`)
      : parent?.socialSecurityPolicy;
  if (!socialSecurityPolicy) throw new Error(`${where}: missing socialSecurityPolicy`);

  const set: AssumptionSet = Object.freeze({
    key,
    label: raw.label,
    description: raw.description,
    returns,
    inflation,
    incomeGrowth,
    socialSecurityPolicy,
    citations: raw.citations ?? [],
  });
  setCache.set(key, set);
  return set;
}

export function planToAgeBounds(): PlanToAgeBounds {
  const { default: def, min, max } = setsJson.planToAge;
  if (!(min <= def && def <= max)) throw new Error("planToAge bounds must satisfy min <= default <= max");
  return { default: def, min, max };
}

let phasesCache: readonly LifePhase[] | undefined;

/** Life phase defaults, validated once: contiguous ages, multipliers between 0 and 1. */
export function loadLifePhases(): readonly LifePhase[] {
  if (phasesCache) return phasesCache;
  const phases = phasesJson.phases.map((p, i): LifePhase => {
    const where = `life phase #${i} (${p.id})`;
    if (typeof p.discretionaryMultiplier !== "number" || p.discretionaryMultiplier < 0 || p.discretionaryMultiplier > 1) {
      throw new Error(`${where}: discretionaryMultiplier must be between 0 and 1`);
    }
    return {
      id: p.id,
      label: p.label,
      startAge: p.startAge,
      endAge: p.endAge,
      discretionaryMultiplier: p.discretionaryMultiplier,
    };
  });
  if (phases.length === 0) throw new Error("life phases: at least one phase is required");
  if (phases[0]?.startAge !== null) throw new Error("life phases: the first phase must start at retirement (null)");
  if (phases[phases.length - 1]?.endAge !== null) throw new Error("life phases: the last phase must be open-ended (null)");
  for (let i = 1; i < phases.length; i++) {
    const prev = phases[i - 1];
    const cur = phases[i];
    if (!prev || !cur) continue;
    if (prev.endAge === null || cur.startAge !== prev.endAge + 1) {
      throw new Error(`life phases: "${cur.id}" must start the year after "${prev.id}" ends`);
    }
  }
  phasesCache = Object.freeze(phases);
  return phasesCache;
}

/** The default household assumptions: the default set, no overrides. */
export function defaultHouseholdAssumptions(): HouseholdAssumptions {
  return { set: defaultAssumptionSetKey(), overrides: {} };
}

/**
 * Merges the active set with the household's overrides. Values from the set
 * carry source "assumptionSet"; overridden values keep their own metadata.
 */
export function resolveAssumptions(stored: HouseholdAssumptions): ResolvedAssumptions {
  const set = loadAssumptionSet(stored.set);
  const o: AssumptionOverrides = stored.overrides;
  const fromSet = <T>(v: T): Value<T> => assumptionValue(v, ASSUMPTIONS_UPDATED);

  const returns = {} as Record<AssetClass, Value<Band>>;
  for (const cls of ASSET_CLASSES) returns[cls] = o.returns?.[cls] ?? fromSet(set.returns[cls]);

  const incomeGrowth = {} as Record<IncomeGrowthType, Value<Band>>;
  for (const type of INCOME_GROWTH_TYPES) incomeGrowth[type] = o.incomeGrowth?.[type] ?? fromSet(set.incomeGrowth[type]);

  return {
    set: set.key,
    returns,
    inflation: o.inflation ?? fromSet(set.inflation),
    incomeGrowth,
    socialSecurityPolicy: o.socialSecurityPolicy ?? fromSet(set.socialSecurityPolicy),
    planToAge: o.planToAge ?? fromSet(planToAgeBounds().default),
    phases: o.phases ?? assumptionValue([...loadLifePhases()], PHASES_UPDATED),
  };
}
