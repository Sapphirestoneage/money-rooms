/**
 * State income tax for M1 (decision E9): the state's brackets applied to
 * income minus the state standard deduction. Exemptions, credits, and local
 * taxes wait for M2.
 */

import type { FilingStatus, StateCode, TaxTables } from "../model";
import { stateColumnFor } from "../model";
import { marginalRateFromBrackets, taxFromBrackets } from "./brackets";

export interface StateTaxResult {
  taxableIncome: number;
  tax: number;
  /** Percent on the next dollar. */
  marginalRate: number;
}

/**
 * @param income Federal adjusted gross income. M1 starts every state from it.
 */
export function computeStateTax(
  income: number,
  state: StateCode,
  filingStatus: FilingStatus,
  tables: TaxTables,
): StateTaxResult {
  const table = tables.states[state];
  if (table.structure === "none" || !table.brackets) {
    return { taxableIncome: 0, tax: 0, marginalRate: 0 };
  }
  const column = stateColumnFor(filingStatus);
  const deduction = table.standardDeduction ? table.standardDeduction[column] : 0;
  const taxableIncome = Math.max(0, income - deduction);
  const schedule = table.brackets[column];
  return {
    taxableIncome,
    tax: taxFromBrackets(taxableIncome, schedule),
    marginalRate: taxableIncome > 0 ? marginalRateFromBrackets(taxableIncome, schedule) : 0,
  };
}
