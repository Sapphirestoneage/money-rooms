/**
 * The rules registry (M2 spec section 6, decision N5): every tax and benefit
 * rule the M2 engine uses, read from data/rules-registry.json and nowhere else.
 *
 * A rule is usable only when it has been verified (lastVerified is a date).
 * Reading an unverified rule throws, so a new feature cannot lean on a number
 * nobody has checked. The engine records every rule it reads, so a result can
 * list the rules behind it with their source and last-verified date.
 */

import registry from "../../data/rules-registry.json";

export type RuleStatus = "current" | "sunsetting" | "watch" | "stale";

export interface Rule<T = unknown> {
  id: string;
  name: string;
  value: T;
  effective: readonly (number | string)[];
  sunset: number | null;
  source: string;
  url: string | null;
  lastVerified: string | null;
  status: RuleStatus;
  watch: string | null;
  affects: readonly string[];
  /** What was and was not confirmed, when the official page did not say everything. */
  verification?: string;
}

/** What a result shows about a rule it leaned on (M2 acceptance test 5). */
export interface RuleRef {
  id: string;
  name: string;
  source: string;
  url: string | null;
  lastVerified: string | null;
  status: RuleStatus;
  sunset: number | null;
  watch: string | null;
}

const STATUSES: readonly RuleStatus[] = ["current", "sunsetting", "watch", "stale"];

let cache: ReadonlyMap<string, Rule> | null = null;

function validate(raw: unknown): Rule {
  const r = raw as Partial<Rule>;
  if (typeof r.id !== "string" || !r.id) throw new Error("rules registry: a rule has no id");
  if (typeof r.name !== "string") throw new Error(`rules registry ${r.id}: name is required`);
  if (!Array.isArray(r.effective)) throw new Error(`rules registry ${r.id}: effective must be a list`);
  if (!(r.sunset === null || typeof r.sunset === "number")) throw new Error(`rules registry ${r.id}: sunset must be a year or null`);
  if (typeof r.source !== "string") throw new Error(`rules registry ${r.id}: source is required`);
  if (!(r.url === null || typeof r.url === "string")) throw new Error(`rules registry ${r.id}: url must be a string or null`);
  if (!(r.lastVerified === null || /^\d{4}-\d{2}-\d{2}$/.test(String(r.lastVerified)))) throw new Error(`rules registry ${r.id}: lastVerified must be a date or null`);
  if (!STATUSES.includes(r.status as RuleStatus)) throw new Error(`rules registry ${r.id}: status "${String(r.status)}" is not one of ${STATUSES.join(", ")}`);
  if (!Array.isArray(r.affects)) throw new Error(`rules registry ${r.id}: affects must be a list`);
  return r as Rule;
}

/** Every rule, validated once and cached, by id. */
export function loadRules(): ReadonlyMap<string, Rule> {
  if (cache) return cache;
  const map = new Map<string, Rule>();
  for (const raw of registry.rules as unknown[]) {
    const rule = validate(raw);
    if (map.has(rule.id)) throw new Error(`rules registry: duplicate id ${rule.id}`);
    map.set(rule.id, rule);
  }
  cache = map;
  return map;
}

export const RULES_UPDATED: string = registry._meta.updated;

export function isVerified(rule: Rule): boolean {
  return rule.lastVerified !== null;
}

/** A rule by id. Throws if it is missing or unverified: unverified rules are not used for new features. */
export function rule<T = unknown>(id: string): Rule<T> {
  const r = loadRules().get(id);
  if (!r) throw new Error(`No rule "${id}" in data/rules-registry.json`);
  if (!isVerified(r)) throw new Error(`Rule "${id}" has not been verified against its source (lastVerified is null), so the engine will not use it`);
  return r as Rule<T>;
}

/** Whether a rule applies in a calendar year: inside its effective years and before its sunset. */
export function ruleAppliesIn(r: Rule, year: number): boolean {
  if (r.sunset !== null && year > r.sunset) return false;
  for (const e of r.effective) {
    if (typeof e === "number") {
      if (e === year) return true;
    } else if (e === "ongoing") {
      return true;
    } else if (/^\d{4}-$/.test(e)) {
      if (year >= Number(e.slice(0, 4))) return true;
    } else if (/^\d{4}-\d{4}$/.test(e)) {
      const [a, b] = e.split("-").map(Number);
      if (year >= a! && year <= b!) return true;
    }
  }
  // A dated rule (one effective year) is held constant in real dollars for later years (tie-out convention 1).
  const years = r.effective.filter((e): e is number => typeof e === "number");
  return years.length > 0 && year > Math.max(...years) && (r.sunset === null || year <= r.sunset);
}

export function toRef(r: Rule): RuleRef {
  return { id: r.id, name: r.name, source: r.source, url: r.url, lastVerified: r.lastVerified, status: r.status, sunset: r.sunset, watch: r.watch };
}

/**
 * A ledger of the rules a run read, so the result can list them. The engine
 * creates one per timeline and reads rules through it.
 */
export class RuleLedger {
  private readonly used = new Map<string, Rule>();
  /** Rules treated as gone, for the stress test ("as if the senior deduction ended"). */
  private readonly disabled: ReadonlySet<string>;

  constructor(disabledRuleIds: readonly string[] = []) {
    this.disabled = new Set(disabledRuleIds);
  }

  /** Reads a verified rule and remembers that it was used. */
  get<T = unknown>(id: string): T {
    const r = rule<T>(id);
    this.used.set(id, r);
    return r.value;
  }

  /** Reads a rule only if it applies this year; returns null otherwise (and still records a sunsetting rule that was checked). */
  getIfApplies<T = unknown>(id: string, year: number): T | null {
    const r = rule<T>(id);
    if (this.disabled.has(id) || !ruleAppliesIn(r, year)) return null;
    this.used.set(id, r);
    return r.value;
  }

  /**
   * Reads a rule whether or not it has been verified, and remembers it was used so the
   * result lists it with its blank verified date. The one door for a rule whose source
   * could not be reached (build rule 9): the caller must flag every result that leans on it.
   */
  getUnverified<T = unknown>(id: string): { value: T; verified: boolean } {
    const r = loadRules().get(id);
    if (!r) throw new Error(`No rule "${id}" in data/rules-registry.json`);
    this.used.set(id, r);
    return { value: r.value as T, verified: isVerified(r) };
  }

  refs(): RuleRef[] {
    return [...this.used.values()].map(toRef);
  }

  /**
   * The rules used whose last check is older than the given number of months before a date
   * (the rules update routine's 15-month trigger). Flagged on every result, never refused (decision F7).
   */
  stale(asOf: string, months: number): RuleRef[] {
    const limit = new Date(`${asOf.slice(0, 10)}T00:00:00Z`);
    limit.setUTCMonth(limit.getUTCMonth() - months);
    return this.refs().filter((r) => r.lastVerified !== null && Date.parse(`${r.lastVerified}T00:00:00Z`) < limit.getTime());
  }

  /** The rules used whose source has not been checked (lastVerified is null). */
  unverified(): RuleRef[] {
    return this.refs().filter((r) => r.lastVerified === null);
  }

  /** The rules used that are sunsetting or under watch: the plan leans on something that may change (tripwire 1). */
  tripwires(): RuleRef[] {
    return this.refs().filter((r) => r.status === "sunsetting" || r.status === "watch");
  }
}
