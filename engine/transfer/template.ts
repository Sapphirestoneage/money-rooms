/**
 * The import template (docs/import-template.md): a CSV with one row per value
 * that a person or an AI can fill in. This module reads one into a household,
 * with every problem named in plain words, and writes a household back out in
 * the same format. Pure: text in, results out. Nothing is sent anywhere.
 */

import type {
  Account,
  AccountPresetKey,
  Cadence,
  Confidence,
  FilingStatus,
  Household,
  IncomeStream,
  IncomeType,
  IsoDate,
  PayFrequency,
  PreTaxDeduction,
  SpendingRow,
  StateCode,
  Value,
  WorkplaceAccountType,
  YearMonth,
} from "../model";
import {
  INCOME_TYPE_NAMES,
  STATE_CODES,
  annualFrom,
  assetFromPreset,
  debtFromPreset,
  emptyHousehold,
  getAccountPreset,
  isWorkplaceContribution,
  isYearMonth,
  loadQuickAllocations,
  loadSpendingCategories,
  monthsBetween,
  parseEndRule,
  parseYearMonth,
} from "../model";
import { estimatedMinimumPaymentAnnual } from "../projection/debts";

export const TEMPLATE_COLUMNS = ["section", "item", "field", "value", "cadence", "kind", "as_of", "notes"] as const;
export const TEMPLATE_HEADER = TEMPLATE_COLUMNS.join(",");

export type TemplateSection = "profile" | "income" | "spending" | "account" | "debt" | "optional";
export const TEMPLATE_SECTIONS: readonly TemplateSection[] = ["profile", "income", "spending", "account", "debt", "optional"];

/** A row, or a whole item, that was not imported, with the reason in plain words. */
export interface TemplateNote {
  /** The line in the file, counting the header as line 1. Zero when the note is about a whole item. */
  line: number;
  /** What it is about: the item's name, or the field for profile and optional rows. */
  label: string;
  reason: string;
}

export interface TemplatePreview {
  /** Problems with the file as a whole. When there are any, nothing else is filled in. */
  fileProblems: string[];
  /** The household the file describes. Applied only when the person says so. */
  household: Household;
  /** How many things each section has: fields for profile and optional, items for the rest. */
  counts: Record<TemplateSection, number>;
  /** Rows that need a look, each with a plain reason. A row that could not be read was not imported. */
  needsALook: TemplateNote[];
  /** Rows marked dontknow. They were skipped. */
  toLookUp: TemplateNote[];
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Reads CSV text into rows of cells. Handles quoted cells, doubled quotes, and any line ending. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvCell(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// The allowed fields (docs/import-template.md section 2)
// ---------------------------------------------------------------------------

type FieldSpec =
  | { kind: "money" }
  | { kind: "balance" }
  | { kind: "number"; min: number; max: number; whole?: boolean; unit: string }
  | { kind: "yearMonth" }
  | { kind: "end" }
  | { kind: "state" }
  | { kind: "choice"; choices: Readonly<Record<string, string>> };

const INCOME_TYPES: Readonly<Record<string, IncomeType>> = {
  salary: "salary", hourly: "hourly", self_employed: "selfEmployed", side_gig: "sideGig", unemployment: "unemployment", allowance: "allowance", other: "other",
};
const FILING: Readonly<Record<string, FilingStatus>> = {
  single: "single", married_joint: "marriedJoint", married_separate: "marriedSeparate", head_of_household: "headOfHousehold",
};
const PAY: Readonly<Record<string, PayFrequency>> = { weekly: "weekly", biweekly: "biweekly", semimonthly: "semimonthly", monthly: "monthly" };
const ACCOUNT_TYPES: Readonly<Record<string, AccountPresetKey>> = {
  checking: "checking", savings: "savings", brokerage: "brokerage", trad_401k: "trad401k", roth_401k: "roth401k", trad_ira: "tradIRA", roth_ira: "rothIRA", hsa: "hsa", other: "otherAsset",
};
const DEBT_TYPES: Readonly<Record<string, AccountPresetKey>> = {
  credit_card: "creditCard", business_card: "businessCard", student_federal: "studentFederal", student_private: "studentPrivate", auto: "auto", mortgage: "mortgage", personal: "personal", family: "family", medical: "medical", other: "otherDebt",
};
const MIX: Readonly<Record<string, "mostlyStocks" | "balanced" | "mostlyCash">> = { mostly_stocks: "mostlyStocks", balanced: "balanced", mostly_cash: "mostlyCash" };
const CONTRIBUTION: Readonly<Record<string, WorkplaceAccountType>> = { traditional: "traditional", roth: "roth" };
const YES_NO: Readonly<Record<string, string>> = { yes: "yes", no: "no" };

const FIELDS: Readonly<Record<TemplateSection, Readonly<Record<string, FieldSpec>>>> = {
  profile: {
    birth_month: { kind: "yearMonth" },
    state: { kind: "state" },
    filing_status: { kind: "choice", choices: FILING },
  },
  income: {
    type: { kind: "choice", choices: INCOME_TYPES },
    gross_amount: { kind: "money" },
    hours_per_week: { kind: "number", min: 1, max: 80, unit: "hours" },
    pay_frequency: { kind: "choice", choices: PAY },
    match_percent: { kind: "number", min: 0, max: 500, unit: "percent" },
    match_cap_percent: { kind: "number", min: 0, max: 100, unit: "percent" },
    contribution_percent: { kind: "number", min: 0, max: 100, unit: "percent" },
    contribution_type: { kind: "choice", choices: CONTRIBUTION },
    hsa_contribution: { kind: "money" },
    business_expenses: { kind: "money" },
    start: { kind: "yearMonth" },
    end: { kind: "end" },
  },
  spending: {
    category: { kind: "choice", choices: Object.fromEntries(loadSpendingCategories().map((c) => [c.id.toLowerCase(), c.id])) },
    amount: { kind: "money" },
    start: { kind: "yearMonth" },
    end: { kind: "end" },
  },
  account: {
    type: { kind: "choice", choices: ACCOUNT_TYPES },
    balance: { kind: "balance" },
    mix: { kind: "choice", choices: MIX },
  },
  debt: {
    type: { kind: "choice", choices: DEBT_TYPES },
    balance: { kind: "balance" },
    rate: { kind: "number", min: 0, max: 100, unit: "percent" },
    promo_end: { kind: "yearMonth" },
    rate_after: { kind: "number", min: 0, max: 100, unit: "percent" },
    min_payment: { kind: "money" },
    actual_payment: { kind: "money" },
  },
  optional: {
    hsa_eligible: { kind: "choice", choices: YES_NO },
    ss_claim_age: { kind: "number", min: 62, max: 70, whole: true, unit: "years" },
  },
};

const CADENCES: readonly string[] = ["week", "paycheck", "month", "year"];
const KINDS: Readonly<Record<string, Exclude<Confidence, "computed" | "notForMe"> | "dontknow">> = { known: "known", roughly: "roughly", lookup: "lookUp", dontknow: "dontknow" };

const words = (field: string): string => field.replace(/_/g, " ");

/** A stable id from an item's name: "Work 401(k)" becomes "work-401-k". */
export function slug(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "item";
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

interface Cell {
  line: number;
  raw: string;
  /** The parsed value: a number, a canonical choice, or a date string. */
  parsed: number | string;
  cadence: Cadence | null;
  confidence: Exclude<Confidence, "computed" | "notForMe">;
  asOf: IsoDate;
}

type Group = Map<string, Cell>;

function emptyCounts(): Record<TemplateSection, number> {
  return { profile: 0, income: 0, spending: 0, account: 0, debt: 0, optional: 0 };
}

/**
 * Reads a filled template. `asOf` is the plan date; a row with no as_of takes its month.
 * Nothing is thrown for bad rows: each one is listed in `needsALook` and the rest still load.
 */
export function readTemplate(text: string, asOf: IsoDate): TemplatePreview {
  const planMonth = asOf.slice(0, 7);
  const planDate: IsoDate = `${planMonth}-01`;
  const preview: TemplatePreview = { fileProblems: [], household: emptyHousehold(asOf), counts: emptyCounts(), needsALook: [], toLookUp: [] };

  // Text pasted from a chat often arrives wrapped in code-block marks. They are not rows.
  const table = parseCsv(text.split(/\r?\n/).filter((l) => !/^\s*```/.test(l)).join("\n"));
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (headerIndex < 0) {
    preview.fileProblems.push("The file is empty.");
    return preview;
  }
  const header = (table[headerIndex] ?? []).map((c) => c.trim().toLowerCase());
  if (TEMPLATE_COLUMNS.some((col, i) => header[i] !== col)) {
    preview.fileProblems.push(`The first row must be the column names, in this order: ${TEMPLATE_HEADER}`);
    return preview;
  }

  const profile: Group = new Map();
  const optional: Group = new Map();
  const groups: Record<"income" | "spending" | "account" | "debt", Map<string, Group>> = { income: new Map(), spending: new Map(), account: new Map(), debt: new Map() };
  /** Fields marked dontknow, so an item can tell "blank on purpose" from "never mentioned". */
  const unknown = new Set<string>();
  /** Income items with a row marked roughly whose note says "not confirmed". */
  const unconfirmed = new Set<string>();
  const skip = (line: number, label: string, reason: string) => preview.needsALook.push({ line, label, reason });

  for (let i = headerIndex + 1; i < table.length; i++) {
    const line = i + 1;
    const cells = (table[i] ?? []).map((c) => c.trim());
    if (cells.every((c) => c === "")) continue;
    const [sectionRaw = "", item = "", fieldRaw = "", value = "", cadenceRaw = "", kindRaw = "", asOfRaw = "", notes = ""] = cells;
    if (sectionRaw === "") continue; // a notes row

    const section = sectionRaw.toLowerCase() as TemplateSection;
    const field = fieldRaw.toLowerCase();
    const grouped = section !== "profile" && section !== "optional";
    const label = grouped && item ? item : words(field) || sectionRaw;

    if (!TEMPLATE_SECTIONS.includes(section)) {
      skip(line, label, `section "${sectionRaw}" isn't one this template knows`);
      continue;
    }
    const spec = FIELDS[section][field];
    if (!spec) {
      skip(line, label, `"${fieldRaw}" isn't a ${section} field`);
      continue;
    }
    if (grouped && item === "") {
      skip(line, words(field), `${section} rows need a name in the item column`);
      continue;
    }
    const kind = KINDS[(kindRaw || "known").toLowerCase()];
    if (!kind) {
      skip(line, label, `kind "${kindRaw}" isn't known, roughly, lookup, or dontknow`);
      continue;
    }
    if (section === "income" && kind === "roughly" && /not\s+confirmed/i.test(notes)) unconfirmed.add(item);
    if (kind === "dontknow") {
      preview.toLookUp.push({ line, label, reason: words(field) });
      unknown.add(`${section}|${item}|${field}`);
      continue;
    }
    if (asOfRaw !== "" && !isYearMonth(asOfRaw)) {
      skip(line, label, `as_of "${asOfRaw}" isn't a month like 2026-10`);
      continue;
    }
    if (value === "") {
      skip(line, label, `${words(field)} is blank. Use kind dontknow if it isn't known`);
      continue;
    }

    // The value itself.
    let parsed: number | string;
    let cadence: Cadence | null = null;
    const notANumber = `${words(field)} "${value}" isn't a number`;
    const asNumber = (): number | null => (/^-?\d+(\.\d+)?$/.test(value) ? Number(value) : null);
    switch (spec.kind) {
      case "money":
      case "balance": {
        const n = asNumber();
        if (n === null) { skip(line, label, notANumber); continue; }
        if (n < 0) { skip(line, label, `${words(field)} can't be negative`); continue; }
        if (spec.kind === "money") {
          const c = cadenceRaw.toLowerCase();
          if (!CADENCES.includes(c)) {
            skip(line, label, c === "" ? `${words(field)} needs a cadence: week, paycheck, month, or year` : `cadence "${cadenceRaw}" isn't week, paycheck, month, or year`);
            continue;
          }
          cadence = c as Cadence;
        }
        parsed = n;
        break;
      }
      case "number": {
        const n = asNumber();
        if (n === null) { skip(line, label, notANumber); continue; }
        if (n < spec.min || n > spec.max || (spec.whole && !Number.isInteger(n))) {
          skip(line, label, `${words(field)} ${value} should be ${spec.whole ? "a whole number " : ""}from ${spec.min} to ${spec.max}`);
          continue;
        }
        parsed = n;
        break;
      }
      case "yearMonth": {
        if (!isYearMonth(value)) { skip(line, label, `${words(field)} "${value}" isn't a month like 2027-01`); continue; }
        parsed = value;
        break;
      }
      case "end": {
        const v = value.toLowerCase();
        if (!(v === "retirement" || /^age:\d{1,3}$/.test(v) || isYearMonth(v))) {
          skip(line, label, `end "${value}" isn't a month like 2027-03, an age like age:30, or retirement`);
          continue;
        }
        parsed = v;
        break;
      }
      case "state": {
        const code = value.toUpperCase();
        if (!(STATE_CODES as readonly string[]).includes(code)) { skip(line, label, `state "${value}" isn't a two-letter state code`); continue; }
        parsed = code;
        break;
      }
      case "choice": {
        const choice = spec.choices[value.toLowerCase()];
        if (choice === undefined) {
          skip(line, label, `${words(field)} "${value}" isn't one of: ${Object.keys(spec.choices).join(", ")}`);
          continue;
        }
        parsed = choice;
        break;
      }
    }

    const cell: Cell = { line, raw: value, parsed, cadence, confidence: kind, asOf: asOfRaw ? `${asOfRaw}-01` : planDate };
    let target: Group;
    if (section === "profile") target = profile;
    else if (section === "optional") target = optional;
    else {
      const bySection = groups[section];
      target = bySection.get(item) ?? new Map<string, Cell>();
      bySection.set(item, target);
    }
    if (target.has(field)) {
      skip(line, label, `${words(field)} appears twice. The first one was used`);
      continue;
    }
    target.set(field, cell);
  }

  // ---- Build the household ---------------------------------------------------
  const h = preview.household;
  const val = <T>(c: Cell, v: T): Value<T> => ({ value: v, asOf: c.asOf, source: "user", confidence: c.confidence });
  const lookUpZero = (): Value<number> => ({ value: 0, asOf: planDate, source: "user", confidence: "lookUp" });
  const ids = new Set<string>();
  const uniqueId = (name: string): string => {
    const base = slug(name);
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };

  // Profile
  const birth = profile.get("birth_month");
  if (birth) {
    const age = Math.floor(monthsBetween(String(birth.parsed), planMonth) / 12);
    if (age < 16 || age > 100) skip(birth.line, "birth month", `birth month "${birth.raw}" gives an age of ${age}. The app plans for ages 16 to 100`);
    else {
      h.self.birthDate = { value: String(birth.parsed) as YearMonth, asOf: birth.asOf, source: "user", confidence: "known" };
      preview.counts.profile += 1;
    }
  }
  const state = profile.get("state");
  if (state) {
    h.self.state = val(state, state.parsed as StateCode);
    preview.counts.profile += 1;
  }
  const filing = profile.get("filing_status");
  if (filing) {
    h.self.filingStatus = val(filing, filing.parsed as FilingStatus);
    preview.counts.profile += 1;
  }

  // Income
  const streams: IncomeStream[] = [];
  for (const [item, g] of groups.income) {
    const type = g.get("type");
    if (!type) {
      skip(0, item, "has no type row, so this income was left out");
      continue;
    }
    const id = uniqueId(item);
    const pay = g.get("pay_frequency");
    const payFrequency = (pay?.parsed as PayFrequency | undefined) ?? "biweekly";
    const annual = (c: Cell): number => annualFrom(c.parsed as number, c.cadence ?? "year", { payFrequency });

    const gross = g.get("gross_amount");
    const stream: IncomeStream = {
      id,
      type: type.parsed as IncomeType,
      label: item,
      grossAnnual: gross ? val(gross, annual(gross)) : lookUpZero(),
      end: parseEndRule(g.get("end") ? String(g.get("end")!.parsed) : "retirement"),
    };
    const hours = g.get("hours_per_week");
    if (hours) stream.hoursPerWeek = val(hours, hours.parsed as number);
    if (pay) stream.payFrequency = val(pay, payFrequency);
    const matchPct = g.get("match_percent");
    const matchCap = g.get("match_cap_percent");
    if (matchPct && matchCap) stream.employerMatch = { matchPercent: val(matchPct, matchPct.parsed as number), capPercentOfPay: val(matchCap, matchCap.parsed as number) };
    else if (matchPct || matchCap) skip((matchPct ?? matchCap)!.line, item, "an employer match needs both match_percent and match_cap_percent, so the match was left out");

    const deductions: PreTaxDeduction[] = [];
    const contribution = g.get("contribution_percent");
    const contributionType = g.get("contribution_type");
    if (contribution && (contribution.parsed as number) > 0) {
      deductions.push({
        id: `${id}-401k`,
        type: "401k",
        percentOfPay: val(contribution, contribution.parsed as number),
        accountType: val(contributionType ?? contribution, (contributionType?.parsed as WorkplaceAccountType | undefined) ?? "traditional"),
      });
    }
    const hsa = g.get("hsa_contribution");
    if (hsa && (hsa.parsed as number) > 0) deductions.push({ id: `${id}-hsa`, type: "hsa", annual: val(hsa, annual(hsa)) });
    if (deductions.length) stream.preTaxDeductions = deductions;

    const expenses = g.get("business_expenses");
    if (expenses) stream.businessExpensesAnnual = val(expenses, annual(expenses));
    const start = g.get("start");
    if (start) stream.start = String(start.parsed);
    if (unconfirmed.has(item)) stream.notConfirmed = true;
    streams.push(stream);
  }
  if (streams.length) h.self.income = { kind: "rows", rows: streams };
  preview.counts.income = streams.length;

  // Spending
  // Spending: the item is the person's own name for the row, and the category is a field.
  // Several rows can share a category, each with its own dates. The engine adds up the rows active in a year.
  const categories = loadSpendingCategories();
  const categoryIds = new Map(categories.map((c) => [c.id.toLowerCase(), c]));
  const spending: SpendingRow[] = [];
  for (const [item, g] of groups.spending) {
    const categoryCell = g.get("category");
    // Files made before the category field existed used the category id as the item.
    const category = categoryCell ? categoryIds.get(String(categoryCell.parsed).toLowerCase()) : categoryIds.get(item.toLowerCase());
    if (!category) {
      if (!unknown.has(`spending|${item}|category`)) skip(0, item, `has no category row, so this spending was left out. Add a category row with one of: ${categories.map((c) => c.id).join(", ")}`);
      continue;
    }
    const amount = g.get("amount");
    if (!amount) {
      if (!unknown.has(`spending|${item}|amount`)) skip(0, item, "has no amount row, so this spending was left out");
      continue;
    }
    const named = item.toLowerCase() !== category.id.toLowerCase() && item.toLowerCase() !== category.label.toLowerCase();
    let id = named ? uniqueId(`sp-${item}`) : `cat-${category.id}`;
    for (let n = 2; !named && ids.has(id); n++) id = `cat-${category.id}-${n}`;
    ids.add(id);
    const row: SpendingRow = { id, category: category.id, annual: val(amount, annualFrom(amount.parsed as number, amount.cadence ?? "year", { payFrequency: "biweekly" })) };
    if (named) row.label = item;
    const start = g.get("start");
    if (start) row.start = String(start.parsed);
    const end = g.get("end");
    if (end) row.end = parseEndRule(String(end.parsed));
    spending.push(row);
  }
  if (spending.length) h.spending = { kind: "rows", rows: spending };
  preview.counts.spending = spending.length;

  // Accounts and debts
  const accounts: Account[] = [];
  const quick = loadQuickAllocations();
  for (const [item, g] of groups.account) {
    const type = g.get("type");
    if (!type) {
      skip(0, item, "has no type row, so this account was left out");
      continue;
    }
    const balance = g.get("balance");
    const account = assetFromPreset(type.parsed as AccountPresetKey, uniqueId(item), balance ? val(balance, balance.parsed as number) : lookUpZero(), planDate);
    account.name = { value: item, asOf: planDate, source: "user", confidence: "known" };
    const mix = g.get("mix");
    if (mix) account.allocation = val(mix, quick[mix.parsed as keyof typeof quick]);
    accounts.push(account);
    preview.counts.account += 1;
  }
  for (const [item, g] of groups.debt) {
    const type = g.get("type");
    if (!type) {
      skip(0, item, "has no type row, so this debt was left out");
      continue;
    }
    const key = type.parsed as AccountPresetKey;
    const preset = getAccountPreset(key);
    const balance = g.get("balance");
    const rateCell = g.get("rate");
    const owed = balance ? (balance.parsed as number) : 0;
    // No rate given: the type's typical rate marked roughly, or a placeholder that must be answered (E17).
    const rate: Value<number> = rateCell
      ? val(rateCell, rateCell.parsed as number)
      : preset.side === "debt" && preset.typicalRate !== undefined
        ? { value: preset.typicalRate, asOf: planDate, source: "preset", confidence: "roughly" }
        : { value: 0, asOf: planDate, source: "preset", confidence: "lookUp" };
    const estimate = (): Value<number> => ({ value: estimatedMinimumPaymentAnnual(owed, rate.value), asOf: planDate, source: "preset", confidence: "roughly" });
    const pay = (c: Cell): Value<number> => val(c, annualFrom(c.parsed as number, c.cadence ?? "year", { payFrequency: "biweekly" }));
    const minCell = g.get("min_payment");
    const actualCell = g.get("actual_payment");
    const minimum = minCell ? pay(minCell) : estimate();
    const debt = debtFromPreset(key, uniqueId(item), balance ? val(balance, owed) : lookUpZero(), {
      rate,
      minimumPaymentAnnual: minimum,
      actualPaymentAnnual: actualCell ? pay(actualCell) : { ...minimum },
    }, planDate);
    debt.name = { value: item, asOf: planDate, source: "user", confidence: "known" };
    // A promo: the rate row is the promo rate, promo_end its last month, rate_after what follows.
    const promoEnd = g.get("promo_end");
    const rateAfter = g.get("rate_after");
    if (promoEnd && rateAfter && rateCell) {
      debt.promo = {
        rate: val(rateCell, rateCell.parsed as number),
        endDate: { value: String(promoEnd.parsed) as YearMonth, asOf: promoEnd.asOf, source: "user", confidence: promoEnd.confidence },
        rateAfter: val(rateAfter, rateAfter.parsed as number),
      };
    } else if (promoEnd || rateAfter) {
      skip((promoEnd ?? rateAfter)!.line, item, "a promo needs three rows: rate (the promo rate), promo_end, and rate_after. The promo was left out");
    }
    if (rateCell && (rateCell.parsed as number) === 0 && !debt.promo) {
      skip(rateCell.line, item, "the rate is 0 with no promo_end. It was imported as 0% for good. If the 0% is a promo, add promo_end and rate_after rows");
    }
    accounts.push(debt);
    preview.counts.debt += 1;
  }
  if (accounts.length) h.accounts = { kind: "rows", rows: accounts };

  // Optional
  const hsaEligible = optional.get("hsa_eligible");
  if (hsaEligible) {
    h.self.hsaEligible = val(hsaEligible, hsaEligible.parsed === "yes");
    preview.counts.optional += 1;
  }
  const claim = optional.get("ss_claim_age");
  if (claim) {
    h.self.socialSecurity.claimingAge = val(claim, { years: claim.parsed as number, months: 0 });
    preview.counts.optional += 1;
  }

  preview.needsALook.sort((a, b) => a.line - b.line);
  return preview;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const reverse = <V extends string>(map: Readonly<Record<string, V>>): Map<V, string> => new Map(Object.entries(map).map(([k, v]) => [v, k]));
const INCOME_OUT = reverse(INCOME_TYPES);
const FILING_OUT = reverse(FILING);
const ACCOUNT_OUT = reverse(ACCOUNT_TYPES);
const DEBT_OUT = reverse(DEBT_TYPES);
const MIX_OUT = reverse(MIX);

/** The file name for a template export. It starts with "my-" so .gitignore keeps it out of the repository. */
export function templateFileName(exportedAt: IsoDate): string {
  return `my-money-rooms-${exportedAt}.csv`;
}

/**
 * Writes a household in the template format. Recurring amounts are per year. A value that is
 * still the app's own default (source "preset") is left out, so it stays a default after re-import.
 */
export function exportTemplate(h: Household): string {
  const lines: string[] = [TEMPLATE_HEADER];
  const kindOf = (c: Confidence): string | null => (c === "known" ? "known" : c === "roughly" ? "roughly" : c === "lookUp" ? "lookup" : null);
  const row = (section: TemplateSection, item: string, field: string, value: string | number, cadence: string, v: { confidence: Confidence; asOf: IsoDate }, notes = "") => {
    const kind = kindOf(v.confidence);
    if (kind === null) return;
    lines.push([section, item, field, String(value), cadence, kind, v.asOf.slice(0, 7), notes].map(csvCell).join(","));
  };
  const entered = (v: { source: string } | undefined): boolean => v !== undefined && v.source !== "preset";
  const known = (asOf: IsoDate) => ({ confidence: "known" as const, asOf });

  // Profile
  if (h.self.birthDate) row("profile", "", "birth_month", h.self.birthDate.value, "", h.self.birthDate);
  if (h.self.state) row("profile", "", "state", h.self.state.value, "", h.self.state);
  if (entered(h.self.filingStatus)) row("profile", "", "filing_status", FILING_OUT.get(h.self.filingStatus.value) ?? "single", "", h.self.filingStatus);

  // Names must be unique within a section, because the item column is what groups rows.
  const namer = () => {
    const seen = new Map<string, number>();
    return (name: string): string => {
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      return n === 1 ? name : `${name} ${n}`;
    };
  };

  // Income
  if (h.self.income.kind === "rows") {
    const name = namer();
    for (const s of h.self.income.rows) {
      const item = name(s.label ?? INCOME_TYPE_NAMES[s.type]);
      const at = s.grossAnnual.asOf;
      if (s.notConfirmed) row("income", item, "type", INCOME_OUT.get(s.type) ?? "other", "", { confidence: "roughly", asOf: at }, "not confirmed");
      else row("income", item, "type", INCOME_OUT.get(s.type) ?? "other", "", known(at));
      row("income", item, "gross_amount", s.grossAnnual.value, "year", s.grossAnnual);
      if (s.hoursPerWeek) row("income", item, "hours_per_week", s.hoursPerWeek.value, "", s.hoursPerWeek);
      if (s.payFrequency) row("income", item, "pay_frequency", s.payFrequency.value, "", s.payFrequency);
      if (s.employerMatch) {
        row("income", item, "match_percent", s.employerMatch.matchPercent.value, "", s.employerMatch.matchPercent);
        row("income", item, "match_cap_percent", s.employerMatch.capPercentOfPay.value, "", s.employerMatch.capPercentOfPay);
      }
      for (const d of s.preTaxDeductions ?? []) {
        if (isWorkplaceContribution(d)) {
          row("income", item, "contribution_percent", d.percentOfPay.value, "", d.percentOfPay);
          row("income", item, "contribution_type", d.accountType.value, "", d.accountType);
        } else if (d.type === "hsa") row("income", item, "hsa_contribution", d.annual.value, "year", d.annual);
      }
      if (s.businessExpensesAnnual) row("income", item, "business_expenses", s.businessExpensesAnnual.value, "year", s.businessExpensesAnnual);
      if (s.start) row("income", item, "start", s.start, "", known(at));
      const end = s.end.kind === "retirement" ? "retirement" : s.end.kind === "age" ? `age:${s.end.age}` : s.end.kind === "dependentAge" ? `dependentAge:${s.end.dependentId}:${s.end.age}` : s.end.date;
      row("income", item, "end", end, "", known(at));
    }
  }

  // Spending
  if (h.spending.kind === "rows") {
    const name = namer();
    const labels = new Map(loadSpendingCategories().map((c) => [c.id, c.label]));
    for (const r of h.spending.rows) {
      const item = name(r.label ?? labels.get(r.category) ?? r.category);
      row("spending", item, "category", r.category, "", known(r.annual.asOf));
      row("spending", item, "amount", r.annual.value, "year", r.annual);
      if (r.start) row("spending", item, "start", r.start, "", known(r.annual.asOf));
      if (r.end) row("spending", item, "end", r.end.kind === "retirement" ? "retirement" : r.end.kind === "age" ? `age:${r.end.age}` : r.end.kind === "dependentAge" ? `dependentAge:${r.end.dependentId}:${r.end.age}` : r.end.date, "", known(r.annual.asOf));
    }
  }

  // Accounts, then debts
  if (h.accounts.kind === "rows") {
    const quick = loadQuickAllocations();
    const assetName = namer();
    const debtName = namer();
    for (const a of h.accounts.rows) {
      if (a.side !== "asset") continue;
      const item = assetName(a.name?.value ?? getAccountPreset(a.preset).label);
      row("account", item, "type", ACCOUNT_OUT.get(a.preset) ?? "other", "", known(a.balance.asOf));
      if (a.balance.value !== null) row("account", item, "balance", a.balance.value, "", a.balance);
      if (entered(a.allocation)) {
        const match = (Object.keys(quick) as (keyof typeof quick)[]).find((k) => quick[k].stocks === a.allocation.value.stocks && quick[k].bonds === a.allocation.value.bonds && quick[k].cash === a.allocation.value.cash);
        if (match) row("account", item, "mix", MIX_OUT.get(match) ?? "", "", a.allocation);
      }
    }
    for (const a of h.accounts.rows) {
      if (a.side !== "debt") continue;
      const item = debtName(a.name?.value ?? getAccountPreset(a.preset).label);
      row("debt", item, "type", DEBT_OUT.get(a.preset) ?? "other", "", known(a.balance.asOf));
      if (a.balance.value !== null) row("debt", item, "balance", a.balance.value, "", a.balance);
      if (a.promo) {
        row("debt", item, "rate", a.promo.rate.value, "", a.promo.rate);
        row("debt", item, "promo_end", a.promo.endDate.value, "", a.promo.endDate);
        row("debt", item, "rate_after", a.promo.rateAfter.value, "", a.promo.rateAfter);
      } else if (entered(a.rate)) row("debt", item, "rate", a.rate.value, "", a.rate);
      if (entered(a.minimumPaymentAnnual)) row("debt", item, "min_payment", a.minimumPaymentAnnual.value, "year", a.minimumPaymentAnnual);
      if (entered(a.actualPaymentAnnual)) row("debt", item, "actual_payment", a.actualPaymentAnnual.value, "year", a.actualPaymentAnnual);
    }
  }

  // Optional
  if (entered(h.self.hsaEligible)) row("optional", "", "hsa_eligible", h.self.hsaEligible.value ? "yes" : "no", "", h.self.hsaEligible);
  const claim = h.self.socialSecurity.claimingAge;
  if (claim) row("optional", "", "ss_claim_age", claim.value.years, "", claim);

  return lines.join("\n") + "\n";
}

/** Used by the birth month check. */
export { parseYearMonth };
