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
  amountFromPercentOfPay,
  assetFromPreset,
  debtFromPreset,
  debtsNeedingRate,
  estimatedMinimumPaymentAnnual,
  getAccountPreset,
  householdFromExample,
  isWorkplaceContribution,
  listAssumptionSets,
  loadQuickAllocations,
  loadSocialSecurityParams,
  loadSpendingCategories,
  missingLevelOneAnswers,
  notForMe,
  parseYearMonth,
  planToAgeBounds,
  resolveAssumptions,
  userValue,
  type Account,
  type AccountPresetKey,
  type AnnualDeduction,
  type Confidence,
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
} from "../../engine";
import { confirmPanel } from "../components/confirm-panel";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge, type EditableKind } from "../components/kind-badge";
import { moneyInput } from "../components/money-input";
import { presetPicker } from "../components/preset-picker";
import { clear, el, uid } from "../dom";
import { dollars, parseMoney, percent } from "../format";
import type { Store } from "../store";
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

/** A label, an optional kind badge beside it, and a control underneath. */
function field(text: string, control: HTMLElement, badge?: HTMLElement | null, help?: HTMLElement | null): HTMLElement {
  const id = uid("f");
  control.id = id;
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
                  render();
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

  function render(): void {
    clear(root);
    root.append(
      el("h1", { class: "screen-title" }, "Your numbers"),
      el("p", { class: "lede" }, "Five answers give you a first FI date. Everything else sharpens it. Every question has an \"I don't\" answer."),
      aboutYou(),
      income(),
      spending(),
      accounts(),
      sharpeners(),
      examples(),
      transferCard({ household: () => ctx.household, store: ctx.store, replace: ctx.replace }),
      footer(),
    );
  }

  // ---- About you -----------------------------------------------------------
  function aboutYou(): HTMLElement {
    const birth = el("input", { class: "input", type: "month", value: h().self.birthDate?.value ?? "", max: asOf().slice(0, 7) });
    const birthBadge = badgeSlot(() => h().self.birthDate, () => undefined, false);
    birth.addEventListener("change", () => {
      if (birth.value) h().self.birthDate = userValue(birth.value, asOf());
      else delete h().self.birthDate;
      ctx.save();
      birthBadge.refresh();
    });
    const state = select(
      STATE_CODES.map((s) => ({ value: s, label: s })),
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
      render();
    });
    return el(
      "section",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, "About you")),
      el(
        "div",
        { class: "field-grid" },
        field("Birth month", birth, birthBadge.node),
        field("State", state),
        field("Filing status", filing, kindBadge(h().self.filingStatus.confidence)),
      ),
    );
  }

  // ---- Income ----------------------------------------------------------------
  function income(): HTMLElement {
    const answer = h().self.income;
    const body = el("div", { class: "stack" });

    if (answer.kind === "none") {
      body.append(el("p", { class: "empty-state" }, "No income right now. That counts as answered."));
    } else if (answer.kind === "unanswered" || answer.rows.length === 0) {
      body.append(el("p", { class: "empty-state" }, "No income yet. Add your first stream."));
    } else {
      for (const s of answer.rows) body.append(streamEditor(s));
    }

    const addType = select(INCOME_TYPES.map((t) => ({ value: t.type, label: t.label })), undefined, (type: IncomeType) => {
      const inc = h().self.income;
      const rows = inc.kind === "rows" ? inc.rows : [];
      const stream: IncomeStream = {
        id: uid("income"),
        type,
        grossAnnual: userValue(0, asOf(), type === "salary" ? "known" : "roughly"),
        end: { kind: "retirement" },
      };
      if (type === "salary" || type === "hourly") stream.payFrequency = { ...userValue("biweekly" as const, asOf()), confidence: "roughly" };
      h().self.income = { kind: "rows", rows: [...rows, stream] };
      ctx.save();
      render();
    }, "Add income");
    addType.setAttribute("aria-label", "Add income");

    const none = el("button", { type: "button", class: "button button--quiet", onClick: () => { h().self.income = { kind: "none", asOf: asOf() }; ctx.save(); render(); } }, "I don't have income right now");

    return el(
      "section",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, "Income")),
      body,
      el("div", { class: "row-actions" }, addType, answer.kind !== "none" ? none : null),
    );
  }

  function streamEditor(s: IncomeStream): HTMLElement {
    const typeLabel = INCOME_TYPES.find((t) => t.type === s.type)?.label ?? s.type;
    const isWage = s.type === "salary" || s.type === "hourly";
    const isSe = s.type === "selfEmployed" || s.type === "sideGig";
    const cadences = s.type === "hourly" ? (["hour", "paycheck", "month", "year"] as const) : isWage ? (["paycheck", "month", "year"] as const) : (["month", "year"] as const);

    const grossBadge = badgeSlot(() => (s.grossAnnual.value > 0 ? s.grossAnnual : undefined), (v) => { s.grossAnnual = v; });
    const fields: HTMLElement[] = [
      moneyInput({
        label: "Gross pay",
        annual: s.grossAnnual.value || null,
        cadences,
        initialCadence: "year",
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
    ];

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
      fields.push(moneyInput({
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
      fields.push(field("Employer match, percent matched", matchPct, pctBadge.node));
      fields.push(field("Match cap, percent of pay", matchCap, capBadge.node));

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
      fields.push(field("Your 401(k) or 403(b) contribution, percent of pay", percentInput, percentBadge.node, percentHelp));
      fields.push(field("Contribution type", accountType));

      const hsa = () => s.preTaxDeductions?.find((d): d is AnnualDeduction => d.type === "hsa");
      const hsaBadge = badgeSlot(() => hsa()?.annual, (v) => { const x = hsa(); if (x) x.annual = v; });
      fields.push(
        moneyInput({
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

    const endSelect = select(
      [{ value: "retirement", label: "Until I retire" }, { value: "age", label: "Until an age" }],
      s.end.kind === "age" ? "age" : "retirement",
      (v) => {
        s.end = v === "age" ? { kind: "age", age: 30 } : { kind: "retirement" };
        ctx.save();
        render();
      },
    );
    fields.push(field("This income lasts", endSelect));
    if (s.end.kind === "age") {
      const endAge = el("input", { class: "input", type: "number", min: 16, max: 100, step: 1, value: s.end.age });
      endAge.addEventListener("input", () => { const v = Number(endAge.value); if (v >= 16 && v <= 100) { s.end = { kind: "age", age: v }; ctx.save(); } });
      fields.push(field("Ends at age", endAge, kindBadge("known")));
    }

    const remove = el("button", { type: "button", class: "button button--quiet", onClick: () => {
      const inc = h().self.income;
      if (inc.kind !== "rows") return;
      const rows = inc.rows.filter((r) => r.id !== s.id);
      h().self.income = rows.length ? { kind: "rows", rows } : { kind: "unanswered" };
      ctx.save();
      render();
    } }, "Remove");

    return el(
      "div",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, typeLabel), el("div", { class: "row-actions" }, remove)),
      el("div", { class: "field-grid" }, ...fields),
    );
  }

  // ---- Spending --------------------------------------------------------------
  let spendingMode: "total" | "categories" = (() => {
    const a = h().spending;
    if (a.kind === "rows" && a.rows.some((r) => r.category !== "everythingElse")) return "categories";
    return "total";
  })();

  function spending(): HTMLElement {
    const currentRows = (): SpendingRow[] => {
      const sp = h().spending;
      return sp.kind === "rows" ? sp.rows : [];
    };
    const body = el("div", { class: "stack" });

    const modeRow = el(
      "div",
      { class: "choice-row", role: "radiogroup", "aria-label": "How to enter spending" },
      ...(["total", "categories"] as const).map((mode) => {
        const input = el("input", { type: "radio", name: "spending-mode", value: mode, checked: spendingMode === mode });
        input.addEventListener("change", () => { spendingMode = mode; render(); });
        return el("label", {}, input, el("span", {}, mode === "total" ? "One total" : "By category"));
      }),
    );
    body.append(modeRow);

    const setRows = (next: SpendingRow[]) => {
      h().spending = next.length ? { kind: "rows", rows: next } : { kind: "unanswered" };
      ctx.save();
    };

    const rowInput = (label: string, find: () => SpendingRow | undefined, make: (annual: number) => SpendingRow, keep: (r: SpendingRow) => boolean): HTMLElement => {
      const badge = badgeSlot(() => find()?.annual, (v) => { const r = find(); if (r) r.annual = v; });
      return moneyInput({
        label,
        annual: find()?.annual.value ?? null,
        cadences: ["month", "year"],
        initialCadence: "month",
        badge: badge.node,
        rough: () => isRough(find()?.annual.confidence),
        onChange: (annual) => {
          const others = currentRows().filter(keep);
          if (annual !== null && annual > 0) others.push(make(annual));
          setRows(others);
          badge.refresh();
        },
      });
    };

    if (spendingMode === "total") {
      body.append(
        rowInput(
          "Everything you spend (not saving, not debt payments)",
          () => currentRows().find((r) => r.id === "total"),
          (annual) => ({ id: "total", category: "everythingElse", annual: userValue(annual, asOf(), "roughly") }),
          (r) => r.id !== "total",
        ),
        el("p", { class: "muted" }, "Spending means consumption only. Debt payments and saving are counted elsewhere, so they are not double counted."),
      );
    } else {
      const grid = el("div", { class: "field-grid" });
      for (const c of loadSpendingCategories()) {
        grid.append(
          rowInput(
            c.label,
            () => currentRows().find((r) => r.category === c.id && r.id !== "total"),
            (annual) => ({ id: `cat-${c.id}`, category: c.id, annual: userValue(annual, asOf(), "roughly") }),
            (r) => !(r.category === c.id && r.id !== "total") && r.id !== "total",
          ),
        );
      }
      body.append(grid);
    }

    return el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Spending")), body);
  }

  // ---- Accounts --------------------------------------------------------------
  let pickerOpen = false;

  function accounts(): HTMLElement {
    const answer = h().accounts;
    const body = el("div", { class: "stack" });
    if (answer.kind === "none") body.append(el("p", { class: "empty-state" }, "No accounts. That counts as answered."));
    else if (answer.kind === "unanswered" || answer.rows.length === 0) body.append(el("p", { class: "empty-state" }, "No accounts yet. Add your first one."));
    else for (const a of answer.rows) body.append(accountEditor(a));

    const actions = el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button", onClick: () => { pickerOpen = !pickerOpen; render(); } }, pickerOpen ? "Close the list" : "Add account"),
      answer.kind !== "none" ? el("button", { type: "button", class: "button button--quiet", onClick: () => { h().accounts = { kind: "none", asOf: asOf() }; ctx.save(); render(); } }, "I don't have any accounts") : null,
    );

    const picker = pickerOpen
      ? presetPicker((key: AccountPresetKey) => {
          const acc = h().accounts;
          const rows = acc.kind === "rows" ? acc.rows : [];
          const preset = getAccountPreset(key);
          const id = uid("acct");
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
          pickerOpen = false;
          ctx.save();
          render();
        })
      : null;

    return el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Accounts and debts")), body, actions, picker);
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
    const preset = getAccountPreset(a.preset);
    const balanceInput = el("input", { class: "input input--money", type: "text", inputmode: "decimal", value: a.balance.value ? String(a.balance.value) : "" });
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
    if (a.side === "debt") balanceInput.addEventListener("change", () => { if (a.minimumPaymentAnnual.source === "preset") render(); });

    const fields: HTMLElement[] = [field(a.side === "asset" ? "Balance" : "Balance owed", balanceInput, balanceBadge.node)];
    const flags: HTMLElement[] = [];

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
        if (v !== "preset") { a.allocation = userValue(quick[v], asOf()); ctx.save(); render(); }
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
          refreshEstimate(a);
          ctx.save();
        }
      });
      rate.addEventListener("change", () => render());
      fields.push(field("Interest rate, percent per year", rate, rateBadge.node));
      if (needsRate) flags.push(gentleFlag("This debt needs its interest rate before a plan can run. It is on your statement or in your lender's app."));

      const estimated = a.minimumPaymentAnnual.source === "preset";
      const minBadge = badgeSlot(() => (a.minimumPaymentAnnual.value > 0 ? a.minimumPaymentAnnual : undefined), (v) => { a.minimumPaymentAnnual = v; });
      fields.push(moneyInput({
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
      fields.push(moneyInput({
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

    const remove = el("button", { type: "button", class: "button button--quiet", onClick: () => {
      const acc = h().accounts;
      if (acc.kind !== "rows") return;
      const rows = acc.rows.filter((r) => r.id !== a.id);
      h().accounts = rows.length ? { kind: "rows", rows } : { kind: "unanswered" };
      ctx.save();
      render();
    } }, "Remove");

    return el(
      "div",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, a.name?.value ?? preset.label), el("div", { class: "row-actions" }, remove)),
      el("div", { class: "field-grid" }, ...fields),
      flags.length ? el("div", { class: "stack card__flags" }, ...flags) : null,
    );
  }

  // ---- Sharpeners ------------------------------------------------------------
  function sharpeners(): HTMLElement {
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
      el("div", { class: "row-actions" }, ...files.map((f) => el("button", { type: "button", class: "button button--quiet", onClick: () => { pendingExample = f; render(); } }, f.label))),
      pending
        ? confirmPanel({
            sentence: `This replaces everything you have entered with ${pending.label}.`,
            confirmLabel: "Replace my numbers",
            cancelLabel: "Keep what I have",
            onConfirm: () => { pendingExample = null; ctx.replace(householdFromExample(pending, asOf())); },
            onCancel: () => { pendingExample = null; render(); },
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

  render();
  return root;
}
