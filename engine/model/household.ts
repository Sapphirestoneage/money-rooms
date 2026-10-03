/**
 * Building a household (data dictionary section 8, the level-one checklist).
 */

import { defaultHouseholdAssumptions } from "./assumptions";
import type { Household, IncomeType, IsoDate, Person } from "./types";
import { presetValue } from "./values";

/** A person with nothing answered yet, and the dictionary's defaults filled in. */
export function emptyPerson(asOf: IsoDate): Person {
  return {
    // 3.2: default single, confidence roughly. Source "preset" marks it as a default, not an entry.
    filingStatus: { ...presetValue("single" as const, asOf), confidence: "roughly" },
    income: { kind: "unanswered" },
    // 3.7: default no, roughly.
    hsaEligible: { ...presetValue(false, asOf), confidence: "roughly" },
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
    // 4.6: default enteredOnly, roughly. What professional planning software does by default.
    savingsStrategy: { ...presetValue("enteredOnly" as const, asOf), confidence: "roughly" },
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

/**
 * Debts whose interest rate has not been answered (data dictionary 3.6: the rate
 * is required). A debt added from a preset with no typical rate carries a
 * placeholder marked "look it up" from the preset until the person enters it.
 */
export function debtsNeedingRate(h: Household): { id: string; label: string }[] {
  if (h.accounts.kind !== "rows") return [];
  const out: { id: string; label: string }[] = [];
  for (const a of h.accounts.rows) {
    if (a.side === "debt" && a.rate.source === "preset" && a.rate.confidence === "lookUp") {
      out.push({ id: a.id, label: a.name?.value ?? a.id });
    }
  }
  return out;
}

/** Plain names for income types, used when a stream has no name of its own. */
export const INCOME_TYPE_NAMES: Readonly<Record<IncomeType, string>> = {
  salary: "Salary", hourly: "Hourly job", selfEmployed: "Self-employment", sideGig: "Side gig", unemployment: "Unemployment benefits", allowance: "Allowance", rental: "Rental", other: "Other income",
};

/** The names of income streams marked expected but not confirmed (data dictionary 3.4). */
export function unconfirmedIncome(h: Household): string[] {
  if (h.self.income.kind !== "rows") return [];
  return h.self.income.rows.filter((s) => s.notConfirmed === true).map((s) => s.label ?? INCOME_TYPE_NAMES[s.type]);
}
