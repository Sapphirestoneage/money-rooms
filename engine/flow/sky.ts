/**
 * The Sky (docs/m3-spec.md section 13, decision L10): the Ledger's rows
 * arranged as circles to zoom into, and the same hierarchy as an outline.
 * Nothing here is new data; every node reads from the household and the
 * materiality report.
 */

import type { Confidence, Household } from "../model";
import { entrySummary, missingLevelOneAnswers } from "../model";
import type { MaterialityReport } from "./materiality";

export type SkyKind = Confidence | "missing" | "aged";

export interface SkyNode {
  id: string;
  label: string;
  /** 0 everything, 1 an area, 2 a row. */
  depth: 0 | 1 | 2;
  /** Share of the node that is answered (fill). */
  coverage: number;
  /** The ring: the node's kind. */
  kind: SkyKind;
  /** Relative size: dollars of FI number at stake, or a count when unknown. */
  size: number;
  /** Plain detail lines for depth 2 (and the summary for depth 1). */
  details: string[];
  children: SkyNode[];
}

const AREAS: { id: string; label: string }[] = [
  { id: "you", label: "You" },
  { id: "income", label: "Income" },
  { id: "spending", label: "Spending" },
  { id: "accounts", label: "Accounts" },
  { id: "debts", label: "Debts" },
  { id: "taxes", label: "Taxes" },
  { id: "goals", label: "Goals" },
];

/** Builds the whole Sky: you and your FI date at the center, the areas around it, their rows inside. */
export function skyTree(h: Household, report: MaterialityReport | null, fiLabel: string): SkyNode {
  const summary = entrySummary(h);
  const stake = (inputId: string) => report?.sensitivities.find((s) => s.inputId === inputId)?.dollarsAtStake ?? 0;
  const kindOf = (c: Confidence, inputId: string): SkyKind => (report?.sensitivities.find((s) => s.inputId === inputId)?.kind === "default" ? "roughly" : c);
  const missing = missingLevelOneAnswers(h);
  const rows = {
    income: h.self.income.kind === "rows" ? h.self.income.rows.map((s): SkyNode => ({ id: `income.${s.id}`, label: s.label ?? s.type, depth: 2, coverage: s.grossAnnual.confidence === "lookUp" ? 0 : 1, kind: kindOf(s.grossAnnual.confidence, `income.${s.id}.grossAnnual`), size: Math.max(1, stake(`income.${s.id}.grossAnnual`)), details: [`$${Math.round(s.grossAnnual.value).toLocaleString("en-US")} a year, ${s.grossAnnual.confidence}`, `as of ${s.grossAnnual.asOf}`, "Feeds: the gap, taxes, Social Security"], children: [] })) : [],
    spending: h.spending.kind === "rows" ? h.spending.rows.map((r): SkyNode => ({ id: `spending.${r.id}`, label: r.label ?? r.category, depth: 2, coverage: r.annual.confidence === "lookUp" ? 0 : 1, kind: kindOf(r.annual.confidence, `spending.${r.id}.annual`), size: Math.max(1, stake(`spending.${r.id}.annual`)), details: [`$${Math.round(r.annual.value).toLocaleString("en-US")} a year, ${r.annual.confidence}`, `as of ${r.annual.asOf}`, "Feeds: the gap, the retirement baseline"], children: [] })) : [],
    accounts: h.accounts.kind === "rows" ? h.accounts.rows.filter((a) => a.side === "asset").map((a): SkyNode => ({ id: `account.${a.id}`, label: a.name?.value ?? a.preset, depth: 2, coverage: a.balance.value === null || a.balance.confidence === "lookUp" ? 0 : 1, kind: a.balance.value === null ? "missing" : kindOf(a.balance.confidence, `account.${a.id}.balance`), size: Math.max(1, stake(`account.${a.id}.balance`)), details: [`$${Math.round(a.balance.value ?? 0).toLocaleString("en-US")}, ${a.balance.confidence}`, `as of ${a.balance.asOf}`, a.side === "asset" ? `${a.taxBucket.value} bucket` : "", "Strategies: the savings waterfall, withdrawal order"].filter(Boolean), children: [] })) : [],
    debts: h.accounts.kind === "rows" ? h.accounts.rows.filter((a) => a.side === "debt").map((a): SkyNode => ({ id: `account.${a.id}`, label: a.name?.value ?? a.preset, depth: 2, coverage: a.balance.value === null ? 0 : 1, kind: a.balance.value === null ? "missing" : kindOf(a.balance.confidence, `account.${a.id}.balance`), size: Math.max(1, stake(`account.${a.id}.balance`) + stake(`account.${a.id}.rate`)), details: [`$${Math.round(a.balance.value ?? 0).toLocaleString("en-US")} at ${a.side === "debt" ? a.rate.value : 0}%`, `as of ${a.balance.asOf}`, "Strategies: high-interest step, payoff methods (M5)"], children: [] })) : [],
  };
  const area = (id: string, label: string, children: SkyNode[], coverage: number, kind: SkyKind, details: string[]): SkyNode => ({
    id,
    label,
    depth: 1,
    coverage,
    kind,
    size: Math.max(1, children.reduce((s, c) => s + c.size, 0)),
    details,
    children,
  });
  const cov = (k: "income" | "spending" | "accounts" | "debts") => (summary[k].count === 0 ? (summary[k].complete ? 1 : 0) : 1 - summary[k].missing / summary[k].count);
  const kindFor = (k: "income" | "spending" | "accounts" | "debts"): SkyKind => (summary[k].missing > 0 ? "missing" : summary[k].rough > 0 ? "roughly" : "known");
  const youDetails = [h.self.birthDate ? `Born ${h.self.birthDate.value}` : "Birth month missing", h.self.state ? `In ${h.self.state.value}` : "State missing", `Filing ${h.self.filingStatus.value}`];
  const children: SkyNode[] = [
    area("you", "You", [], summary.about.complete ? 1 : summary.about.count / 3, summary.about.missing > 0 ? "missing" : summary.about.rough > 0 ? "roughly" : "known", youDetails),
    area("income", "Income", rows.income, cov("income"), kindFor("income"), [`${summary.income.count} streams`]),
    area("spending", "Spending", rows.spending, cov("spending"), kindFor("spending"), [`${summary.spending.count} rows`]),
    area("accounts", "Accounts", rows.accounts, cov("accounts"), kindFor("accounts"), [`${summary.accounts.count} accounts`]),
    area("debts", "Debts", rows.debts, cov("debts"), kindFor("debts"), [`${summary.debts.count} debts`]),
    area("taxes", "Taxes", [], 1, "computed", ["Computed from income, state, and filing status", "Rules from the registry"]),
    area("goals", "Goals", [], h.goals.length ? 1 : 0, h.goals.length ? "known" : "notForMe", [h.goals.length ? `${h.goals.length} goals` : "No goals yet (Level 3)"]),
  ];
  return { id: "everything", label: fiLabel, depth: 0, coverage: missing.length === 0 ? (report ? report.coverage : 1) : 0, kind: missing.length ? "missing" : "computed", size: children.reduce((s, c) => s + c.size, 0), details: [], children };
}

/** The same hierarchy as an outline: one line per node with its depth, for the accessible alternative. */
export function skyOutline(root: SkyNode): { depth: number; node: SkyNode }[] {
  const out: { depth: number; node: SkyNode }[] = [];
  const walk = (n: SkyNode, depth: number) => {
    out.push({ depth, node: n });
    for (const c of n.children) walk(c, depth + 1);
  };
  walk(root, 0);
  return out;
}

/** Finds a node by id anywhere in the tree, with its breadcrumb trail. */
export function findSkyNode(root: SkyNode, id: string): { node: SkyNode; trail: SkyNode[] } | null {
  const walk = (n: SkyNode, trail: SkyNode[]): { node: SkyNode; trail: SkyNode[] } | null => {
    if (n.id === id) return { node: n, trail: [...trail, n] };
    for (const c of n.children) {
      const r = walk(c, [...trail, n]);
      if (r) return r;
    }
    return null;
  };
  return walk(root, []);
}
