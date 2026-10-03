/**
 * What the entry screen says about each section before it is opened: how many
 * items, their dollar total, how many are rough or missing, and whether the
 * section is complete. Also the groups accounts and debts are shown in, with
 * subtotals. All computed from the stored parts, never stored (CLAUDE.md).
 */

import groupsFile from "../../data/entry-groups.json";
import type { Account, AssetAccount, DebtAccount, EndRule, Household, YearMonth } from "./types";

export type EntrySectionId = "about" | "income" | "spending" | "accounts" | "debts";
export const ENTRY_SECTIONS: readonly EntrySectionId[] = ["about", "income", "spending", "accounts", "debts"];

export interface SectionSummary {
  /** Items in the section: answers for About you, rows for the rest. */
  count: number;
  /** Dollars: per year for income and spending (rows that count this month), balances for accounts and debts. Null for About you. */
  total: number | null;
  /** Items answered with a rough number. */
  rough: number;
  /** Required answers still missing. A value marked "look it up" is missing: it has not been answered. */
  missing: number;
  /** Every required field is answered. Roughly counts as answered. */
  complete: boolean;
}

export interface AccountGroup {
  id: string;
  label: string;
  accountIds: string[];
  count: number;
  /** The sum of the balances in the group. */
  subtotal: number;
}

type ItemState = "known" | "rough" | "missing";

/** True when a row counts in the plan month: it has started and has not ended. */
function countsNow(start: YearMonth | undefined, end: EndRule | undefined, planMonth: YearMonth): boolean {
  if (start && start > planMonth) return false;
  if (end?.kind === "date" && end.date < planMonth) return false;
  return true;
}

export function incomeState(s: { grossAnnual: { value: number; confidence: string } }): ItemState {
  if (s.grossAnnual.confidence === "lookUp" || !(s.grossAnnual.value > 0)) return "missing";
  return s.grossAnnual.confidence === "roughly" ? "rough" : "known";
}

export function spendingState(r: { annual: { value: number; confidence: string }; start?: YearMonth; end?: EndRule }): ItemState {
  // A dated row may be $0 on purpose (nothing until a month, then an amount).
  const dated = r.start !== undefined || r.end !== undefined;
  if (r.annual.confidence === "lookUp" || (!(r.annual.value > 0) && !dated)) return "missing";
  return r.annual.confidence === "roughly" ? "rough" : "known";
}

export function accountState(a: Account): ItemState {
  if (a.balance.value === null || a.balance.confidence === "lookUp" || a.balance.confidence === "notForMe") return "missing";
  if (a.side === "debt") {
    if (a.rate.source === "preset" && a.rate.confidence === "lookUp") return "missing";
    if (a.promo && a.promo.rateAfter.confidence === "lookUp") return "missing";
    if (a.balance.confidence === "roughly" || a.rate.confidence === "roughly" || a.minimumPaymentAnnual.confidence === "roughly" || a.promo?.rateAfter.confidence === "roughly") return "rough";
    return "known";
  }
  return a.balance.confidence === "roughly" ? "rough" : "known";
}

function tally(states: ItemState[]): { rough: number; missing: number } {
  return { rough: states.filter((s) => s === "rough").length, missing: states.filter((s) => s === "missing").length };
}

export function entrySummary(h: Household): Record<EntrySectionId, SectionSummary> {
  const planMonth = h.asOf.slice(0, 7);

  // About you: birth month and state are required. Filing status has a default, marked roughly.
  const aboutMissing = (h.self.birthDate ? 0 : 1) + (h.self.state ? 0 : 1) + (h.partner && !h.partner.birthDate ? 1 : 0);
  const about: SectionSummary = {
    count: (h.partner ? 4 : 3) - aboutMissing,
    total: null,
    rough: (h.self.filingStatus.confidence === "roughly" ? 1 : 0) + (h.self.state?.confidence === "roughly" ? 1 : 0),
    missing: aboutMissing,
    complete: aboutMissing === 0,
  };

  const inc = h.self.income;
  const partnerInc = h.partner?.income;
  // Households of two: both people's streams count in the section.
  const streams = [...(inc.kind === "rows" ? inc.rows : []), ...(partnerInc?.kind === "rows" ? partnerInc.rows : [])];
  const incomeTally = tally(streams.map(incomeState));
  const income: SectionSummary = {
    count: streams.length,
    total: streams.filter((s) => countsNow(s.start, s.end, planMonth)).reduce((sum, s) => sum + s.grossAnnual.value, 0),
    ...incomeTally,
    complete: (inc.kind === "none" && streams.length === 0) || (streams.length > 0 && incomeTally.missing === 0),
  };

  const sp = h.spending;
  const rows = sp.kind === "rows" ? sp.rows : [];
  const spendingTally = tally(rows.map(spendingState));
  const spending: SectionSummary = {
    count: rows.length,
    total: rows.filter((r) => countsNow(r.start, r.end, planMonth)).reduce((sum, r) => sum + r.annual.value, 0),
    ...spendingTally,
    complete: sp.kind === "rows" && rows.length > 0 && spendingTally.missing === 0,
  };

  const acc = h.accounts;
  const all = acc.kind === "rows" ? acc.rows : [];
  const side = (which: "asset" | "debt"): SectionSummary => {
    const list = all.filter((a) => a.side === which);
    const t = tally(list.map(accountState));
    return {
      count: list.length,
      total: list.reduce((sum, a) => sum + (a.balance.value ?? 0), 0),
      ...t,
      complete: acc.kind !== "unanswered" && t.missing === 0,
    };
  };

  return { about, income, spending, accounts: side("asset"), debts: side("debt") };
}

/**
 * The section to open when the screen loads: the first with a required answer missing;
 * if none, the first with a rough value; if none, null (all stay closed).
 */
export function firstSectionNeedingAttention(h: Household): EntrySectionId | null {
  const s = entrySummary(h);
  return ENTRY_SECTIONS.find((id) => !s[id].complete) ?? ENTRY_SECTIONS.find((id) => s[id].rough > 0) ?? null;
}

interface GroupSpec {
  id: string;
  label: string;
  presets: string[];
}

function grouped<T extends Account>(list: T[], specs: GroupSpec[], otherLabel: string): AccountGroup[] {
  const out: AccountGroup[] = [];
  const taken = new Set<string>();
  const make = (id: string, label: string, members: T[]): void => {
    if (members.length === 0) return;
    out.push({ id, label, accountIds: members.map((a) => a.id), count: members.length, subtotal: members.reduce((sum, a) => sum + (a.balance.value ?? 0), 0) });
  };
  for (const spec of specs) {
    const members = list.filter((a) => spec.presets.includes(a.preset));
    members.forEach((a) => taken.add(a.id));
    make(spec.id, spec.label, members);
  }
  make("other", otherLabel, list.filter((a) => !taken.has(a.id)));
  return out;
}

/** Accounts and debts in the groups the entry screen shows (data/entry-groups.json), each with its count and subtotal. Empty groups are left out. */
export function accountGroups(h: Household): { assets: AccountGroup[]; debts: AccountGroup[] } {
  const all = h.accounts.kind === "rows" ? h.accounts.rows : [];
  return {
    assets: grouped(all.filter((a): a is AssetAccount => a.side === "asset"), groupsFile.assets, groupsFile.otherAssetsLabel),
    debts: grouped(all.filter((a): a is DebtAccount => a.side === "debt"), groupsFile.debts, groupsFile.otherDebtsLabel),
  };
}
