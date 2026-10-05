/**
 * The schema version on every saved file and the migration that brings older files forward,
 * one step at a time (DATA_MODEL.md section 5). A file newer than this app is refused plainly.
 */

import { defaultAssumptions } from "./assumptions";
import type { ClientFile } from "./model";
import { empty, type IsoDate } from "./values";

export const SCHEMA_VERSION = 1;
export const APP_ID = "money-rooms-v1";

export function newClientFile(label: string, today: IsoDate, id = `client-${Date.now().toString(36)}`): ClientFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: APP_ID,
    client: { id, label, createdAt: today, notes: "" },
    updatedAt: today,
    household: {
      people: [{ id: "self", role: "self", birthDate: empty<string>() }],
      filingStatus: { status: "rough", value: "single", source: "default", note: "Defaults to single until entered." },
      state: empty<string>(),
      localTaxPercent: none(),
    },
    drawers: {
      facts: { income: {}, spending: {}, debts: {}, accounts: {}, safetyNet: { incomeStability: { status: "rough", value: "steady", source: "default" }, monthsToClose: { status: "rough", value: 12, source: "default" } } },
      assumptions: defaultAssumptions(),
      goals: [],
      scenarios: [],
    },
    ledger: [],
    snapshots: [],
  };
}

function none() {
  return { status: "none" as const, source: "default" as const };
}

/** One migration per version step: from version n to n + 1. Each must be pure. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // 0 -> 1: files written before the schema version existed. They carried the drawers but no version, app id, ledger, or snapshots.
  0: (raw) => ({
    ...raw,
    schemaVersion: 1,
    app: APP_ID,
    ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
    snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
  }),
};

export interface MigrationResult {
  file: ClientFile;
  /** The versions the file passed through, oldest first. Empty when it was already current. */
  steps: number[];
}

/** Brings a parsed file forward to SCHEMA_VERSION. Throws a plain sentence for a file this app cannot read. */
export function migrate(raw: unknown): MigrationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("This is not a Money Rooms client file.");
  let current = { ...(raw as Record<string, unknown>) };
  const version = typeof current.schemaVersion === "number" ? current.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new Error(`This file was saved by a newer Money Rooms (schema ${version}); this app reads up to schema ${SCHEMA_VERSION}.`);
  const steps: number[] = [];
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from schema ${v} to ${v + 1}.`);
    current = step(current);
    steps.push(v);
  }
  const problems = validate(current);
  if (problems.length) throw new Error(`The file is not a complete client file: ${problems.join("; ")}.`);
  return { file: current as unknown as ClientFile, steps };
}

/** The structural checks a file must pass. Plain sentences, empty when valid. */
export function validate(raw: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (raw.app !== APP_ID) out.push(`app is ${String(raw.app)}, not ${APP_ID}`);
  if (raw.schemaVersion !== SCHEMA_VERSION) out.push(`schemaVersion is ${String(raw.schemaVersion)}`);
  const client = raw.client as Record<string, unknown> | undefined;
  if (!client || typeof client.id !== "string" || typeof client.label !== "string") out.push("client needs an id and a label");
  const household = raw.household as Record<string, unknown> | undefined;
  const people = household?.people;
  if (!Array.isArray(people) || people.length < 1 || people.length > 2) out.push("household needs one or two people");
  const drawers = raw.drawers as Record<string, unknown> | undefined;
  for (const d of ["facts", "assumptions", "goals", "scenarios"]) if (!drawers || !(d in drawers)) out.push(`drawer ${d} is missing`);
  if (!Array.isArray(raw.ledger)) out.push("ledger must be a list");
  if (!Array.isArray(raw.snapshots)) out.push("snapshots must be a list");
  return out;
}

export function serialize(file: ClientFile): string {
  return JSON.stringify(file, null, 2);
}

export function parse(text: string): MigrationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  return migrate(raw);
}
