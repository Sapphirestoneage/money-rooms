/**
 * Turns a household template (household-a.template.json, household-b.template.json) into a client
 * file, so the templates stay usable by every planet's tests as cards are built. Expected values in
 * the template are returned beside the file; a null expected value is "not asserted yet".
 */

import type { Account, ClientFile, Debt, IncomeStream, SpendingBucket } from "../../core";
import { newClientFile } from "../../core";
import type { Composite, Input } from "../../core";

export interface HouseholdTemplate {
  label: string;
  asOf: string;
  household: ClientFile["household"];
  income: (Omit<IncomeStream, "type" | "stability"> & { type: string; stability: Input<string> })[];
  spending: Record<string, Composite>;
  debts: (Omit<Debt, "kind"> & { kind: string })[];
  accounts: (Omit<Account, "taxBucket" | "liquidityTier"> & { taxBucket: string; liquidityTier: string })[];
  safetyNet: ClientFile["drawers"]["facts"]["safetyNet"];
  expected: Record<string, unknown>;
}

const asInput = <T>(status: string, value?: T): Input<T> => ({ status: status as Input["status"], ...(value !== undefined ? { value } : {}) });

export function fileFromTemplate(t: HouseholdTemplate, id: string): { file: ClientFile; expected: Record<string, unknown> } {
  const file = newClientFile(t.label, t.asOf, id);
  file.household = t.household;
  const facts = file.drawers.facts;
  for (const s of t.income) {
    const { type, stability, ...rest } = s;
    facts.income[s.id] = { ...rest, type: asInput("entered", type as IncomeStream["type"]["value"]), stability: stability as IncomeStream["stability"] };
  }
  for (const [category, monthly] of Object.entries(t.spending)) facts.spending[category] = { category, monthly } satisfies SpendingBucket;
  for (const d of t.debts) {
    const { kind, ...rest } = d;
    facts.debts[d.id] = { ...rest, kind: asInput("entered", kind as Debt["kind"]["value"]) };
  }
  for (const a of t.accounts) {
    const { taxBucket, liquidityTier, ...rest } = a;
    facts.accounts[a.id] = { ...rest, taxBucket: asInput("entered", taxBucket as Account["taxBucket"]["value"]), liquidityTier: asInput("entered", liquidityTier as Account["liquidityTier"]["value"]) };
  }
  facts.safetyNet = t.safetyNet;
  return { file, expected: t.expected };
}
