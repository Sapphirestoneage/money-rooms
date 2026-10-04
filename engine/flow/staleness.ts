/**
 * Staleness and the Refresh card (docs/m3-spec.md section 8, decision L8).
 * A value's plausible range widens with time since its as-of date until it is
 * re-confirmed. Pure functions over the household; clocks from data/materiality.json.
 */

import materiality from "../../data/materiality.json";
import type { Household, IsoDate, YearMonth } from "../model";
import { INCOME_TYPE_NAMES, monthsBetween, yearMonthOf } from "../model";

export type StalenessClass = "balances" | "debts" | "income" | "spending" | "facts";

export interface AgedValue {
  inputId: string;
  label: string;
  kind: StalenessClass;
  /** The stored value, for display. */
  value: number;
  asOf: IsoDate;
  /** Months since the as-of date. */
  ageMonths: number;
  /** Months until the next check, negative when overdue. */
  nextCheckInMonths: number;
  /** The month the next check falls due. */
  nextCheck: YearMonth;
  /** True once the value has aged to the point its range is treated as roughly. */
  widenedToRoughly: boolean;
  /** Writes a fresh as-of date (confirming the value as unchanged), or a new value. */
  confirm(h: Household, today: IsoDate, newValue?: number): void;
}

function clock(kind: StalenessClass): { nextCheckMonths: number | null; widensToRoughlyMonths: number | null } {
  return materiality.staleness[kind];
}

function addMonths(ym: YearMonth, n: number): YearMonth {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Every dated value with a clock, with how old it is. Values past their next check are "aged". */
export function datedValues(h: Household, today: IsoDate = h.asOf): AgedValue[] {
  const out: AgedValue[] = [];
  const now = yearMonthOf(today);
  const push = (inputId: string, label: string, kind: StalenessClass, value: number, asOf: IsoDate, confirm: AgedValue["confirm"]) => {
    const c = clock(kind);
    if (c.nextCheckMonths === null) return;
    const ageMonths = Math.max(0, monthsBetween(yearMonthOf(asOf), now));
    out.push({
      inputId,
      label,
      kind,
      value,
      asOf,
      ageMonths,
      nextCheckInMonths: c.nextCheckMonths - ageMonths,
      nextCheck: addMonths(yearMonthOf(asOf), c.nextCheckMonths),
      widenedToRoughly: c.widensToRoughlyMonths !== null && ageMonths >= c.widensToRoughlyMonths,
      confirm,
    });
  };
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.balance.value === null) continue;
      push(`account.${a.id}.balance`, `${a.name?.value ?? a.preset} balance`, a.side === "debt" ? "debts" : "balances", a.balance.value, a.balance.asOf, (c, t, v) => {
        if (c.accounts.kind !== "rows") return;
        const row = c.accounts.rows.find((x) => x.id === a.id);
        if (row && row.balance.value !== null) row.balance = { ...row.balance, value: v ?? row.balance.value, asOf: t, source: "user" };
      });
    }
  }
  if (h.self.income.kind === "rows") {
    for (const s of h.self.income.rows) {
      push(`income.${s.id}.grossAnnual`, `${s.label ?? INCOME_TYPE_NAMES[s.type]} income`, "income", s.grossAnnual.value, s.grossAnnual.asOf, (c, t, v) => {
        if (c.self.income.kind !== "rows") return;
        const row = c.self.income.rows.find((x) => x.id === s.id);
        if (row) row.grossAnnual = { ...row.grossAnnual, value: v ?? row.grossAnnual.value, asOf: t, source: "user" };
      });
    }
  }
  if (h.spending.kind === "rows") {
    for (const r of h.spending.rows) {
      push(`spending.${r.id}.annual`, `${r.label ?? r.category} spending`, "spending", r.annual.value, r.annual.asOf, (c, t, v) => {
        if (c.spending.kind !== "rows") return;
        const row = c.spending.rows.find((x) => x.id === r.id);
        if (row) row.annual = { ...row.annual, value: v ?? row.annual.value, asOf: t, source: "user" };
      });
    }
  }
  return out;
}

/** The values past their next check, oldest first. */
export function agedValues(h: Household, today: IsoDate = h.asOf): AgedValue[] {
  return datedValues(h, today).filter((v) => v.nextCheckInMonths <= 0).sort((a, b) => b.ageMonths - a.ageMonths);
}

/** How many minutes the Refresh card says the aged numbers take: about a minute and a half each. */
export function refreshMinutes(aged: readonly AgedValue[]): number {
  return Math.max(1, Math.round(aged.length * 1.5));
}

/** The widened kind for a value, for materiality: an aged value is tested at the roughly range. */
export function effectiveRangeKind(stored: "known" | "lookUp" | "roughly", aged: AgedValue | undefined): "known" | "lookUp" | "roughly" {
  if (aged?.widenedToRoughly) return "roughly";
  return stored;
}
