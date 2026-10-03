/**
 * Tax tables, loaded from data/tax/<year>.json (engine spec section 5, decision E9).
 * The engine never contains a tax rate. Everything here is read from the file and validated.
 */

import tax2026 from "../../data/tax/2026.json";
import { STATE_CODES, type FilingStatus, type StateCode } from "./types";

/** One marginal bracket: `rate` (percent) applies to taxable income above `from`. */
export interface Bracket {
  from: number;
  rate: number;
}

export type BracketSchedule = readonly Bracket[];

export type ByFilingStatus<T> = Record<FilingStatus, T>;

export interface FederalTables {
  ordinaryBrackets: ByFilingStatus<BracketSchedule>;
  standardDeduction: ByFilingStatus<number> & {
    additionalAgedOrBlind: number;
    additionalAgedOrBlindUnmarried: number;
  };
  fica: {
    socialSecurityRate: number;
    socialSecurityWageBase: number;
    medicareRate: number;
    additionalMedicareRate: number;
    additionalMedicareThreshold: ByFilingStatus<number>;
  };
  selfEmployment: {
    rate: number;
    socialSecurityPortion: number;
    medicarePortion: number;
    netEarningsFactor: number;
    halfDeductibleFromIncome: boolean;
    minimumNetEarnings: number;
  };
  earlyWithdrawalPenalty: { rate: number; beforeAge: number };
  contributionLimits: {
    workplaceElective: number;
    workplaceCatchUp50: number;
    workplaceCatchUp60to63: number;
    ira: number;
    iraCatchUp50: number;
    hsaSelfOnly: number;
    hsaFamily: number;
    hsaCatchUp55: number;
    rothIraPhaseOut: Record<FilingStatus, readonly [start: number, end: number] | null>;
  };
}

export type StateStructure = "none" | "flat" | "graduated";

/** The two columns state tables carry. Other filing statuses map onto these (see stateColumnFor). */
export type StateColumn = "single" | "marriedJoint";

export interface StateTable {
  name: string;
  structure: StateStructure;
  brackets: Record<StateColumn, BracketSchedule> | null;
  standardDeduction: Record<StateColumn, number> | null;
  /** known when verified against the state's own source; lookUp when from the compilation. */
  confidence: "known" | "lookUp";
  verified: string | null;
  source: { kind: "official" | "secondary"; document: string; url: string };
  notes?: readonly string[];
}

export interface TaxTables {
  year: number;
  retrieved: string;
  federal: FederalTables;
  states: Record<StateCode, StateTable>;
}

const FILING_STATUSES: readonly FilingStatus[] = ["single", "marriedJoint", "marriedSeparate", "headOfHousehold"];

export function validateBrackets(brackets: BracketSchedule, where: string): void {
  if (brackets.length === 0) throw new Error(`${where}: at least one bracket is required`);
  if (brackets[0]?.from !== 0) throw new Error(`${where}: the first bracket must start at 0`);
  let lastFrom = -1;
  for (const b of brackets) {
    if (!(b.from > lastFrom)) throw new Error(`${where}: brackets must ascend (saw ${b.from} after ${lastFrom})`);
    if (!(b.rate >= 0 && b.rate <= 100)) throw new Error(`${where}: rate ${b.rate} is not a percent between 0 and 100`);
    lastFrom = b.from;
  }
}

function validateFederal(f: FederalTables): void {
  for (const status of FILING_STATUSES) {
    validateBrackets(f.ordinaryBrackets[status], `federal brackets ${status}`);
    if (!(f.standardDeduction[status] > 0)) throw new Error(`federal standard deduction ${status} must be positive`);
    if (!(f.fica.additionalMedicareThreshold[status] > 0)) throw new Error(`additional Medicare threshold ${status} must be positive`);
  }
  if (!(f.fica.socialSecurityWageBase > 0)) throw new Error("Social Security wage base must be positive");
  if (!(f.selfEmployment.netEarningsFactor > 0 && f.selfEmployment.netEarningsFactor <= 1)) {
    throw new Error("self-employment net earnings factor must be a fraction between 0 and 1");
  }
  if (Math.abs(f.selfEmployment.socialSecurityPortion + f.selfEmployment.medicarePortion - f.selfEmployment.rate) > 1e-9) {
    throw new Error("self-employment portions must sum to the rate");
  }
}

function validateState(code: string, s: StateTable): void {
  if (s.structure === "none") {
    if (s.brackets !== null) throw new Error(`state ${code}: a no-tax state must not have brackets`);
    return;
  }
  if (!s.brackets) throw new Error(`state ${code}: brackets are required`);
  validateBrackets(s.brackets.single, `state ${code} single`);
  validateBrackets(s.brackets.marriedJoint, `state ${code} marriedJoint`);
  if (s.standardDeduction) {
    if (s.standardDeduction.single < 0 || s.standardDeduction.marriedJoint < 0) {
      throw new Error(`state ${code}: standard deduction cannot be negative`);
    }
  }
}

const cache = new Map<number, TaxTables>();

/** The tax tables for a year, validated once and cached. Only 2026 exists so far. */
export function loadTaxTables(year = 2026): TaxTables {
  const cached = cache.get(year);
  if (cached) return cached;
  if (year !== 2026) throw new Error(`No tax tables for ${year}. Add data/tax/${year}.json first.`);

  const raw = tax2026;
  const federal = raw.federal as unknown as FederalTables;
  validateFederal(federal);

  const states = {} as Record<StateCode, StateTable>;
  for (const code of STATE_CODES) {
    const s = (raw.states as Record<string, unknown>)[code] as StateTable | undefined;
    if (!s) throw new Error(`data/tax/${year}.json is missing state ${code}`);
    validateState(code, s);
    states[code] = s;
  }

  const tables: TaxTables = Object.freeze({ year: raw._meta.year, retrieved: raw._meta.retrieved, federal, states });
  cache.set(year, tables);
  return tables;
}

/**
 * Which state column a filing status reads (M1 approximation). State tables carry
 * single and joint columns only. Separate filers read single. Head of household
 * reads single, which is the more conservative choice where states differ.
 */
export function stateColumnFor(status: FilingStatus): StateColumn {
  return status === "marriedJoint" ? "marriedJoint" : "single";
}

export function stateTable(state: StateCode, year = 2026): StateTable {
  return loadTaxTables(year).states[state];
}
