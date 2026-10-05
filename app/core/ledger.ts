/**
 * The Ledger (ARCHITECTURE.md section 2, rule 3): real changes enter only here. Each entry names a
 * path; the Ledger routes it to the fact's owner planet, and only the owner's write is applied.
 */

import type { ClientFile, LedgerEntry } from "./model";
import { getPath, setPath, underPath, clone } from "./paths";
import type { IsoDate } from "./values";

export type Planet = "sun" | "income" | "spending" | "debt" | "safetyNet" | "investments" | "taxes" | "lifePlan";
export const PLANETS: readonly Planet[] = ["sun", "income", "spending", "debt", "safetyNet", "investments", "taxes", "lifePlan"];

/** Every fact has exactly one owner (DATA_MODEL.md section 2). The longest matching prefix wins. */
export const OWNERS: readonly { prefix: string; owner: Planet }[] = [
  { prefix: "client", owner: "sun" },
  { prefix: "household", owner: "sun" },
  { prefix: "drawers.facts.income", owner: "income" },
  { prefix: "drawers.facts.spending", owner: "spending" },
  { prefix: "drawers.facts.debts", owner: "debt" },
  { prefix: "drawers.facts.safetyNet", owner: "safetyNet" },
  { prefix: "drawers.facts.accounts", owner: "investments" },
  { prefix: "drawers.goals", owner: "lifePlan" },
  // The assumptions and scenarios drawers belong to the coach and the simulator, routed through the Sun.
  { prefix: "drawers.assumptions", owner: "sun" },
  { prefix: "drawers.scenarios", owner: "sun" },
];

export function ownerOf(path: string): Planet {
  let best: { prefix: string; owner: Planet } | null = null;
  for (const o of OWNERS) if (underPath(path, o.prefix) && (!best || o.prefix.length > best.prefix.length)) best = o;
  if (!best) throw new Error(`No planet owns ${path}; add it to DATA_MODEL.md and OWNERS first.`);
  return best.owner;
}

export interface Change {
  path: string;
  to: unknown;
  by: LedgerEntry["by"];
  why: string;
  at: IsoDate;
}

const PROTECTED = ["schemaVersion", "app", "ledger", "snapshots", "updatedAt"];

/** Routes a change to its owner and applies it. Returns the new file and the entry; the input file is not mutated. */
export function applyChange(file: ClientFile, change: Change): { file: ClientFile; entry: LedgerEntry } {
  if (PROTECTED.some((p) => underPath(change.path, p))) throw new Error(`${change.path} is not a fact; it cannot be changed through the Ledger.`);
  const owner = ownerOf(change.path);
  const next = clone(file);
  const from = getPath(next, change.path);
  setPath(next as unknown as Record<string, unknown>, change.path, clone(change.to));
  const entry: LedgerEntry = { id: `l${next.ledger.length + 1}-${change.at}`, at: change.at, by: change.by, path: change.path, from: clone(from), to: clone(change.to), why: change.why, owner };
  next.ledger.push(entry);
  next.updatedAt = change.at;
  return { file: next, entry };
}

/** A planet writing as itself: refused unless it owns the path. The door through which planets write. */
export function writeAs(planet: Planet, file: ClientFile, change: Change): { file: ClientFile; entry: LedgerEntry } {
  const owner = ownerOf(change.path);
  if (owner !== planet) throw new Error(`${planet} cannot write ${change.path}: it belongs to ${owner}.`);
  return applyChange(file, change);
}

/** Entries for one planet's facts, newest last. */
export function entriesFor(file: ClientFile, planet: Planet): LedgerEntry[] {
  return file.ledger.filter((e) => e.owner === planet);
}
