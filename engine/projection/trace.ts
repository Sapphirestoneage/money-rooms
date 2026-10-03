/**
 * Traces (engine spec section 7): for the FI date, which inputs produced it and
 * how much each one moves it. M1 measures this directly: nudge one input, rerun
 * the search, report the change in the FI age. Ranked by size of effect.
 */

import type { BandName, Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand } from "./bands";
import { defaultDeps, findFiDate, type Deps } from "./fi";
import { requireComplete } from "./timeline";

export interface TraceEntry {
  /** A stable id for the input, so the UI can link to its field. */
  inputId: string;
  label: string;
  /** The stored value today. */
  value: number;
  /** What the input was changed to for the test. */
  testedValue: number;
  /** FI age with the input as entered. */
  fiAge: number | null;
  /** FI age with the tested value. */
  fiAgeTested: number | null;
  /** Years the FI date moves (positive means later). Null when either run is never funded. */
  deltaYears: number | null;
}

export interface FiTrace {
  band: BandName;
  fiAge: number | null;
  entries: TraceEntry[];
}

type Nudge = { inputId: string; label: string; value: number; testedValue: number; apply: (h: Household) => void };

const clone = <T>(x: T): T => structuredClone(x);

/** The inputs the trace tests, each nudged in a plain, explainable way. */
export function traceNudges(h: Household): Nudge[] {
  const nudges: Nudge[] = [];
  const up = (v: number) => Math.round(v * 1.1);

  if (h.self.income.kind === "rows") {
    for (const s of h.self.income.rows) {
      nudges.push({
        inputId: `income.${s.id}.grossAnnual`,
        label: `${s.label ?? s.type} income (10% more)`,
        value: s.grossAnnual.value,
        testedValue: up(s.grossAnnual.value),
        apply: (c) => {
          if (c.self.income.kind !== "rows") return;
          const row = c.self.income.rows.find((r) => r.id === s.id);
          if (row) row.grossAnnual = { ...row.grossAnnual, value: up(s.grossAnnual.value) };
        },
      });
    }
  }

  if (h.spending.kind === "rows") {
    const total = h.spending.rows.reduce((t, r) => t + r.annual.value, 0);
    nudges.push({
      inputId: "spending.total",
      label: "Spending (10% more)",
      value: total,
      testedValue: up(total),
      apply: (c) => {
        if (c.spending.kind !== "rows") return;
        for (const r of c.spending.rows) r.annual = { ...r.annual, value: r.annual.value * 1.1 };
      },
    });
  }

  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.balance.confidence === "notForMe" || a.balance.value === null) continue;
      const v = a.balance.value;
      nudges.push({
        inputId: `accounts.${a.id}.balance`,
        label: `${a.name?.value ?? a.id} balance (10% more)`,
        value: v,
        testedValue: up(v),
        apply: (c) => {
          if (c.accounts.kind !== "rows") return;
          const row = c.accounts.rows.find((r) => r.id === a.id);
          if (row && row.balance.value !== null) row.balance = { ...row.balance, value: up(v) };
        },
      });
    }
  }

  const resolved = resolveAssumptions(h.assumptions);
  const stocks = resolved.returns.stocks.value;
  nudges.push({
    inputId: "assumptions.returns.stocks",
    label: "Stock return (1 point lower)",
    value: stocks[1],
    testedValue: stocks[1] - 1,
    apply: (c) => {
      c.assumptions.overrides.returns = {
        ...c.assumptions.overrides.returns,
        stocks: { ...resolved.returns.stocks, value: [stocks[0] - 1, stocks[1] - 1, stocks[2] - 1] },
      };
    },
  });
  nudges.push({
    inputId: "assumptions.planToAge",
    label: "Plan-to age (5 years longer)",
    value: resolved.planToAge.value,
    testedValue: resolved.planToAge.value + 5,
    apply: (c) => {
      c.assumptions.overrides.planToAge = { ...resolved.planToAge, value: resolved.planToAge.value + 5 };
    },
  });
  if (!h.self.socialSecurity.claimZero?.value) {
    nudges.push({
      inputId: "socialSecurity.claimZero",
      label: "No Social Security at all",
      value: 1,
      testedValue: 0,
      apply: (c) => {
        c.self.socialSecurity.claimZero = { value: true, asOf: c.asOf, source: "user", confidence: "known" };
      },
    });
  }
  return nudges;
}

export function traceFiDate(household: Household, band: BandName = "likely", deps: Deps = defaultDeps()): FiTrace {
  const base = findFiDate(requireComplete(household), resolveBand(resolveAssumptions(household.assumptions), band), deps);
  const entries: TraceEntry[] = traceNudges(household).map((n) => {
    const c = clone(household);
    n.apply(c);
    const tested = findFiDate(requireComplete(c), resolveBand(resolveAssumptions(c.assumptions), band), deps);
    const deltaYears = base.fiAge !== null && tested.fiAge !== null ? tested.fiAge - base.fiAge : null;
    return { inputId: n.inputId, label: n.label, value: n.value, testedValue: n.testedValue, fiAge: base.fiAge, fiAgeTested: tested.fiAge, deltaYears };
  });
  entries.sort((a, b) => Math.abs(b.deltaYears ?? 99) - Math.abs(a.deltaYears ?? 99));
  return { band, fiAge: base.fiAge, entries };
}
