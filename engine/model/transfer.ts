/**
 * Export and import of a household as versioned JSON (roadmap M1).
 * Pure: text in, household out, with every problem named. Storage and
 * snapshots are the UI's job.
 */

import { isIsoDate } from "./dates";
import { percentOfPay } from "./normalize";
import type { Household, IsoDate, PreTaxDeduction } from "./types";

export const EXPORT_FORMAT = "money-rooms-household";
export const EXPORT_VERSION = 1;

export interface HouseholdExport {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: IsoDate;
  app: { name: "Money Rooms"; schemaVersion: 1 };
  household: Household;
}

export function exportHousehold(h: Household, exportedAt: IsoDate): HouseholdExport {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt, app: { name: "Money Rooms", schemaVersion: h.schemaVersion }, household: h };
}

export function exportToJson(h: Household, exportedAt: IsoDate): string {
  return JSON.stringify(exportHousehold(h, exportedAt), null, 2);
}

/** A file name for the download, like money-rooms-2026-10-02.json. */
export function exportFileName(exportedAt: IsoDate): string {
  return `money-rooms-${exportedAt}.json`;
}

export type ImportResult = { ok: true; household: Household; exportedAt: IsoDate | null } | { ok: false; problems: string[] };

const LIST_KINDS = new Set(["unanswered", "none", "rows"]);

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Checks the shape a household must have before the engine can read it. Returns problems in plain words. */
export function validateHousehold(x: unknown): string[] {
  const problems: string[] = [];
  if (!isRecord(x)) return ["The household is not an object."];
  if (x.schemaVersion !== 1) problems.push(`Unknown household schema version ${String(x.schemaVersion)}. This app reads version 1.`);
  if (typeof x.asOf !== "string" || !isIsoDate(x.asOf)) problems.push("The plan date (asOf) is missing or not YYYY-MM-DD.");
  if (!isRecord(x.self)) problems.push("The person (self) is missing.");
  else {
    if (!isRecord(x.self.filingStatus)) problems.push("Filing status is missing.");
    if (!isRecord(x.self.income) || !LIST_KINDS.has(String(x.self.income.kind))) problems.push("Income is missing or malformed.");
    if (!isRecord(x.self.hsaEligible)) problems.push("HSA eligibility is missing.");
    if (!isRecord(x.self.socialSecurity)) problems.push("Social Security settings are missing.");
  }
  for (const key of ["spending", "accounts"] as const) {
    const list = x[key];
    if (!isRecord(list) || !LIST_KINDS.has(String(list.kind))) problems.push(`${key[0]!.toUpperCase()}${key.slice(1)} is missing or malformed.`);
    else if (list.kind === "rows" && !Array.isArray(list.rows)) problems.push(`${key} rows are not a list.`);
  }
  if (!isRecord(x.assumptions) || typeof x.assumptions.set !== "string" || !isRecord(x.assumptions.overrides)) problems.push("Assumptions are missing or malformed.");
  if (!isRecord(x.savingsStrategy)) problems.push("Savings strategy is missing.");
  if (!Array.isArray(x.goals)) problems.push("Goals are not a list.");
  return problems;
}

/**
 * Upgrades a household saved by an earlier build to the current shape, in place.
 * Run on every load and every import, so old saved data and old exports keep working.
 *
 * - Workplace contributions (401(k), 403(b)) used to be annual dollars. They are now a
 *   percent of the stream's pay with an account type (decision E15). The old dollar
 *   amount is converted at the stream's current pay and treated as traditional.
 */
export function migrateHousehold(h: Household): Household {
  for (const person of [h.self, h.partner]) {
    if (!person || person.income.kind !== "rows") continue;
    for (const stream of person.income.rows) {
      if (!stream.preTaxDeductions) continue;
      stream.preTaxDeductions = stream.preTaxDeductions.map((d): PreTaxDeduction => {
        const old = d as unknown as { id: string; type: string; annual?: { value: number; asOf: string; source: "user"; confidence: "known" }; percentOfPay?: unknown };
        if ((old.type === "401k" || old.type === "403b") && old.percentOfPay === undefined && old.annual) {
          return {
            id: old.id,
            type: old.type,
            percentOfPay: { ...old.annual, value: percentOfPay(old.annual.value, stream.grossAnnual.value) },
            accountType: { value: "traditional", asOf: old.annual.asOf, source: "preset", confidence: "known" },
          };
        }
        return d;
      });
    }
  }
  return h;
}

/** Reads an exported file. Accepts the envelope, or a bare household for convenience. */
export function importFromJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["The file is not valid JSON."] };
  }
  if (!isRecord(parsed)) return { ok: false, problems: ["The file does not contain an object."] };

  let candidate: unknown = parsed;
  let exportedAt: IsoDate | null = null;
  if ("format" in parsed) {
    if (parsed.format !== EXPORT_FORMAT) return { ok: false, problems: [`This is not a Money Rooms export (format "${String(parsed.format)}").`] };
    if (typeof parsed.version !== "number" || parsed.version > EXPORT_VERSION) {
      return { ok: false, problems: [`This export is version ${String(parsed.version)}, newer than this app can read (${EXPORT_VERSION}).`] };
    }
    candidate = parsed.household;
    exportedAt = typeof parsed.exportedAt === "string" && isIsoDate(parsed.exportedAt) ? parsed.exportedAt : null;
  }

  const problems = validateHousehold(candidate);
  if (problems.length) return { ok: false, problems };
  return { ok: true, household: migrateHousehold(candidate as Household), exportedAt };
}
