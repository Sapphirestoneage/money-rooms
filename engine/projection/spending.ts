/**
 * Spending for one year (engine spec section 3, step 5). Working years use the
 * entered categories. Retirement years use the baseline, with discretionary
 * categories scaled by life phase (data dictionary 5.1).
 */

import type { LifePhase, SpendingRow } from "../model";
import { getSpendingCategory } from "../model";
import { endReached, periodShare, type YearContext } from "./income";

export interface SpendingLine {
  rowId: string;
  category: string;
  /** Before proration. */
  amount: number;
  phaseMultiplier: number;
}

export interface YearSpending {
  lines: SpendingLine[];
  total: number;
  phaseId: string | null;
}

/** The life phase for an age in retirement, or null while working. */
export function phaseForAge(age: number, phases: readonly LifePhase[]): LifePhase | undefined {
  return phases.find((p) => (p.startAge === null || age >= p.startAge) && (p.endAge === null || age <= p.endAge));
}

export function spendingForYear(
  rows: readonly SpendingRow[],
  ctx: YearContext,
  retired: boolean,
  phases: readonly LifePhase[],
): YearSpending {
  const phase = retired ? phaseForAge(ctx.age, phases) : undefined;
  const out: YearSpending = { lines: [], total: 0, phaseId: phase?.id ?? null };

  for (const row of rows) {
    // A row counts from its start month and through its end month, by the months it applies.
    if (row.end && row.end.kind !== "date" && endReached(row.end, ctx)) continue;
    const share = periodShare(row.start, row.end?.kind === "date" ? row.end.date : undefined, ctx);
    if (share <= 0) continue;
    const category = getSpendingCategory(row.category);
    let amount = row.annual.value * share;
    let multiplier = 1;

    if (retired) {
      const continues = row.continuesInRetirement?.value ?? category.continuesInRetirement;
      if (continues === "no") amount = 0;
      else if (continues === "changes") amount = (row.retirementAnnual?.value ?? row.annual.value) * share;
      if (category.type === "discretionary" && phase) multiplier = phase.discretionaryMultiplier;
    }

    const line = { rowId: row.id, category: row.category, amount: amount * multiplier, phaseMultiplier: multiplier };
    out.lines.push(line);
    out.total += line.amount;
  }
  return out;
}
