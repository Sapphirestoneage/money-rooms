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
  /** Local earned income tax (Pennsylvania municipalities), separate from the state line. */
  local: number;
}

/** State-specific departures from federal AGI (registry rule `state.PA.compensation`, dictionary 9.15). */
export interface StateAdjustments {
  /** Dollars the state taxes that federal AGI leaves out: workplace retirement deferrals, the deductible half of self-employment tax. */
  addBack: number;
  /** Local earned income tax, percent. */
  localTaxPercent: number;
  /** The local tax base: wages plus net profit. */
  localBase: number;
}

/**
 * @param income Federal adjusted gross income. M1 starts every state from it.
 */
export function computeStateTax(
  income: number,
  state: StateCode,
  filingStatus: FilingStatus,
  tables: TaxTables,
  adjustments: StateAdjustments = { addBack: 0, localTaxPercent: 0, localBase: 0 },
): StateTaxResult {
  const local = (Math.max(0, adjustments.localBase) * adjustments.localTaxPercent) / 100;
  const table = tables.states[state];
  if (table.structure === "none" || !table.brackets) {
    return { taxableIncome: 0, tax: 0, marginalRate: 0, local };
  }
  const column = stateColumnFor(filingStatus);
  const deduction = table.standardDeduction ? table.standardDeduction[column] : 0;
  const taxableIncome = Math.max(0, income + adjustments.addBack - deduction);
  const schedule = table.brackets[column];
  return {
    taxableIncome,
    tax: taxFromBrackets(taxableIncome, schedule),
    marginalRate: taxableIncome > 0 ? marginalRateFromBrackets(taxableIncome, schedule) : 0,
    local,
  };
}
