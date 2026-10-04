/**
 * The module registry (docs/module-contract.md, decision A5). Every feature beyond the core
 * is a module with a manifest in data/modules/<id>.json. The app discovers modules only
 * through this registry: which exist, what each reads and adds, where it sits, when it
 * unlocks, and whether its flag is off, beta, or on. Manifests are validated once, on load,
 * and an invalid manifest throws so a bad module cannot ship. Pure functions.
 */

import type { Household } from "../model";

export type ModuleFlag = "off" | "beta" | "on";
export type ModuleLevel = 1 | 2 | 3 | 4 | 5;
export type ModuleTier = "easy" | "intermediate" | "advanced" | "expert";

export type UnlockCondition =
  | { kind: "always"; text: string }
  | { kind: "hasDebt"; excludeMortgage?: boolean; text: string }
  | { kind: "hasAccounts"; text: string }
  | { kind: "hasField"; path: string; text: string };

export interface ModuleCard {
  id: string;
  level: ModuleLevel;
  screen: string;
}

export interface ModuleManifest {
  id: string;
  name: string;
  /** One sentence beginning "answers: ". */
  job: string;
  /** True only for the core manifest, which the budget counts but the kill criteria skip. */
  core?: boolean;
  /** Dictionary fields the module reads, as paths from the household record (self.birthDate, accounts[].rate). */
  reads: string[];
  adds: {
    /** New dictionary fields the module introduces (paths), each proposed in the dictionary first. */
    fields: string[];
    cards: ModuleCard[];
    lenses: string[];
    metrics: string[];
    items: string[];
    /** Hash routes the module owns. */
    screens: string[];
    /** Each new idea a screen has to teach, one per screen at most (complexity budget rule 3). */
    concepts: { screen: string; concept: string }[];
  };
  placement: { level?: ModuleLevel; tier?: ModuleTier; pack?: string; lensGroup?: string; screen: string };
  unlock: UnlockCondition;
  engine: { capabilities: string[]; coreChanges: string[] };
  flag: ModuleFlag;
  killCriteria: { measure: string; threshold: string; action: string } | null;
  tests: { goldenHousehold: string | null; acceptance: string[] };
  /** Source files the module owns; the contract test scans them for fields outside `reads` and `adds.fields`. */
  files: string[];
  /** Content files whose sentences the wording scan covers. */
  copy: string[];
  checklist: { spec: string | null; decision: string | null; axe: { date: string; routes: string[] } | null; docs: string[] };
  /** What the module takes the place of when its cards would overfill a level (complexity budget rule 5). */
  replaces: string[];
}

/** Top-level keys of the household record a module may read (engine/model/types.ts, `Household`). */
export const HOUSEHOLD_KEYS: readonly string[] = ["schemaVersion", "asOf", "self", "partner", "spending", "accounts", "assumptions", "savingsStrategy", "goals", "plans", "businesses", "drawdown", "smallWins", "resilience", "milestones", "legacy", "blocks", "risk", "history", "dependents", "home", "hardSeason"];

const FLAGS: readonly ModuleFlag[] = ["off", "beta", "on"];
const LEVELS: readonly number[] = [1, 2, 3, 4, 5];
const UNLOCK_KINDS = ["always", "hasDebt", "hasAccounts", "hasField"];

/** Every problem with a manifest, in plain words. Empty means valid. */
export function validateManifest(raw: unknown): string[] {
  const errors: string[] = [];
  const m = raw as Partial<ModuleManifest>;
  const id = typeof m.id === "string" ? m.id : "(no id)";
  const need = (ok: boolean, msg: string) => { if (!ok) errors.push(`${id}: ${msg}`); };
  need(typeof m.id === "string" && /^[a-z][a-z0-9-]*$/.test(m.id ?? ""), "id must be lower-case letters, digits, and hyphens");
  need(typeof m.name === "string" && m.name.length > 0, "name is required");
  need(typeof m.job === "string" && m.job.startsWith("answers: "), 'job must be one sentence beginning "answers: "');
  need(Array.isArray(m.reads) && m.reads.every((r) => typeof r === "string"), "reads must be a list of field paths");
  for (const r of m.reads ?? []) need(HOUSEHOLD_KEYS.includes(r.split(/[.[]/)[0]!), `reads "${r}" does not start at a household field`);
  const a = m.adds;
  need(!!a && typeof a === "object", "adds is required");
  if (a) {
    for (const k of ["fields", "lenses", "metrics", "items", "screens"] as const) need(Array.isArray(a[k]) && a[k].every((x) => typeof x === "string"), `adds.${k} must be a list of strings`);
    need(Array.isArray(a.cards) && a.cards.every((c) => typeof c.id === "string" && LEVELS.includes(c.level) && typeof c.screen === "string"), "adds.cards must list {id, level 1 to 5, screen}");
    need(Array.isArray(a.concepts) && a.concepts.every((c) => typeof c.screen === "string" && typeof c.concept === "string"), "adds.concepts must list {screen, concept}");
    for (const s of a.screens ?? []) need(s.startsWith("#/"), `adds.screens "${s}" must be a hash route`);
  }
  need(!!m.placement && typeof m.placement.screen === "string", "placement.screen is required");
  if (m.placement?.level !== undefined) need(LEVELS.includes(m.placement.level), "placement.level must be 1 to 5");
  need(!!m.unlock && UNLOCK_KINDS.includes(m.unlock.kind) && typeof m.unlock.text === "string", `unlock must be one of ${UNLOCK_KINDS.join(", ")} with its text`);
  need(!!m.engine && Array.isArray(m.engine.capabilities) && Array.isArray(m.engine.coreChanges), "engine.capabilities and engine.coreChanges are required lists");
  need(FLAGS.includes(m.flag as ModuleFlag), `flag must be one of ${FLAGS.join(", ")}`);
  if (m.core) need(m.killCriteria === null, "the core has no kill criteria");
  else need(!!m.killCriteria && typeof m.killCriteria.measure === "string" && typeof m.killCriteria.threshold === "string" && typeof m.killCriteria.action === "string", "killCriteria needs measure, threshold, and action");
  need(!!m.tests && (m.tests.goldenHousehold === null || typeof m.tests.goldenHousehold === "string") && Array.isArray(m.tests.acceptance), "tests.goldenHousehold (path or null) and tests.acceptance are required");
  need(Array.isArray(m.files), "files must be a list");
  need(Array.isArray(m.copy), "copy must be a list");
  need(!!m.checklist && Array.isArray(m.checklist.docs), "checklist with docs is required");
  need(Array.isArray(m.replaces), "replaces must be a list");
  return errors;
}

const manifestFiles = import.meta.glob<{ default: unknown }>("../../data/modules/*.json", { eager: true });

let cache: readonly ModuleManifest[] | null = null;

/** Every manifest in data/modules, validated, the core first then by id. Throws on an invalid manifest or a duplicate id. */
export function loadModules(): readonly ModuleManifest[] {
  if (cache) return cache;
  const out: ModuleManifest[] = [];
  const seen = new Set<string>();
  for (const path of Object.keys(manifestFiles).sort()) {
    const raw = manifestFiles[path]!.default;
    const errors = validateManifest(raw);
    if (errors.length) throw new Error(`module manifest ${path}:\n${errors.join("\n")}`);
    const m = raw as ModuleManifest;
    if (seen.has(m.id)) throw new Error(`module manifest ${path}: duplicate id ${m.id}`);
    seen.add(m.id);
    out.push(m);
  }
  out.sort((x, y) => (x.core ? -1 : y.core ? 1 : x.id.localeCompare(y.id)));
  cache = out;
  return out;
}

export function moduleById(id: string): ModuleManifest | null {
  return loadModules().find((m) => m.id === id) ?? null;
}

/** Whether a module's unlock condition holds for this household. */
export function moduleUnlocked(m: ModuleManifest, h: Household): boolean {
  const u = m.unlock;
  switch (u.kind) {
    case "always":
      return true;
    case "hasAccounts":
      return h.accounts.kind === "rows" && h.accounts.rows.length > 0;
    case "hasDebt":
      return h.accounts.kind === "rows" && h.accounts.rows.some((a) => a.side === "debt" && (a.balance.value ?? 0) > 0 && !(u.excludeMortgage && a.preset.toLowerCase().includes("mortgage")));
    case "hasField": {
      let v: unknown = h;
      for (const part of u.path.split(".")) {
        if (v === null || typeof v !== "object") return false;
        v = (v as Record<string, unknown>)[part];
      }
      return v !== undefined && v !== null;
    }
  }
}

/** Whether a flag shows: on always, beta only when the beta setting is on, off never. */
export function flagShows(flag: ModuleFlag, beta: boolean): boolean {
  return flag === "on" || (flag === "beta" && beta);
}

/** The modules this household sees right now: flag showing and unlocked. The core is always included. */
export function activeModules(h: Household, settings: { beta: boolean }): ModuleManifest[] {
  return loadModules().filter((m) => m.core || (flagShows(m.flag, settings.beta) && moduleUnlocked(m, h)));
}

export function isModuleActive(id: string, h: Household, settings: { beta: boolean }): boolean {
  return activeModules(h, settings).some((m) => m.id === id);
}
