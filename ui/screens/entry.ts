/**
 * The entry screen: the level-one checklist (data dictionary section 8), with
 * "I don't" answers, roughly values, and presets. It writes stored parts only.
 * Nothing here calculates: normalization and estimates come from the engine.
 * Every value shown carries its kind badge.
 */

import dev from "../../tests/households/dev.json";
import jordan from "../../tests/households/jordan.json";
import maya from "../../tests/households/maya.json";
import {
  STATE_CODES,
  accountGroups,
  accountState,
  addMonths,
  entrySummary,
  firstSectionNeedingAttention,
  fromAnnual,
  incomeState,
  spendingState,
  weeksThroughEndOf,
  amountFromPercentOfPay,
  assetFromPreset,
  debtFromPreset,
  debtsNeedingRate,
  emptyPerson,
  estimatedMinimumPaymentAnnual,
  getAccountPreset,
  householdFromExample,
  isWorkplaceContribution,
  listAssumptionSets,
  loadQuickAllocations,
  loadSocialSecurityParams,
  loadSpendingCategories,
  loadTaxTables,
  missingLevelOneAnswers,
  notForMe,
  parseYearMonth,
  planToAgeBounds,
  resolveAssumptions,
  userValue,
  type Account,
  type AccountOwner,
  type AccountPresetKey,
  type AnnualDeduction,
  type Cadence,
  type Confidence,
  type EntrySectionId,
  type SectionSummary,
  type DebtAccount,
  type ExampleHouseholdFile,
  type FilingStatus,
  type Household,
  type IncomeStream,
  type IncomeType,
  type PayFrequency,
  type PreTaxDeduction,
  type SavingsStrategy,
  type SpendingRow,
  type StateCode,
  type Value,
  type WorkplaceAccountType,
  type WorkplacePlan,
  type YesNoUnknown,
  drawdownUnlockItems,
  familyLoans,
  type PaymentFlexibility,
  type PossibleForgiveness,
} from "../../engine";
import { collapsibleSection } from "../components/collapsible-section";
import { confirmPanel } from "../components/confirm-panel";
import { denseRow, denseRowEditor } from "../components/dense-row";
import { gentleFlag } from "../components/gentle-flag";
import { groupHeader } from "../components/group-header";
import { kindBadge, type EditableKind } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import { moneyInput, type MoneyInputOptions } from "../components/money-input";
import { presetPicker } from "../components/preset-picker";
import { clear, el, rowId, uid } from "../dom";
import { MONTH_NAMES, amountForInput, dollars, parseMoney, percent } from "../format";
import { activeModule } from "../modules/index";
import type { Store } from "../store";
import { templateCard } from "./template-card";
import { transferCard } from "./transfer-card";

export interface EntryContext {
  household: Household;
  store: Store;
  save(): void;
  replace(h: Household): void;
  goToResult(): void;
}

const INCOME_TYPES: { type: IncomeType; label: string }[] = [
  { type: "salary", label: "Salary" },
  { type: "hourly", label: "Hourly" },
  { type: "selfEmployed", label: "Self-employed" },
  { type: "sideGig", label: "Side gig" },
  { type: "unemployment", label: "Unemployment benefits" },
  { type: "allowance", label: "Allowance or support" },
  { type: "other", label: "Other" },
];

const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

const FILING: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "marriedJoint", label: "Married, filing jointly" },
  { value: "marriedSeparate", label: "Married, filing separately" },
  { value: "headOfHousehold", label: "Head of household" },
];

const STRATEGIES: { value: SavingsStrategy; label: string }[] = [
  { value: "enteredOnly", label: "Entered only (what I put in, then Roth IRA, then taxable)" },
  { value: "maxTaxSavingsNow", label: "Max tax savings now" },
  { value: "maxTaxFreeGrowth", label: "Max tax-free growth" },
];

const MISSING_LABEL: Record<ReturnType<typeof missingLevelOneAnswers>[number], string> = {
  birthDate: "your birth month",
  state: "your state",
  income: "income (or \"I don't have income right now\")",
  spending: "spending",
  accounts: "accounts (or \"I don't have any\")",
};

/**
 * Each field has a stable key (its section or row, plus its label), so the screen can put the
 * cursor back where it was after it refreshes.
 */
let fieldScope = "";
const keyFor = (text: string): string => `${fieldScope}|${text}`;

/** A label, an optional kind badge beside it, and a control underneath. */
function field(text: string, control: HTMLElement, badge?: HTMLElement | null, help?: HTMLElement | null): HTMLElement {
  const id = uid("f");
  control.id = id;
  control.dataset.key = keyFor(text);
  return el("div", { class: "field" }, el("div", { class: "field__label-row" }, el("label", { for: id }, text), badge ?? null), control, help ?? null);
}

function select<T extends string>(options: { value: T; label: string }[], current: T | undefined, onChange: (v: T) => void, placeholder?: string): HTMLSelectElement {
  const node = el("select", { class: "select" });
  if (placeholder) node.append(el("option", { value: "", selected: current === undefined, disabled: true }, placeholder));
  for (const o of options) node.append(el("option", { value: o.value, selected: o.value === current }, o.label));
  node.addEventListener("change", () => onChange(node.value as T));
  return node;
}

export function entryScreen(ctx: EntryContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const asOf = () => ctx.household.asOf;

  /**
   * A place for a value's kind badge. It is empty while there is no number,
   * shows the badge once there is one, and lets the person change the kind.
   */
  function badgeSlot<T>(read: () => Value<T> | undefined, write: (v: Value<T>) => void, editable = true): { node: HTMLElement; refresh: () => void } {
    const node = el("span", { class: "badge-slot" });
    const refresh = () => {
      clear(node);
      const v = read();
      if (!v || v.value === null || v.value === undefined) return;
      node.append(
        kindBadge(
          v.confidence,
          editable
            ? {
                onChange: (next: EditableKind) => {
                  const current = read();
                  if (!current) return;
                  write({ ...current, source: "user", confidence: next });
                  ctx.save();
                  schedule();
                },
              }
            : {},
        ),
      );
    };
    refresh();
    return { node, refresh };
  }

  const isRough = (c: Confidence | undefined) => c === "roughly";

  /** What each amount field's cadence was last set to, so it does not snap back when the screen refreshes. */
  const prefs = ctx.store.loadPrefs();
  const cadenceMemory = new Map<string, Cadence>(Object.entries(prefs.cadence) as [string, Cadence][]);
  const rememberCadence = (key: string, c: Cadence): void => {
    cadenceMemory.set(key, c);
    ctx.store.savePrefs({ ...ctx.store.loadPrefs(), cadence: Object.fromEntries(cadenceMemory) });
  };
  /** A field to put the cursor in after the next refresh (a row that was just added). */
  let pendingFocusKey: string | null = null;

  /** A money input that remembers its cadence and can be found again after a refresh. */
  const money = (o: MoneyInputOptions): HTMLElement => {
    const key = keyFor(o.label);
    const remembered = cadenceMemory.get(key);
    return moneyInput({ ...o, key, ...(remembered ? { initialCadence: remembered } : {}), onCadenceChange: (c) => rememberCadence(key, c) });
  };

  /** Refreshes the screen after the current event finishes, so a field the person is moving to keeps the cursor. */
  let scheduled = false;
  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      render();
    }, 0);
  };

  /** The one row whose fields are open for editing, if any. */
  let openRow: string | null = null;
  /** A row that was just opened: the cursor goes to its first field after the refresh. */
  let pendingEditor: string | null = null;
  const openTheRow = (id: string): void => {
    openRow = id;
    pendingEditor = id;
    schedule();
  };
  /** "2027-01" as "Jan 2027". */
  const shortMonth = (ym: string): string => {
    const p = parseYearMonth(ym);
    return `${(MONTH_NAMES[p.month - 1] ?? "").slice(0, 3)} ${p.year}`;
  };
  /** A row opened for editing: its fields, then Done and Remove. Done folds it back and returns focus to the row. */
  const editorShell = (id: string, name: string, fields: HTMLElement[], flags: HTMLElement[], onRemove: () => void, extra: HTMLElement[] = []): HTMLElement =>
    denseRowEditor({
      id,
      name,
      fields,
      flags,
      actions: [
        ...extra,
        el("button", { type: "button", class: "button button--quiet", onClick: () => { openRow = null; onRemove(); schedule(); } }, "Remove"),
      ],
      onDone: () => {
        openRow = null;
        pendingFocusKey = `row:${id}`;
        schedule();
      },
    });

  /** The entry mode (M3 spec section 12): express (the whole form), guided (one section at a time), or dump (paste everything). Remembered. */
  type EntryMode = "express" | "guided" | "dump";
  const modeOf = (x: string | undefined): EntryMode => (x === "guided" || x === "dump" ? x : "express");
  let entryMode: EntryMode = modeOf(ctx.store.loadPrefs().entryMode);
  let guidedIndex = 0;
  const setMode = (m: EntryMode) => {
    entryMode = m;
    ctx.store.savePrefs({ ...ctx.store.loadPrefs(), entryMode: m });
    if (m === "guided") {
      const first = firstSectionNeedingAttention(h());
      guidedIndex = first ? ENTRY_SECTION_ORDER.indexOf(first) : 0;
      openSections.clear();
      openSections.add(ENTRY_SECTION_ORDER[guidedIndex]!);
    }
    schedule();
  };
  const ENTRY_SECTION_ORDER: EntrySectionId[] = ["about", "income", "spending", "accounts", "debts"];
  const modeSwitch = (): HTMLElement =>
    el(
      "div",
      { class: "mode-switch", role: "group", "aria-label": "How to enter your numbers" },
      el("span", { class: "muted" }, "Enter your numbers:"),
      ...(["guided", "express", "dump"] as EntryMode[]).map((m) => toggleButton(m === "guided" ? "One at a time" : m === "express" ? "All on one form" : "Paste everything", entryMode === m, () => setMode(m))),
    );

  /** Which sections are open. On arrival, only the first one that needs attention. */
  const openSections = new Set<EntrySectionId>();
  {
    const first = firstSectionNeedingAttention(h());
    if (first) openSections.add(first);
  }

  /** A section's one-line summary: "7 items, $35,829, 2 rough". The numbers come from the engine. */
  const summaryText = (id: EntrySectionId, s: SectionSummary): string => {
    const parts: string[] = [];
    if (id === "about") parts.push(`${s.count} of 3 answers`);
    else {
      parts.push(`${s.count} ${s.count === 1 ? "item" : "items"}`);
      if (s.count > 0 && s.total !== null) parts.push(id === "income" || id === "spending" ? `${dollars(s.total)} a year now` : dollars(s.total));
    }
    if (s.rough > 0) parts.push(`${s.rough} rough`);
    if (s.missing > 0) parts.push(`${s.missing} missing`);
    return parts.join(", ");
  };

  function render(): void {
    // Remember where the person is: scroll position, the field with the cursor, and any open section.
    const scrollY = window.scrollY;
    const active = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null;
    const isNewRow = pendingFocusKey !== null;
    const focusKey = pendingFocusKey ?? active?.dataset.key ?? null;
    pendingFocusKey = null;
    const openDetails = [...root.querySelectorAll("details")].map((d) => d.open);
    const summaries = entrySummary(h());
    const section = (id: EntrySectionId, title: string, body: (HTMLElement | null)[]): HTMLElement =>
      collapsibleSection({
        id,
        title,
        summary: summaryText(id, summaries[id]),
        complete: summaries[id].complete,
        open: openSections.has(id),
        onToggle: () => {
          if (openSections.has(id)) openSections.delete(id);
          else openSections.add(id);
          schedule();
        },
        body,
      });

    clear(root);
    const allSections: [EntrySectionId, string, () => (HTMLElement | null)[]][] = [
      ["about", "About you", aboutYou],
      ["income", "Income", income],
      ["spending", "Spending", spending],
      ["accounts", "Accounts", () => accounts("asset")],
      ["debts", "Debts", () => accounts("debt")],
    ];
    let sectionNodes: (HTMLElement | null)[];
    if (entryMode === "guided") {
      const [id, title, body] = allSections[Math.min(guidedIndex, allSections.length - 1)]!;
      openSections.add(id);
      sectionNodes = [
        el("p", { class: "muted" }, `Step ${guidedIndex + 1} of ${allSections.length}`),
        section(id, title, body()),
        el(
          "div",
          { class: "row-actions" },
          el("button", { type: "button", class: "button button--quiet", disabled: guidedIndex === 0, onClick: () => { guidedIndex = Math.max(0, guidedIndex - 1); schedule(); } }, "Back"),
          el("button", { type: "button", class: "button", disabled: guidedIndex >= allSections.length - 1, onClick: () => { guidedIndex = Math.min(allSections.length - 1, guidedIndex + 1); openSections.add(allSections[guidedIndex]![0]); schedule(); } }, "Next"),
        ),
      ];
    } else {
      sectionNodes = allSections.map(([id, title, body]) => section(id, title, body()));
    }
    const parts: (HTMLElement | null)[] = [
      el("h1", { class: "screen-title" }, "Your numbers"),
      el("p", { class: "lede" }, "Five answers give you a first FI date. Everything else sharpens it. Every question has an \"I don't\" answer."),
      modeSwitch(),
      ctx.store.isPersistent()
        ? null
        : gentleFlag("This browser is not keeping what you enter (a private window does this). Your numbers will be gone when you close it. Export a file below to keep them."),
      ...(entryMode === "dump" ? [templateCard({ household: () => ctx.household, store: ctx.store, replace: ctx.replace })] : []),
      ...sectionNodes,
      sharpeners(),
      planDetails(),
      examples(),
      ...(entryMode === "dump" ? [] : [templateCard({ household: () => ctx.household, store: ctx.store, replace: ctx.replace })]),
      transferCard({ household: () => ctx.household, store: ctx.store, replace: ctx.replace }),
      footer(),
    ];
    for (const part of parts) if (part) root.append(part);

    // Put everything back.
    [...root.querySelectorAll("details")].forEach((d, i) => { if (openDetails[i]) d.open = true; });
    window.scrollTo(0, scrollY);
    if (pendingEditor !== null) {
      const editor = [...root.querySelectorAll<HTMLElement>("[data-editor]")].find((n) => n.dataset.editor === pendingEditor);
      pendingEditor = null;
      (editor?.querySelector<HTMLElement>("input, select") ?? editor?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
      editor?.scrollIntoView({ block: "nearest" });
    } else if (focusKey) {
      const target = [...root.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset.key === focusKey);
      if (target) {
        target.focus({ preventScroll: !isNewRow });
        if (isNewRow) target.scrollIntoView({ block: "nearest" });
      }
    }
  }

  // ---- About you -----------------------------------------------------------
  function aboutYou(): HTMLElement[] {
    fieldScope = "about";
    // Two plain pickers. The browser's own month control is missing in Safari and Firefox.
    const born = h().self.birthDate ? parseYearMonth(h().self.birthDate!.value) : null;
    const thisYear = parseYearMonth(asOf().slice(0, 7)).year;
    const years: { value: string; label: string }[] = [];
    for (let y = thisYear - 16; y >= thisYear - 100; y--) years.push({ value: String(y), label: String(y) });
    const birthBadge = badgeSlot(() => h().self.birthDate, () => undefined, false);
    const setBirth = () => {
      if (birthMonth.value && birthYear.value) h().self.birthDate = userValue(`${birthYear.value}-${birthMonth.value}`, asOf());
      else delete h().self.birthDate;
      ctx.save();
      birthBadge.refresh();
    };
    const birthMonth = select(MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name })), born ? String(born.month).padStart(2, "0") : undefined, setBirth, "Month");
    const birthYear = select(years, born ? String(born.year) : undefined, setBirth, "Year");
    const stateNames = loadTaxTables().states;
    const state = select(
      STATE_CODES.map((s) => ({ value: s, label: stateNames[s].name })).sort((a, b) => a.label.localeCompare(b.label)),
      h().self.state?.value,
      (v: StateCode) => {
        h().self.state = userValue(v, asOf());
        ctx.save();
      },
      "Choose a state",
    );
    const filing = select(FILING, h().self.filingStatus.value, (v: FilingStatus) => {
      h().self.filingStatus = userValue(v, asOf());
      ctx.save();
      schedule();
    });
    return [
      el(
        "div",
        { class: "field-grid" },
        field("Birth month", birthMonth, birthBadge.node),
        field("Birth year", birthYear),
        field("State", state),
        field("Filing status", filing, kindBadge(h().self.filingStatus.confidence)),
      ),
      ...partnerBlock(years),
      ...householdExtras(),
    ];
  }

  /** Dependents (dictionary 9.14), the home (9.15), and the local tax rate, each while its module is active (beta). */
  function householdExtras(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const thisYear = parseYearMonth(asOf().slice(0, 7)).year;
    const childYears: { value: string; label: string }[] = [];
    for (let y = thisYear; y >= thisYear - 25; y--) childYears.push({ value: String(y), label: String(y) });
    if (activeModule("dependents", ctx)) {
      const rows = (h().dependents ?? []).map((d, n) => {
        fieldScope = `dep-${d.id}`;
        const born = parseYearMonth(d.birthDate.value);
        const setBirth = () => { d.birthDate = userValue(`${year.value}-${month.value}`, asOf()); ctx.save(); schedule(); };
        const month = select(MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name })), String(born.month).padStart(2, "0"), setBirth, "Month");
        const year = select(childYears, String(born.year), setBirth, "Year");
        const lives = select([{ value: "yes", label: "Lives with me more than half the year" }, { value: "no", label: "Lives elsewhere most of the year" }], d.livesWithYou.value ? "yes" : "no", (v: "yes" | "no") => { d.livesWithYou = userValue(v === "yes", asOf()); ctx.save(); schedule(); });
        const age = thisYear - born.year;
        return el(
          "div",
          { class: "field-grid", "data-editor": `dep-${d.id}` },
          field(`Child ${n + 1}: birth month`, month),
          field("Birth year", year, kindBadge(d.birthDate.confidence)),
          field("Where they live", lives),
          el("p", { class: "muted" }, `About ${age} this year. ${age < 17 ? "Counts for the child tax credit until the year they turn 17." : "Past the child tax credit."} ${age < 13 ? "Childcare counts for the dependent care credit until 13." : ""}`),
          el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { h().dependents = (h().dependents ?? []).filter((x) => x.id !== d.id); ctx.save(); schedule(); } }, "Remove")),
        );
      });
      out.push(
        el(
          "details",
          { class: "card", open: (h().dependents?.length ?? 0) > 0 },
          el("summary", { class: "card__summary" }, el("h3", {}, "Children and dependents"), el("span", { class: "lock-badge" }, "Beta")),
          el("div", { class: "stack card__details-body" }, el("p", { class: "muted" }, "A child under 17 changes your return by the child tax credit; childcare for a child under 13 by the dependent care credit; a child living with you by head of household. Each ends on the child's age, and the plan shows the year."), ...rows, el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: () => { const id = rowId("dep"); (h().dependents ??= []).push({ id, birthDate: userValue(`${thisYear - 8}-01`, asOf(), "roughly"), livesWithYou: userValue(true, asOf()) }); pendingEditor = `dep-${id}`; ctx.save(); schedule(); } }, "Add a child"))),
        ),
      );
    }
    if (activeModule("home", ctx)) {
      fieldScope = "home";
      const home = h().home;
      const value = el("input", { class: "input input--money", type: "text", inputmode: "decimal", placeholder: "0", autocomplete: "off", value: home ? amountForInput(home.value.value) : "" });
      value.addEventListener("change", () => {
        const v = parseMoney(value.value);
        if (v === null || v <= 0) delete h().home;
        else h().home = { ...(h().home ?? {}), value: { value: v, asOf: asOf(), source: "user", confidence: "roughly" } };
        ctx.save();
        schedule();
      });
      const reserve = el("input", { class: "input", type: "number", min: 0, max: 5, step: 0.25, value: home?.maintenanceReservePercent?.value ?? 1, disabled: !home });
      reserve.addEventListener("change", () => { if (h().home) { h().home!.maintenanceReservePercent = userValue(Number(reserve.value), asOf()); ctx.save(); schedule(); } });
      out.push(
        el(
          "details",
          { class: "card", open: !!home },
          el("summary", { class: "card__summary" }, el("h3", {}, "Your home"), el("span", { class: "lock-badge" }, "Beta")),
          el("div", { class: "stack card__details-body" }, el("p", { class: "muted" }, "A home you own. It is kept out of your FI number and the net worth chart; its upkeep, a percent of its value a year, is counted as spending. Property tax and insurance stay in your spending rows."), el("div", { class: "field-grid" }, field("Value today, roughly", value, home ? kindBadge(home.value.confidence) : null), field("Upkeep reserve (% of value a year)", reserve))),
        ),
      );
    }
    if (activeModule("dependents", ctx) || activeModule("home", ctx)) {
      fieldScope = "local";
      const local = el("input", { class: "input", type: "number", min: 0, max: 5, step: 0.05, value: h().self.localTaxPercent?.value ?? "", placeholder: h().self.state?.value === "PA" ? "1 (the common rate)" : "0" });
      local.addEventListener("change", () => { if (local.value === "") delete h().self.localTaxPercent; else h().self.localTaxPercent = userValue(Number(local.value), asOf()); ctx.save(); schedule(); });
      out.push(el("div", { class: "field-grid" }, field("Local earned income tax (% of wages and net profit)", local, null, el("p", { class: "field__help" }, "Pennsylvania municipalities levy one (1% is common; Philadelphia is higher). Blank means the state's default."))));
    }
    return out;
  }

  /** Households of two (docs/household-two-spec.md 2.7): add a partner, their birth month, HSA, and claiming age; remove asks first. */
  let confirmRemovePartner = false;
  function partnerBlock(years: { value: string; label: string }[]): HTMLElement[] {
    const partner = h().partner;
    if (!partner) {
      const married = h().self.filingStatus.value === "marriedJoint" || h().self.filingStatus.value === "marriedSeparate";
      return [
        el(
          "div",
          { class: "row-actions" },
          el("button", { type: "button", class: "button button--quiet", onClick: () => { h().partner = emptyPerson(asOf()); ctx.save(); schedule(); } }, "Add a partner"),
          married ? el("p", { class: "notice" }, "The filing status is married. Adding your partner lets the plan use both ages, both earnings records, and both Social Security benefits.") : null,
        ),
      ];
    }
    fieldScope = "partner";
    const born = partner.birthDate ? parseYearMonth(partner.birthDate.value) : null;
    const birthBadge = badgeSlot(() => partner.birthDate, () => undefined, false);
    const setBirth = () => {
      if (birthMonth.value && birthYear.value) partner.birthDate = userValue(`${birthYear.value}-${birthMonth.value}`, asOf());
      else delete partner.birthDate;
      ctx.save();
      birthBadge.refresh();
    };
    const birthMonth = select(MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name })), born ? String(born.month).padStart(2, "0") : undefined, setBirth, "Month");
    const birthYear = select(years, born ? String(born.year) : undefined, setBirth, "Year");
    const hsa = select([{ value: "no", label: "No" }, { value: "yes", label: "Yes, a high-deductible health plan" }], partner.hsaEligible.value ? "yes" : "no", (v) => { partner.hsaEligible = userValue(v === "yes", asOf()); ctx.save(); });
    const fra = born ? loadSocialSecurityParams().normalRetirementAge(born.year).years : 67;
    const claimOptions = [{ value: "default", label: `Full retirement age (${fra})` }, ...[62, 63, 64, 65, 66, 67, 68, 69, 70].map((a) => ({ value: String(a), label: `Age ${a}` }))];
    const claim = select(claimOptions, partner.socialSecurity.claimingAge ? String(partner.socialSecurity.claimingAge.value.years) : "default", (v) => {
      if (v === "default") delete partner.socialSecurity.claimingAge;
      else partner.socialSecurity.claimingAge = userValue({ years: Number(v), months: 0 }, asOf());
      ctx.save();
    });
    const partnerIncome = partner.income.kind === "rows" ? partner.income.rows.length : 0;
    const remove = confirmRemovePartner
      ? confirmPanel({
          sentence: partnerIncome > 0 ? `Removing your partner also removes their ${partnerIncome === 1 ? "income stream" : `${partnerIncome} income streams`}. Accounts marked as theirs become yours.` : "Removing your partner takes their ages and benefits out of the plan. Accounts marked as theirs become yours.",
          confirmLabel: "Remove partner",
          cancelLabel: "Keep partner",
          onConfirm: () => {
            delete h().partner;
            if (h().accounts.kind === "rows") for (const a of (h().accounts as { kind: "rows"; rows: Account[] }).rows) if (a.owner === "partner") a.owner = "self";
            confirmRemovePartner = false;
            ctx.save();
            schedule();
          },
          onCancel: () => { confirmRemovePartner = false; schedule(); },
        })
      : el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: () => { confirmRemovePartner = true; schedule(); } }, "Remove partner"));
    return [
      el("h3", { class: "card__subheading" }, "Your partner"),
      el(
        "div",
        { class: "field-grid" },
        field("Partner's birth month", birthMonth, birthBadge.node),
        field("Partner's birth year", birthYear),
        field("Partner HSA eligible", hsa),
        field("Partner's Social Security claiming age", claim),
      ),
      el("p", { class: "notice" }, "Add your partner's jobs in the Income section and mark whose they are. Each account can be marked yours, your partner's, or joint."),
      remove,
    ];
  }

  // ---- Income ----------------------------------------------------------------
  /** Which person a stream belongs to (households of two). */
  const personOfStream = (id: string): "self" | "partner" => {
    const p = h().partner;
    return p && p.income.kind === "rows" && p.income.rows.some((r) => r.id === id) ? "partner" : "self";
  };
  const streamsOf = (who: "self" | "partner"): IncomeStream[] => {
    const person = who === "partner" ? h().partner : h().self;
    return person && person.income.kind === "rows" ? person.income.rows : [];
  };
  const setStreams = (who: "self" | "partner", rows: IncomeStream[]) => {
    const person = who === "partner" ? h().partner : h().self;
    if (!person) return;
    person.income = rows.length ? { kind: "rows", rows } : who === "self" ? { kind: "unanswered" } : { kind: "none", asOf: asOf() };
  };
  function income(): HTMLElement[] {
    const answer = h().self.income;
    const body = el("div", { class: "rows" });
    const partnerRows = streamsOf("partner");

    if (answer.kind === "none" && partnerRows.length === 0) {
      body.append(el("p", { class: "empty-state" }, "No income right now. That counts as answered."));
    } else if ((answer.kind !== "rows" || answer.rows.length === 0) && partnerRows.length === 0) {
      body.append(el("p", { class: "empty-state" }, "No income yet. Add your first stream."));
    } else {
      const listed = [...(answer.kind === "rows" ? answer.rows : []), ...partnerRows];
      for (const s of listed) {
        if (openRow === s.id) {
          body.append(streamEditor(s));
          continue;
        }
        const missing = incomeState(s) === "missing";
        const detail: string[] = [];
        if (personOfStream(s.id) === "partner") detail.push("partner's");
        if (s.start && s.start > asOf().slice(0, 7)) detail.push(`starts ${shortMonth(s.start)}`);
        if (s.end.kind === "date") detail.push(`through ${shortMonth(s.end.date)}`);
        else if (s.end.kind === "age") detail.push(`until age ${s.end.age}`);
        if (s.notConfirmed) detail.push("not confirmed");
        body.append(denseRow({
          id: s.id,
          name: s.label ?? INCOME_TYPES.find((t) => t.type === s.type)?.label ?? s.type,
          value: missing ? "Needs an amount" : `${dollars(s.grossAnnual.value)}/yr`,
          needsAnswer: missing,
          badge: missing ? null : kindBadge(s.grossAnnual.confidence),
          detail: detail.join(", "),
          onOpen: () => openTheRow(s.id),
        }));
      }
    }

    const addStream = (who: "self" | "partner", type: IncomeType) => {
      const rows = streamsOf(who);
      const stream: IncomeStream = {
        id: rowId("income"),
        type,
        grossAnnual: userValue(0, asOf(), type === "salary" || type === "unemployment" ? "known" : "roughly"),
        // Unemployment benefits start with an end six months out (most states pay up to 26 weeks).
        end: type === "unemployment" ? { kind: "date", date: addMonths(asOf().slice(0, 7), 5) } : { kind: "retirement" },
      };
      if (type === "salary" || type === "hourly") stream.payFrequency = { ...userValue("biweekly" as const, asOf()), confidence: "roughly" };
      setStreams(who, [...rows, stream]);
      openRow = stream.id;
      pendingFocusKey = `${stream.id}|${type === "unemployment" ? "Benefit amount" : "Gross pay"}`;
      ctx.save();
      schedule();
    };
    const addType = select(INCOME_TYPES.map((t) => ({ value: t.type, label: t.label })), undefined, (type: IncomeType) => addStream("self", type), "Add income");
    addType.setAttribute("aria-label", "Add income");
    const addPartner = h().partner ? select(INCOME_TYPES.map((t) => ({ value: t.type, label: t.label })), undefined, (type: IncomeType) => addStream("partner", type), "Add partner's income") : null;
    addPartner?.setAttribute("aria-label", "Add partner's income");

    const none = el("button", { type: "button", class: "button button--quiet", onClick: () => { h().self.income = { kind: "none", asOf: asOf() }; ctx.save(); schedule(); } }, "I don't have income right now");

    return [body, el("div", { class: "row-actions" }, addType, addPartner, answer.kind !== "none" ? none : null)];
  }

  function streamEditor(s: IncomeStream): HTMLElement {
    fieldScope = s.id;
    const typeLabel = INCOME_TYPES.find((t) => t.type === s.type)?.label ?? s.type;
    const isWage = s.type === "salary" || s.type === "hourly";
    const isSe = s.type === "selfEmployed" || s.type === "sideGig";
    const cadences = s.type === "hourly" ? (["hour", "paycheck", "month", "year"] as const) : isWage ? (["paycheck", "month", "year"] as const) : s.type === "unemployment" ? (["week", "month", "year"] as const) : (["month", "year"] as const);
    const isUnemployment = s.type === "unemployment";

    const grossBadge = badgeSlot(() => (s.grossAnnual.value > 0 ? s.grossAnnual : undefined), (v) => { s.grossAnnual = v; });
    const fields: HTMLElement[] = [];
    if (h().partner) {
      const who = personOfStream(s.id);
      fields.push(field("Whose income", select([{ value: "self", label: "Mine" }, { value: "partner", label: "My partner's" }], who, (v: "self" | "partner") => {
        if (v === who) return;
        setStreams(who, streamsOf(who).filter((r) => r.id !== s.id));
        setStreams(v, [...streamsOf(v), s]);
        ctx.save();
        schedule();
      })));
    }
    fields.push(
      money({
        label: isUnemployment ? "Benefit amount" : "Gross pay",
        annual: s.grossAnnual.value || null,
        cadences,
        initialCadence: isUnemployment ? "week" : "year",
        payFrequency: () => s.payFrequency?.value ?? "biweekly",
        hoursPerWeek: () => s.hoursPerWeek?.value ?? null,
        badge: grossBadge.node,
        rough: () => isRough(s.grossAnnual.confidence),
        onChange: (annual) => {
          s.grossAnnual = { ...s.grossAnnual, value: annual ?? 0 };
          ctx.save();
          grossBadge.refresh();
        },
      }),
    );

    if (isWage) {
      fields.push(field("Pay frequency", select(PAY_FREQUENCIES, s.payFrequency?.value ?? "biweekly", (v: PayFrequency) => { s.payFrequency = userValue(v, asOf()); ctx.save(); })));
    }
    if (s.type === "hourly") {
      const hours = el("input", { class: "input", type: "number", min: 1, max: 80, step: 1, value: s.hoursPerWeek?.value ?? "" });
      const hoursBadge = badgeSlot(() => s.hoursPerWeek, (v) => { s.hoursPerWeek = v; });
      hours.addEventListener("input", () => {
        const v = Number(hours.value);
        if (v >= 1 && v <= 80) s.hoursPerWeek = userValue(v, asOf());
        else delete s.hoursPerWeek;
        ctx.save();
        hoursBadge.refresh();
      });
      fields.push(field("Hours per week", hours, hoursBadge.node));
    }
    if (isSe) {
      const expBadge = badgeSlot(() => s.businessExpensesAnnual, (v) => { s.businessExpensesAnnual = v; });
      fields.push(money({
        label: "Business expenses",
        annual: s.businessExpensesAnnual?.value ?? null,
        cadences: ["month", "year"],
        initialCadence: "year",
        badge: expBadge.node,
        rough: () => isRough(s.businessExpensesAnnual?.confidence),
        onChange: (annual) => {
          if (annual === null) delete s.businessExpensesAnnual;
          else s.businessExpensesAnnual = userValue(annual, asOf(), "roughly");
          ctx.save();
          expBadge.refresh();
        },
      }));
    }
    if (isWage) {
      const matchPct = el("input", { class: "input", type: "number", min: 0, max: 200, step: 1, value: s.employerMatch?.matchPercent.value ?? "" });
      const matchCap = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.5, value: s.employerMatch?.capPercentOfPay.value ?? "" });
      const pctBadge = badgeSlot(() => s.employerMatch?.matchPercent, (v) => { if (s.employerMatch) s.employerMatch.matchPercent = v; });
      const capBadge = badgeSlot(() => s.employerMatch?.capPercentOfPay, (v) => { if (s.employerMatch) s.employerMatch.capPercentOfPay = v; });
      const updateMatch = () => {
        const p = Number(matchPct.value);
        const c = Number(matchCap.value);
        if (matchPct.value !== "" && matchCap.value !== "" && p >= 0 && c >= 0) s.employerMatch = { matchPercent: userValue(p, asOf()), capPercentOfPay: userValue(c, asOf()) };
        else delete s.employerMatch;
        ctx.save();
        pctBadge.refresh();
        capBadge.refresh();
      };
      matchPct.addEventListener("input", updateMatch);
      matchCap.addEventListener("input", updateMatch);
      fields.push(field("Employer match (%)", matchPct, pctBadge.node));
      fields.push(field("Match cap (% of pay)", matchCap, capBadge.node));

      const setDeductions = (list: PreTaxDeduction[]) => {
        if (list.length) s.preTaxDeductions = list;
        else delete s.preTaxDeductions;
        ctx.save();
      };

      // Workplace plan: stored as a percent of pay, in the account type the person chooses (data dictionary 3.4).
      const workplace = () => s.preTaxDeductions?.find(isWorkplaceContribution);
      const percentInput = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.5, value: workplace()?.percentOfPay.value ?? "" });
      const percentHelp = el("div", { class: "money-input__normalized", "aria-live": "polite" });
      const percentBadge = badgeSlot(() => workplace()?.percentOfPay, (v) => { const w = workplace(); if (w) w.percentOfPay = v; });
      const showPercentHelp = () => {
        const w = workplace();
        percentHelp.textContent = !w || !(s.grossAnnual.value > 0)
          ? ""
          : `${isRough(w.percentOfPay.confidence) ? "About " : ""}${dollars(amountFromPercentOfPay(w.percentOfPay.value, s.grossAnnual.value))} a year at your current pay`;
      };
      showPercentHelp();
      const accountType = select<WorkplaceAccountType>(
        [{ value: "traditional", label: "Traditional (pre-tax)" }, { value: "roth", label: "Roth (after tax)" }],
        workplace()?.accountType.value ?? "traditional",
        (v) => {
          const current = workplace();
          if (!current) return;
          current.accountType = userValue(v, asOf());
          ctx.save();
        },
      );
      percentInput.addEventListener("input", () => {
        const p = percentInput.value === "" ? null : Number(percentInput.value);
        const others: PreTaxDeduction[] = (s.preTaxDeductions ?? []).filter((d) => !isWorkplaceContribution(d));
        if (p !== null && p > 0 && p <= 100) {
          others.push({ id: `${s.id}-401k`, type: "401k", percentOfPay: userValue(p, asOf()), accountType: userValue(accountType.value as WorkplaceAccountType, asOf()) });
        }
        setDeductions(others);
        showPercentHelp();
        percentBadge.refresh();
      });
      fields.push(field("Your 401(k) or 403(b) (% of pay)", percentInput, percentBadge.node, percentHelp));
      fields.push(field("Contribution type", accountType));

      const hsa = () => s.preTaxDeductions?.find((d): d is AnnualDeduction => d.type === "hsa");
      const hsaBadge = badgeSlot(() => hsa()?.annual, (v) => { const x = hsa(); if (x) x.annual = v; });
      fields.push(
        money({
          label: "Your HSA contribution",
          annual: hsa()?.annual.value ?? null,
          cadences: ["paycheck", "month", "year"],
          initialCadence: "year",
          payFrequency: () => s.payFrequency?.value ?? "biweekly",
          badge: hsaBadge.node,
          rough: () => isRough(hsa()?.annual.confidence),
          onChange: (annual) => {
            const list: PreTaxDeduction[] = (s.preTaxDeductions ?? []).filter((d) => d.type !== "hsa");
            if (annual !== null && annual > 0) list.push({ id: `${s.id}-hsa`, type: "hsa", annual: userValue(annual, asOf()) });
            setDeductions(list);
            hsaBadge.refresh();
          },
        }),
      );
    }

    // When the income starts: already, or in a coming month.
    const planYear = parseYearMonth(asOf().slice(0, 7)).year;
    const comingYears: { value: string; label: string }[] = [];
    for (let y = planYear; y <= planYear + 50; y++) comingYears.push({ value: String(y), label: String(y) });
    const monthOptions = MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name }));
    {
      const startSelect = select(
        [{ value: "now", label: "Already started" }, { value: "later", label: "Starts in a coming month" }],
        s.start ? "later" : "now",
        (v) => {
          if (v === "later") s.start = addMonths(asOf().slice(0, 7), 1);
          else delete s.start;
          ctx.save();
          schedule();
        },
      );
      fields.push(field(isUnemployment ? "These benefits start" : "This income starts", startSelect));
      if (s.start) {
        const from = parseYearMonth(s.start);
        const setStart = () => {
          s.start = `${startYear.value}-${startMonth.value}`;
          ctx.save();
        };
        const startMonth = select(monthOptions, String(from.month).padStart(2, "0"), setStart);
        const startYear = select(comingYears, String(from.year), setStart);
        fields.push(field("Starts in", startMonth, kindBadge("known")));
        fields.push(field("Start year", startYear));
      }
    }

    // Certain, or expected but not confirmed yet (named on the result screen).
    fields.push(field("Is this income confirmed?", select(
      [{ value: "yes", label: "Yes, it is certain" }, { value: "no", label: "Expected, not confirmed yet" }],
      s.notConfirmed ? "no" : "yes",
      (v) => {
        if (v === "no") s.notConfirmed = true;
        else delete s.notConfirmed;
        ctx.save();
      },
    )));

    // How long the income lasts: until retirement, until an age, or through a month.
    const endKind = s.end.kind === "age" ? "age" : s.end.kind === "date" ? "date" : "retirement";
    if (!isUnemployment) {
      const endSelect = select(
        [{ value: "retirement", label: "Until I retire" }, { value: "age", label: "Until an age" }, { value: "date", label: "Through a month" }],
        endKind,
        (v) => {
          s.end = v === "age" ? { kind: "age", age: 30 } : v === "date" ? { kind: "date", date: addMonths(asOf().slice(0, 7), 11) } : { kind: "retirement" };
          ctx.save();
          schedule();
        },
      );
      fields.push(field("This income lasts", endSelect));
    }
    if (s.end.kind === "age") {
      const endAge = el("input", { class: "input", type: "number", min: 16, max: 100, step: 1, value: s.end.age });
      endAge.addEventListener("input", () => { const v = Number(endAge.value); if (v >= 16 && v <= 100) { s.end = { kind: "age", age: v }; ctx.save(); } });
      fields.push(field("Ends at age", endAge, kindBadge("known")));
    }
    if (s.end.kind === "date") {
      const through = parseYearMonth(s.end.date);
      const weeksHelp = el("div", { class: "money-input__normalized", "aria-live": "polite" });
      const showWeeks = () => {
        if (s.end.kind !== "date") return;
        const weeks = weeksThroughEndOf(asOf(), s.end.date);
        weeksHelp.textContent = weeks > 0 ? `About ${weeks} more ${weeks === 1 ? "week" : "weeks"} from today` : "That month has already passed";
      };
      const yearOptions: { value: string; label: string }[] = [];
      for (let y = planYear; y <= planYear + 50; y++) yearOptions.push({ value: String(y), label: String(y) });
      const setThrough = () => {
        s.end = { kind: "date", date: `${endYear.value}-${endMonth.value}` };
        ctx.save();
        showWeeks();
      };
      const endMonth = select(MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name })), String(through.month).padStart(2, "0"), setThrough);
      const endYear = select(yearOptions, String(through.year), setThrough);
      showWeeks();
      fields.push(field(isUnemployment ? "Benefits paid through" : "Paid through", endMonth, kindBadge("known"), weeksHelp));
      fields.push(field(isUnemployment ? "Benefits end year" : "End year", endYear));
    }

    return editorShell(s.id, s.label ? `${s.label} (${typeLabel.toLowerCase()})` : typeLabel, fields, [], () => {
      const who = personOfStream(s.id);
      setStreams(who, streamsOf(who).filter((r) => r.id !== s.id));
      ctx.save();
    });
  }

  // ---- Spending --------------------------------------------------------------
  function spending(): HTMLElement[] {
    const currentRows = (): SpendingRow[] => {
      const sp = h().spending;
      return sp.kind === "rows" ? sp.rows : [];
    };
    const setRows = (next: SpendingRow[]) => {
      h().spending = next.length ? { kind: "rows", rows: next } : { kind: "unanswered" };
      ctx.save();
    };
    const categories = loadSpendingCategories();
    const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
    const nameOf = (r: SpendingRow) => (r.id === "total" ? "Everything you spend" : r.label ?? categoryLabel(r.category));

    const planMonth = asOf().slice(0, 7);
    const planYear = parseYearMonth(planMonth).year;
    const two = (n: number) => String(n).padStart(2, "0");
    const monthOptions = MONTH_NAMES.map((name, i) => ({ value: two(i + 1), label: name }));
    const yearOptions = (from: number) => {
      const out: { value: string; label: string }[] = [];
      for (let y = Math.min(from, planYear); y <= planYear + 60; y++) out.push({ value: String(y), label: String(y) });
      return out;
    };

    /** When a row counts, in a few words: "starts Jul 2027, through Jun 2030". */
    const when = (r: SpendingRow): string => {
      const parts: string[] = [];
      if (r.start) parts.push(`starts ${shortMonth(r.start)}`);
      if (r.end?.kind === "date") parts.push(`through ${shortMonth(r.end.date)}`);
      else if (r.end?.kind === "age") parts.push(`until age ${r.end.age}`);
      else if (r.end?.kind === "retirement") parts.push("until you retire");
      return parts.join(", ");
    };

    /** One spending row opened: its amount, when it starts and ends, and its actions. */
    const editor = (row: SpendingRow): HTMLElement => {
      fieldScope = `spending:${row.id}`;
      const badge = badgeSlot(() => row.annual, (v) => { row.annual = v; });
      const fields: HTMLElement[] = [
        money({
          label: "Amount",
          annual: row.annual.value > 0 || row.start !== undefined || row.end !== undefined ? row.annual.value : null,
          cadences: ["month", "year"],
          initialCadence: "month",
          badge: badge.node,
          rough: () => isRough(row.annual.confidence),
          onChange: (annual) => {
            // The row stays while it is being edited. Remove takes it away.
            row.annual = userValue(annual ?? 0, asOf(), row.annual.confidence === "known" ? "known" : "roughly");
            ctx.save();
            badge.refresh();
          },
        }),
      ];
      const changed = () => {
        ctx.save();
        schedule();
      };

      const startSelect = select(
        [{ value: "now", label: "Already counts" }, { value: "later", label: "Starts in a coming month" }],
        row.start ? "later" : "now",
        (v) => {
          if (v === "later") row.start = addMonths(planMonth, 1);
          else delete row.start;
          changed();
        },
      );
      fields.push(field("This spending starts", startSelect));
      if (row.start) {
        const from = parseYearMonth(row.start);
        const setStart = () => {
          row.start = `${startYear.value}-${startMonth.value}`;
          ctx.save();
        };
        const startMonth = select(monthOptions, two(from.month), setStart);
        const startYear = select(yearOptions(from.year), String(from.year), setStart);
        fields.push(field("Starts in", startMonth), field("Start year", startYear));
      }

      const endSelect = select(
        [{ value: "none", label: "Does not end" }, { value: "date", label: "Through a month" }, { value: "age", label: "Until an age" }, { value: "retirement", label: "Until I retire" }],
        row.end?.kind ?? "none",
        (v) => {
          if (v === "none") delete row.end;
          else row.end = v === "date" ? { kind: "date", date: addMonths(row.start ?? planMonth, 11) } : v === "age" ? { kind: "age", age: 65 } : { kind: "retirement" };
          changed();
        },
      );
      fields.push(field("This spending ends", endSelect));
      if (row.end?.kind === "date") {
        const through = parseYearMonth(row.end.date);
        const setEnd = () => {
          row.end = { kind: "date", date: `${endYear.value}-${endMonth.value}` };
          ctx.save();
        };
        const endMonth = select(monthOptions, two(through.month), setEnd);
        const endYear = select(yearOptions(through.year), String(through.year), setEnd);
        fields.push(field("Counts through", endMonth), field("End year", endYear));
      }
      if (row.end?.kind === "age") {
        const endAge = el("input", { class: "input", type: "number", min: 16, max: 100, step: 1, value: row.end.age });
        endAge.addEventListener("input", () => {
          const v = Number(endAge.value);
          if (v >= 16 && v <= 100) {
            row.end = { kind: "age", age: v };
            ctx.save();
          }
        });
        fields.push(field("Ends at age", endAge));
      }

      const another = row.id === "total" ? null : el("button", { type: "button", class: "button button--quiet", onClick: () => {
        // A second amount in the same category, for a cost that changes on a date.
        const next: SpendingRow = {
          id: rowId("sp"),
          category: row.category,
          annual: userValue(0, asOf(), "roughly"),
          start: row.end?.kind === "date" ? addMonths(row.end.date, 1) : addMonths(planMonth, 1),
        };
        setRows([...currentRows(), next]);
        openRow = next.id;
        pendingFocusKey = `spending:${next.id}|Amount`;
        schedule();
      } }, "Add another amount");

      return editorShell(
        row.id,
        nameOf(row),
        fields,
        another ? [el("p", { class: "muted" }, "Amounts in the same category add together. End the old amount where the new one starts.")] : [],
        () => setRows(currentRows().filter((r) => r.id !== row.id)),
        another ? [another] : [],
      );
    };

    const list = el("div", { class: "rows" });
    const rows = currentRows();
    if (rows.length === 0) list.append(el("p", { class: "empty-state" }, "No spending yet. Add a category, or put one total under Everything else."));
    for (const r of rows) {
      if (openRow === r.id) {
        list.append(editor(r));
        continue;
      }
      const missing = spendingState(r) === "missing";
      list.append(denseRow({
        id: r.id,
        name: nameOf(r),
        value: missing ? "Needs an amount" : `${dollars(fromAnnual(r.annual.value, "month"))}/mo`,
        needsAnswer: missing,
        badge: missing ? null : kindBadge(r.annual.confidence),
        detail: when(r),
        onOpen: () => openTheRow(r.id),
      }));
    }

    const add = select(categories.map((c) => ({ value: c.id, label: c.label })), undefined, (category: string) => {
      const row: SpendingRow = { id: rowId("sp"), category, annual: userValue(0, asOf(), "roughly") };
      setRows([...currentRows(), row]);
      openRow = row.id;
      pendingFocusKey = `spending:${row.id}|Amount`;
      schedule();
    }, "Add spending");
    add.setAttribute("aria-label", "Add spending");

    return [
      list,
      el("div", { class: "row-actions" }, add),
      el("p", { class: "muted" }, "Spending means consumption only. Debt payments and saving are counted elsewhere, so they are not double counted."),
    ];
  }

  // ---- Accounts --------------------------------------------------------------
  /** Which add list is showing: accounts, debts, or neither. */
  let pickerOpen: "asset" | "debt" | null = null;

  /** One side of the accounts list: what the person owns ("asset") or owes ("debt"). */
  function accounts(side: "asset" | "debt"): (HTMLElement | null)[] {
    const answer = h().accounts;
    const noun = side === "asset" ? "accounts" : "debts";
    const mine = answer.kind === "rows" ? answer.rows.filter((a) => a.side === side) : [];
    const body = el("div", { class: "rows" });
    if (answer.kind === "none") body.append(el("p", { class: "empty-state" }, `No ${noun}. That counts as answered.`));
    else if (mine.length === 0) body.append(el("p", { class: "empty-state" }, side === "asset" ? "No accounts yet. Add your first one." : "No debts listed."));
    else {
      // Grouped by type, each group with its count and subtotal from the engine.
      for (const g of accountGroups(h())[side === "asset" ? "assets" : "debts"]) {
        body.append(groupHeader(g.label, g.count, dollars(g.subtotal)));
        for (const id of g.accountIds) {
          const a = mine.find((x) => x.id === id);
          if (a) body.append(openRow === a.id ? accountEditor(a) : accountRow(a));
        }
      }
    }

    const open = pickerOpen === side;
    const actions = el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button", "aria-expanded": String(open), onClick: () => { pickerOpen = open ? null : side; schedule(); } }, open ? "Close the list" : side === "asset" ? "Add account" : "Add debt"),
      side === "asset" && answer.kind !== "none" && (answer.kind === "unanswered" || answer.rows.length === 0)
        ? el("button", { type: "button", class: "button button--quiet", onClick: () => { h().accounts = { kind: "none", asOf: asOf() }; ctx.save(); schedule(); } }, "I don't have any accounts or debts")
        : null,
    );

    const picker = open
      ? presetPicker((key: AccountPresetKey) => {
          const acc = h().accounts;
          const rows = acc.kind === "rows" ? acc.rows : [];
          const preset = getAccountPreset(key);
          const id = rowId("acct");
          const balance = userValue(0, asOf(), "roughly");
          let account: Account;
          if (preset.side === "asset") {
            account = assetFromPreset(key, id, balance, asOf());
          } else {
            // A debt never starts with a silent zero. The rate is the preset's typical rate marked
            // roughly, or a look-it-up placeholder that must be answered. The payment is an
            // estimate from the engine, marked roughly, until the person enters the real one.
            const rate: Value<number> = preset.typicalRate !== undefined
              ? { value: preset.typicalRate, asOf: asOf(), source: "preset", confidence: "roughly" }
              : { value: 0, asOf: asOf(), source: "preset", confidence: "lookUp" };
            const estimate: Value<number> = { value: 0, asOf: asOf(), source: "preset", confidence: "roughly" };
            account = debtFromPreset(key, id, balance, { rate, minimumPaymentAnnual: estimate, actualPaymentAnnual: { ...estimate } }, asOf());
          }
          h().accounts = { kind: "rows", rows: [...rows, account] };
          openRow = id;
          pendingFocusKey = `${id}|${preset.side === "asset" ? "Balance" : "Balance owed"}`;
          pickerOpen = null;
          ctx.save();
          schedule();
        }, side)
      : null;

    return [body, actions, picker];
  }

  /** An account or debt folded to one line: name, balance, and for a debt its rate and payment. */
  function accountRow(a: Account): HTMLElement {
    const missing = accountState(a) === "missing";
    const hasBalance = a.balance.value !== null && a.balance.confidence !== "lookUp" && a.balance.confidence !== "notForMe";
    const detail: string[] = [];
    if (a.side === "debt") {
      if (a.rate.source === "preset" && a.rate.confidence === "lookUp") detail.push("needs its interest rate");
      else if (a.promo) {
        const after = a.promo.rateAfter.confidence === "lookUp" ? "then a rate still needed" : `then ${percent(a.promo.rateAfter.value)}`;
        detail.push(`${percent(a.promo.rate.value)} through ${shortMonth(a.promo.endDate.value)}, ${after}`);
      } else detail.push(percent(a.rate.value));
      detail.push(`${dollars(fromAnnual(a.actualPaymentAnnual.value, "month"))}/mo${a.actualPaymentAnnual.source === "preset" ? " (estimate)" : ""}`);
    }
    return denseRow({
      id: a.id,
      name: a.name?.value ?? getAccountPreset(a.preset).label,
      value: hasBalance ? dollars(a.balance.value ?? 0) : "Needs a balance",
      needsAnswer: missing,
      badge: hasBalance ? kindBadge(a.balance.confidence) : null,
      detail: detail.join(", "),
      onOpen: () => openTheRow(a.id),
    });
  }

  /** Keeps a debt's estimated payment in step with its balance and rate until the person enters a real one. */
  function refreshEstimate(a: DebtAccount): void {
    if (a.minimumPaymentAnnual.source !== "preset") return;
    const balance = a.balance.value ?? 0;
    const estimate: Value<number> = { value: estimatedMinimumPaymentAnnual(balance, a.rate.value), asOf: asOf(), source: "preset", confidence: "roughly" };
    a.minimumPaymentAnnual = estimate;
    if (a.actualPaymentAnnual.source === "preset") a.actualPaymentAnnual = { ...estimate };
  }

  function accountEditor(a: Account): HTMLElement {
    fieldScope = a.id;
    const preset = getAccountPreset(a.preset);
    const balanceInput = el("input", { class: "input input--money", type: "text", inputmode: "decimal", placeholder: "0", autocomplete: "off", value: a.balance.value ? amountForInput(a.balance.value) : "" });
    balanceInput.addEventListener("blur", () => {
      const v = parseMoney(balanceInput.value);
      if (v !== null) balanceInput.value = amountForInput(v);
    });
    const balanceBadge = badgeSlot(
      () => (a.balance.value !== null && a.balance.value > 0 ? (a.balance as Value<number>) : undefined),
      (v) => { a.balance = v; },
    );
    balanceInput.addEventListener("input", () => {
      const v = parseMoney(balanceInput.value);
      const confidence = a.balance.confidence === "notForMe" ? "roughly" : a.balance.confidence;
      a.balance = v === null ? notForMe(asOf()) : { value: v, asOf: asOf(), source: "user", confidence };
      if (a.side === "debt") refreshEstimate(a);
      ctx.save();
      balanceBadge.refresh();
    });
    if (a.side === "debt") balanceInput.addEventListener("change", () => { if (a.minimumPaymentAnnual.source === "preset") schedule(); });

    const fields: HTMLElement[] = [field(a.side === "asset" ? "Balance" : "Balance owed", balanceInput, balanceBadge.node)];
    const flags: HTMLElement[] = [];
    if (h().partner) {
      // Dictionary 9.4: retirement accounts are never joint.
      const retirement = a.side === "asset" && (a.taxBucket.value === "pretax" || a.taxBucket.value === "roth" || a.taxBucket.value === "hsa");
      const owners: { value: AccountOwner; label: string }[] = [{ value: "self", label: "Mine" }, { value: "partner", label: "My partner's" }, ...(retirement ? [] : [{ value: "joint" as const, label: "Joint" }])];
      fields.push(field("Whose account", select(owners, a.owner ?? "self", (v: AccountOwner) => { a.owner = v; ctx.save(); })));
    }

    if (a.side === "asset") {
      const quick = loadQuickAllocations();
      const options = [
        { value: "mostlyStocks", label: "Mostly stocks (90 / 10 / 0)" },
        { value: "balanced", label: "Balanced (60 / 40 / 0)" },
        { value: "mostlyCash", label: "Mostly cash (0 / 0 / 100)" },
        { value: "preset", label: `As preset (${a.allocation.value.stocks} / ${a.allocation.value.bonds} / ${a.allocation.value.cash})` },
      ] as const;
      const current = (Object.keys(quick) as (keyof typeof quick)[]).find((k) => JSON.stringify(quick[k]) === JSON.stringify(a.allocation.value)) ?? "preset";
      fields.push(field("Mix of stocks, bonds, cash", select([...options], current, (v) => {
        if (v !== "preset") { a.allocation = userValue(quick[v], asOf()); ctx.save(); schedule(); }
      }), kindBadge(a.allocation.confidence)));
      fields.push(el("div", { class: "field" }, el("div", { class: "field__label-row" }, el("span", { class: "field__label" }, "Fees"), kindBadge(a.fees.confidence)), el("div", { class: "numbers" }, `${percent(a.fees.value)} a year`)));
    } else {
      const needsRate = a.rate.source === "preset" && a.rate.confidence === "lookUp";
      const rate = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.01, value: needsRate ? "" : a.rate.value });
      const rateBadge = badgeSlot(() => (needsRate ? undefined : a.rate), (v) => { a.rate = v; });
      rate.addEventListener("input", () => {
        if (rate.value === "") return;
        const v = Number(rate.value);
        if (v >= 0) {
          a.rate = userValue(v, asOf());
          if (a.promo) a.promo.rate = userValue(v, asOf());
          refreshEstimate(a);
          ctx.save();
        }
      });
      rate.addEventListener("change", () => schedule());
      fields.push(field("Interest rate (% a year)", rate, rateBadge.node));
      if (needsRate) flags.push(gentleFlag("This debt needs its interest rate before a plan can run. It is on your statement or in your lender's app."));

      // Family loans (dictionary 9.16, module family-loans, beta): what a loan from family carries that a bank loan does not.
      if (a.preset === "family" && activeModule("family-loans", ctx)) {
        const flex = select([{ value: "fixed", label: "Fixed, like a bank's" }, { value: "flexible", label: "Flexible: can come down when needed" }, { value: "pausable", label: "Can pause without penalty" }], a.paymentFlexibility?.value ?? "fixed", (v: PaymentFlexibility) => { a.paymentFlexibility = userValue(v, asOf()); ctx.save(); schedule(); });
        const forgive = select([{ value: "unknown", label: "Unknown" }, { value: "none", label: "No, it will be repaid in full" }, { value: "possible", label: "Possibly, some or all" }], a.possibleForgiveness?.value ?? "unknown", (v: PossibleForgiveness) => { a.possibleForgiveness = userValue(v, asOf()); ctx.save(); schedule(); });
        const lenders = select([1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 1 ? "One person" : `${n} people` })), String(a.lenders?.value ?? 1), (v: string) => { a.lenders = userValue(Number(v), asOf()); ctx.save(); schedule(); });
        const stress = select([1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 1 ? "1, barely on my mind" : n === 5 ? "5, it weighs on me" : String(n) })), String(a.stress?.value ?? 3), (v: string) => { a.stress = userValue(Number(v), asOf()); ctx.save(); schedule(); });
        fields.push(field("The payment is", flex), field("Might it be forgiven?", forgive), field("Who lent it", lenders), field("How much it weighs on you", stress));
        for (const view of familyLoans(h()).filter((v) => v.accountId === a.id)) for (const f of view.flags) flags.push(gentleFlag(f));
      }

      // A 0% rate is usually a promo: ask when it ends and what the rate is after.
      if ((!needsRate && a.rate.value === 0) || a.promo) {
        const planMonth = asOf().slice(0, 7);
        const promoSelect = select(
          [{ value: "none", label: "Does not end" }, { value: "ends", label: "Ends after a month" }],
          a.promo ? "ends" : "none",
          (v) => {
            if (v === "ends") {
              const typical = preset.side === "debt" ? preset.typicalRate : undefined;
              a.promo = {
                rate: { ...a.rate },
                endDate: userValue(addMonths(planMonth, 12), asOf()),
                rateAfter: typical !== undefined ? { value: typical, asOf: asOf(), source: "preset", confidence: "roughly" } : { value: 0, asOf: asOf(), source: "preset", confidence: "lookUp" },
              };
            } else delete a.promo;
            ctx.save();
            schedule();
          },
        );
        fields.push(field("This rate", promoSelect));
        const promo = a.promo;
        if (promo) {
          const through = parseYearMonth(promo.endDate.value);
          const firstYear = Math.min(through.year, parseYearMonth(planMonth).year);
          const years: { value: string; label: string }[] = [];
          for (let y = firstYear; y <= firstYear + 30; y++) years.push({ value: String(y), label: String(y) });
          const setEnd = () => {
            promo.endDate = userValue(`${promoYear.value}-${promoMonth.value}`, asOf());
            ctx.save();
          };
          const promoMonth = select(MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name })), String(through.month).padStart(2, "0"), setEnd);
          const promoYear = select(years, String(through.year), setEnd);
          fields.push(field("Promo rate lasts through", promoMonth, kindBadge(promo.endDate.confidence)));
          fields.push(field("Promo end year", promoYear));

          const afterMissing = promo.rateAfter.source === "preset" && promo.rateAfter.confidence === "lookUp";
          const after = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.01, value: afterMissing ? "" : promo.rateAfter.value });
          const afterBadge = badgeSlot(() => (afterMissing ? undefined : promo.rateAfter), (v) => { promo.rateAfter = v; });
          after.addEventListener("input", () => {
            if (after.value === "") return;
            const v = Number(after.value);
            if (v >= 0 && v <= 100) {
              promo.rateAfter = userValue(v, asOf());
              ctx.save();
            }
          });
          after.addEventListener("change", () => schedule());
          fields.push(field("Rate after the promo (% a year)", after, afterBadge.node));
          if (afterMissing) flags.push(gentleFlag("Enter the rate this debt charges once the promo ends. Until then the plan treats it as 0%."));
          else if (promo.rateAfter.source === "preset") flags.push(gentleFlag("The rate after the promo is a typical rate for this kind of debt. Enter the one in your agreement."));
        } else {
          flags.push(gentleFlag("A 0% rate usually ends. If this is a promo, choose \"Ends after a month\" and enter the rate that follows."));
        }
      }

      const estimated = a.minimumPaymentAnnual.source === "preset";
      const minBadge = badgeSlot(() => (a.minimumPaymentAnnual.value > 0 ? a.minimumPaymentAnnual : undefined), (v) => { a.minimumPaymentAnnual = v; });
      fields.push(money({
        label: "Minimum payment",
        annual: a.minimumPaymentAnnual.value || null,
        cadences: ["month", "year"],
        initialCadence: "month",
        badge: minBadge.node,
        rough: () => isRough(a.minimumPaymentAnnual.confidence),
        note: () => (a.minimumPaymentAnnual.source === "preset" ? "(estimate)" : ""),
        onChange: (annual) => {
          if (annual === null) return;
          const sameAsMin = a.actualPaymentAnnual.source === "preset" || a.actualPaymentAnnual.value === a.minimumPaymentAnnual.value;
          a.minimumPaymentAnnual = userValue(annual, asOf());
          if (sameAsMin) a.actualPaymentAnnual = userValue(annual, asOf());
          ctx.save();
          minBadge.refresh();
        },
      }));
      const actBadge = badgeSlot(() => (a.actualPaymentAnnual.value > 0 ? a.actualPaymentAnnual : undefined), (v) => { a.actualPaymentAnnual = v; });
      fields.push(money({
        label: "What you actually pay",
        annual: a.actualPaymentAnnual.value || null,
        cadences: ["month", "year"],
        initialCadence: "month",
        badge: actBadge.node,
        rough: () => isRough(a.actualPaymentAnnual.confidence),
        note: () => (a.actualPaymentAnnual.source === "preset" ? "(estimate)" : ""),
        onChange: (annual) => {
          if (annual === null) return;
          a.actualPaymentAnnual = userValue(annual, asOf());
          ctx.save();
          actBadge.refresh();
        },
      }));
      if (estimated) {
        flags.push(gentleFlag(
          (a.balance.value ?? 0) > 0
            ? "The payment shown is an estimate: each month's interest plus 1% of the balance. Enter the minimum payment from your statement."
            : "Enter the balance, then the minimum payment from your statement. Until then the payment is an estimate, never zero.",
        ));
      }
    }

    return editorShell(a.id, a.name?.value ?? preset.label, fields, flags, () => {
      const acc = h().accounts;
      if (acc.kind !== "rows") return;
      const rows = acc.rows.filter((r) => r.id !== a.id);
      h().accounts = rows.length ? { kind: "rows", rows } : { kind: "unanswered" };
      ctx.save();
    });
  }

  // ---- Sharpeners ------------------------------------------------------------
  function sharpeners(): HTMLElement {
    fieldScope = "sharpen";
    const hsa = select([{ value: "no", label: "No" }, { value: "yes", label: "Yes, I have a high-deductible health plan" }], h().self.hsaEligible.value ? "yes" : "no", (v) => { h().self.hsaEligible = userValue(v === "yes", asOf()); ctx.save(); });
    const strategy = select(STRATEGIES, h().savingsStrategy.value, (v: SavingsStrategy) => { h().savingsStrategy = userValue(v, asOf()); ctx.save(); });
    const sets = select(listAssumptionSets().map((s) => ({ value: s.key, label: s.label })), h().assumptions.set, (v) => { h().assumptions.set = v; ctx.save(); });
    const bounds = planToAgeBounds();
    const planTo = el("input", { class: "input", type: "number", min: bounds.min, max: bounds.max, step: 1, value: h().assumptions.overrides.planToAge?.value ?? bounds.default });
    const planToBadge = badgeSlot(() => resolveAssumptions(h().assumptions).planToAge, () => undefined, false);
    planTo.addEventListener("input", () => {
      const v = Number(planTo.value);
      if (v >= bounds.min && v <= bounds.max) h().assumptions.overrides.planToAge = userValue(v, asOf());
      ctx.save();
      planToBadge.refresh();
    });
    const birth = h().self.birthDate;
    const birthYear = birth ? parseYearMonth(birth.value).year : undefined;
    const fra = birthYear !== undefined ? loadSocialSecurityParams().normalRetirementAge(birthYear).years : 67;
    const claimOptions = [{ value: "default", label: `Full retirement age (${fra})` }, ...[62, 63, 64, 65, 66, 67, 68, 69, 70].map((a) => ({ value: String(a), label: `Age ${a}` }))];
    const claiming = h().self.socialSecurity.claimingAge;
    const claim = select(claimOptions, claiming ? String(claiming.value.years) : "default", (v) => {
      if (v === "default") delete h().self.socialSecurity.claimingAge;
      else h().self.socialSecurity.claimingAge = userValue({ years: Number(v), months: 0 }, asOf());
      ctx.save();
    });
    const zero = select(
      [{ value: "no", label: "Count Social Security (the default)" }, { value: "yes", label: "Plan as if it pays nothing" }],
      h().self.socialSecurity.claimZero?.value === true ? "yes" : "no",
      (v) => {
        if (v === "yes") h().self.socialSecurity.claimZero = userValue(true, asOf());
        else delete h().self.socialSecurity.claimZero;
        ctx.save();
      },
    );

    return el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h2", {}, "Sharpen it (optional)")),
      el(
        "div",
        { class: "field-grid card__details-body" },
        field("HSA eligible", hsa),
        field("Savings strategy", strategy),
        field("Assumption set", sets),
        field(`Plan-to age (${bounds.min} to ${bounds.max})`, planTo, planToBadge.node),
        field("Social Security claiming age", claim),
        field("Social Security in your plan", zero),
      ),
      el("p", { class: "notice" }, "Plan-to age. How long your plan needs to last. Running out at 88 is far worse than leaving some behind at 95, so this is set longer than average on purpose. You can change it."),
    );
  }

  // ---- Plan details (Level 4: the drawdown inputs, M2 spec section 7) ------------
  /** The one workplace plan the level-two questions describe (dictionary 9.2). Created on the first answer. */
  const workplacePlan = (): WorkplacePlan => {
    const existing = h().plans?.[0];
    if (existing) return existing;
    const incomeAnswer = h().self.income;
    const employer = incomeAnswer.kind === "rows" ? incomeAnswer.rows.find((r) => r.type === "salary" || r.type === "hourly") : undefined;
    const plan: WorkplacePlan = {
      id: rowId("plan"),
      employerIncomeId: employer?.id ?? "",
      planType: "401k",
      ruleOf55Allowed: userValue("unknown" as YesNoUnknown, asOf()),
      megaBackdoorAllowed: userValue("unknown" as YesNoUnknown, asOf()),
      rothOffered: userValue(true, asOf()),
    };
    h().plans = [plan];
    return plan;
  };
  const drawdown = () => (h().drawdown ??= {});

  function planDetails(): HTMLElement {
    fieldScope = "plan";
    const items = drawdownUnlockItems(h());
    const accountsAnswer = h().accounts;
    const accounts: Account[] = accountsAnswer.kind === "rows" ? accountsAnswer.rows : [];
    const incomeRows: IncomeStream[] = h().self.income.kind === "rows" ? (h().self.income as { kind: "rows"; rows: IncomeStream[] }).rows : [];
    const fields: HTMLElement[] = [];
    const yesNo: { value: YesNoUnknown; label: string }[] = [{ value: "unknown", label: "Not sure yet" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }];

    for (const a of accounts) {
      if (a.side !== "asset") continue;
      const name = a.name?.value ?? getAccountPreset(a.preset).label;
      if (a.taxBucket.value === "taxable") {
        const badge = badgeSlot(() => a.costBasis, (v) => { a.costBasis = v; });
        fields.push(field(`Cost basis of ${name}`, money({ label: `Cost basis of ${name}`, annual: a.costBasis?.value ?? null, cadences: ["year"], onChange: (v) => { if (v === null) delete a.costBasis; else a.costBasis = userValue(v, asOf(), a.costBasis?.confidence === "known" ? "known" : "roughly"); ctx.save(); badge.refresh(); }, placeholder: "What you paid in" }), badge.node, el("p", { class: "field__help" }, "What you put in, as against what it is worth now. On your brokerage statement, often as \"cost basis\". Blank means 70% of the balance, roughly.")));
      }
      if (a.taxBucket.value === "roth") {
        const badge = badgeSlot(() => a.rothBasis, (v) => { a.rothBasis = v; });
        fields.push(field(`Contributions so far to ${name}`, money({ label: `Contributions so far to ${name}`, annual: a.rothBasis?.value ?? null, cadences: ["year"], onChange: (v) => { if (v === null) delete a.rothBasis; else a.rothBasis = userValue(v, asOf(), a.rothBasis?.confidence === "known" ? "known" : "roughly"); ctx.save(); badge.refresh(); }, placeholder: "Total put in" }), badge.node, el("p", { class: "field__help" }, "Regular contributions come out first, tax and penalty free. Blank means half the balance, roughly.")));
      }
      if (a.taxBucket.value === "hsa") {
        const badge = badgeSlot(() => a.savedReceipts, (v) => { a.savedReceipts = v; });
        fields.push(field(`Saved medical receipts for ${name}`, money({ label: `Saved medical receipts for ${name}`, annual: a.savedReceipts?.value ?? null, cadences: ["year"], onChange: (v) => { if (v === null) delete a.savedReceipts; else a.savedReceipts = userValue(v, asOf()); ctx.save(); badge.refresh(); }, placeholder: "0" }), badge.node, el("p", { class: "field__help" }, "Medical costs you paid out of pocket and kept the receipts for. They can be reimbursed from the HSA later, tax free.")));
      }
    }

    const hasRoth = accounts.some((a) => a.side === "asset" && a.taxBucket.value === "roth");
    if (hasRoth) {
      const thisYear = parseYearMonth(asOf().slice(0, 7)).year;
      const years = [{ value: "", label: "Not sure (five years ago)" }, ...Array.from({ length: 40 }, (_, i) => thisYear - i).map((y) => ({ value: String(y), label: String(y) }))];
      fields.push(field("Year of your first Roth contribution", select(years, drawdown().firstRothYear ? String(drawdown().firstRothYear!.value) : "", (v) => { if (v === "") delete drawdown().firstRothYear; else drawdown().firstRothYear = userValue(Number(v), asOf()); ctx.save(); })));
    }

    const hasWorkplace = accounts.some((a) => a.side === "asset" && (a.preset === "trad401k" || a.preset === "roth401k")) || incomeRows.some((s) => s.preTaxDeductions?.some(isWorkplaceContribution));
    if (hasWorkplace) {
      const plan = h().plans?.[0];
      fields.push(field("Does your workplace plan allow the rule of 55?", select(yesNo, plan?.ruleOf55Allowed.value ?? "unknown", (v) => { workplacePlan().ruleOf55Allowed = userValue(v, asOf()); ctx.save(); }), null, el("p", { class: "field__help" }, "Leaving an employer in or after the year you turn 55 can allow penalty-free withdrawals from that employer's plan. Your plan's summary says whether it allows them.")));
      fields.push(field("Is it a governmental 457(b)?", select([{ value: "401k", label: "No, a 401(k) or 403(b)" }, { value: "457bGovernmental", label: "Yes, a governmental 457(b)" }], plan?.planType === "457bGovernmental" ? "457bGovernmental" : "401k", (v) => { workplacePlan().planType = v === "457bGovernmental" ? "457bGovernmental" : "401k"; ctx.save(); })));
      fields.push(field("Does it allow after-tax contributions you can convert (mega backdoor)?", select(yesNo, plan?.megaBackdoorAllowed.value ?? "unknown", (v) => { workplacePlan().megaBackdoorAllowed = userValue(v, asOf()); ctx.save(); })));
      const sep = el("input", { class: "input", type: "number", min: 18, max: 80, step: 1, value: plan?.separationAge?.value ?? "", placeholder: "At retirement" });
      sep.addEventListener("input", () => { const v = Number(sep.value); const pl = workplacePlan(); if (sep.value === "" || !(v >= 18 && v <= 80)) delete pl.separationAge; else pl.separationAge = userValue(v, asOf()); ctx.save(); });
      fields.push(field("Age you expect to leave this employer", sep, null, el("p", { class: "field__help" }, "Blank means when you stop working.")));
    }

    const heir = el("input", { class: "input", type: "number", min: 0, max: 60, step: 1, value: drawdown().heirTaxRatePercent?.value ?? "", placeholder: "22" });
    const heirBadge = badgeSlot(() => drawdown().heirTaxRatePercent, (v) => { drawdown().heirTaxRatePercent = v; });
    heir.addEventListener("input", () => { const v = Number(heir.value); if (heir.value === "" || !(v >= 0 && v <= 60)) delete drawdown().heirTaxRatePercent; else drawdown().heirTaxRatePercent = userValue(v, asOf(), "roughly"); ctx.save(); heirBadge.refresh(); });
    fields.push(field("Expected heir tax rate (percent)", heir, heirBadge.node, el("p", { class: "field__help" }, "Pretax money left behind is taxed at your heirs' rate, usually within ten years. Blank means 22%, roughly.")));

    const size = el("input", { class: "input", type: "number", min: 1, max: 12, step: 1, value: drawdown().acaHouseholdSize?.value ?? "", placeholder: "1" });
    const sizeBadge = badgeSlot(() => drawdown().acaHouseholdSize, (v) => { drawdown().acaHouseholdSize = v; });
    size.addEventListener("input", () => { const v = Number(size.value); if (size.value === "" || !(v >= 1 && v <= 12)) delete drawdown().acaHouseholdSize; else drawdown().acaHouseholdSize = userValue(v, asOf()); ctx.save(); sizeBadge.refresh(); });
    fields.push(field("People on your health plan", size, sizeBadge.node, el("p", { class: "field__help" }, "Sets the poverty line the marketplace credit is measured against. Blank means 1.")));

    const medicaid = drawdown().medicaidExpansionState;
    fields.push(field("Is your state a Medicaid expansion state?", select([{ value: "unknown", label: "Not sure yet" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }], medicaid ? (medicaid.value ? "yes" : "no") : "unknown", (v) => { if (v === "unknown") delete drawdown().medicaidExpansionState; else drawdown().medicaidExpansionState = userValue(v === "yes", asOf(), "roughly"); ctx.save(); }), null, el("p", { class: "field__help" }, "In an expansion state, income under 138% of the poverty line means Medicaid instead of a marketplace credit. Most states have expanded; HealthCare.gov lists them.")));

    const left = items.length;
    return el(
      "details",
      { class: "card", id: "plan-details" },
      el("summary", { class: "card__summary" }, el("h2", {}, left ? `Plan details (${left} to go for your True FI number)` : "Plan details")),
      el("p", { class: "muted card__details-body" }, "How your money comes out matters as much as how it goes in. These unlock the True FI number on the result screen. Roughly is fine; not having an account type counts as done."),
      el("div", { class: "field-grid card__details-body" }, ...fields),
    );
  }

  // ---- Examples --------------------------------------------------------------
  let pendingExample: ExampleHouseholdFile | null = null;

  function examples(): HTMLElement {
    const files = [maya, jordan, dev] as ExampleHouseholdFile[];
    const pending = pendingExample;
    return el(
      "section",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, "Or start from an example")),
      el("p", { class: "muted" }, "These are the checked example households from the tests. Loading one replaces what you have entered."),
      el("div", { class: "row-actions" }, ...files.map((f) => el("button", { type: "button", class: "button button--quiet", onClick: () => { pendingExample = f; schedule(); } }, f.label))),
      pending
        ? confirmPanel({
            sentence: `This replaces everything you have entered with ${pending.label}.`,
            confirmLabel: "Replace my numbers",
            cancelLabel: "Keep what I have",
            onConfirm: () => { pendingExample = null; ctx.replace(householdFromExample(pending, asOf())); },
            onCancel: () => { pendingExample = null; schedule(); },
          })
        : null,
    );
  }

  // ---- Footer ----------------------------------------------------------------
  function footer(): HTMLElement {
    const missing = missingLevelOneAnswers(h());
    const needRate = debtsNeedingRate(h());
    const wrap = el("div", { class: "stack" });
    if (missing.length) {
      wrap.append(gentleFlag(`Still needed before a first FI date: ${missing.map((m) => MISSING_LABEL[m]).join(", ")}.`));
    }
    if (needRate.length) {
      wrap.append(gentleFlag(`Still needed: the interest rate on ${needRate.map((d) => d.label).join(", ")}.`));
    }
    const blocked = missing.length > 0 || needRate.length > 0;
    wrap.append(el("div", { class: "row-actions" }, el("button", { type: "button", class: "button", disabled: blocked, onClick: ctx.goToResult }, "See my FI date")));
    wrap.append(el("p", { class: "notice" }, "Amounts are in today's dollars."));
    return wrap;
  }

  // A number field under the pointer must not change when the person scrolls the page.
  root.addEventListener("wheel", () => {
    const a = document.activeElement;
    if (a instanceof HTMLInputElement && a.type === "number") a.blur();
  }, { passive: true });

  render();
  return root;
}
