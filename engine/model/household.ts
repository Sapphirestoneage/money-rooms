/**
 * Building a household (data dictionary section 7, the level-one checklist).
 */

import { defaultHouseholdAssumptions } from "./assumptions";
import type { Household, IsoDate, Person } from "./types";
import { presetValue } from "./values";

/** A person with nothing answered yet, and the dictionary's defaults filled in. */
export function emptyPerson(asOf: IsoDate): Person {
  return {
    // 3.2: default single, confidence roughly. Source "preset" marks it as a default, not an entry.
    filingStatus: { ...presetValue("single" as const, asOf), confidence: "roughly" },
    income: { kind: "unanswered" },
    socialSecurity: {},
  };
}

/** A household with nothing answered yet. */
export function emptyHousehold(asOf: IsoDate): Household {
  return {
    schemaVersion: 1,
    asOf,
    self: emptyPerson(asOf),
    spending: { kind: "unanswered" },
    accounts: { kind: "unanswered" },
    assumptions: defaultHouseholdAssumptions(),
    goals: [],
  };
}

/** The level-one checklist items (section 7) that still need an answer. */
export type ChecklistItem = "birthDate" | "state" | "income" | "spending" | "accounts";

export function missingLevelOneAnswers(h: Household): ChecklistItem[] {
  const missing: ChecklistItem[] = [];
  if (!h.self.birthDate) missing.push("birthDate");
  if (!h.self.state) missing.push("state");
  if (h.self.income.kind === "unanswered") missing.push("income");
  if (h.spending.kind === "unanswered") missing.push("spending");
  if (h.accounts.kind === "unanswered") missing.push("accounts");
  return missing;
}
