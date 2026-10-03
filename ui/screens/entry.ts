/**
 * The entry screen: the level-one checklist (data dictionary section 7), with
 * "I don't" answers, roughly values, and presets. It writes stored parts only.
 * Nothing here calculates: normalization goes through the engine.
 */

import dev from "../../tests/households/dev.json";
import jordan from "../../tests/households/jordan.json";
import maya from "../../tests/households/maya.json";
import {
  STATE_CODES,
  annualFromMonthly,
  assetFromPreset,
  debtFromPreset,
  getAccountPreset,
  householdFromExample,
  listAssumptionSets,
  loadQuickAllocations,
  loadSocialSecurityParams,
  loadSpendingCategories,
  missingLevelOneAnswers,
  notForMe,
  parseYearMonth,
  planToAgeBounds,
  userValue,
  type Account,
  type AccountPresetKey,
  type Confidence,
  type ExampleHouseholdFile,
  type FilingStatus,
  type Household,
  type IncomeStream,
  type IncomeType,
  type PayFrequency,
  type SavingsStrategy,
  type SpendingRow,
  type StateCode,
} from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
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

function labelFor(key: string, text: string, control: HTMLElement): HTMLElement {
  control.id = key;
  return el("div", { class: "field" }, el("label", { for: key }, text), control);
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
    birth.addEventListener("change", () => {
      if (birth.value) h().self.birthDate = userValue(birth.value, asOf());
      else delete h().self.birthDate;
      ctx.save();
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
        labelFor(uid("birth"), "Birth month", birth),
        labelFor(uid("state"), "State", state),
        labelFor(uid("filing"), "Filing status", filing),
        el("div", { class: "field" }, el("label", {}, "Filing status kind"), kindBadge(h().self.filingStatus.confidence)),
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

    const none = el("button", { type: "button", class: "button button--quiet", onClick: () => { h().self.income = { kind: "none", asOf: asOf() }; ctx.save(); render(); } }, "I don't have income right now");

    return el(
      "section",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, "Income")),
      body,
      el("div", { class: "row-actions" }, el("div", { class: "field" }, el("label", { class: "visually-hidden" }, "Add income"), addType), answer.kind !== "none" ? none : null),
    );
  }

  function streamEditor(s: IncomeStream): HTMLElement {
    const typeLabel = INCOME_TYPES.find((t) => t.type === s.type)?.label ?? s.type;
    const isWage = s.type === "salary" || s.type === "hourly";
    const isSe = s.type === "selfEmployed" || s.type === "sideGig";
    const cadences = s.type === "hourly" ? (["hour", "paycheck", "month", "year"] as const) : isWage ? (["paycheck", "month", "year"] as const) : (["month", "year"] as const);

    const gross = moneyInput({
      label: "Gross pay",
      annual: s.grossAnnual.value || null,
      cadences,
      initialCadence: "year",
      payFrequency: () => s.payFrequency?.value ?? "biweekly",
      hoursPerWeek: () => s.hoursPerWeek?.value ?? null,
      onChange: (annual) => {
        s.grossAnnual = { ...s.grossAnnual, value: annual ?? 0 };
        ctx.save();
      },
    });

    const kind = kindBadge(s.grossAnnual.confidence, {
      cycle: ["known", "roughly", "lookUp"],
      onChange: (next: Confidence) => {
        s.grossAnnual = { ...s.grossAnnual, confidence: next as "known" | "roughly" | "lookUp" };
        ctx.save();
        render();
      },
    });

    const fields: HTMLElement[] = [gross];

    if (isWage) {
      fields.push(labelFor(uid("freq"), "Pay frequency", select(PAY_FREQUENCIES, s.payFrequency?.value ?? "biweekly", (v: PayFrequency) => { s.payFrequency = userValue(v, asOf()); ctx.save(); })));
    }
    if (s.type === "hourly") {
      const hours = el("input", { class: "input", type: "number", min: 1, max: 80, step: 1, value: s.hoursPerWeek?.value ?? "" });
      hours.addEventListener("input", () => {
        const v = Number(hours.value);
        if (v >= 1 && v <= 80) s.hoursPerWeek = userValue(v, asOf());
        else delete s.hoursPerWeek;
        ctx.save();
      });
      fields.push(labelFor(uid("hours"), "Hours per week", hours));
    }
    if (isSe) {
      fields.push(moneyInput({ label: "Business expenses", annual: s.businessExpensesAnnual?.value ?? null, cadences: ["month", "year"], initialCadence: "year", onChange: (annual) => { if (annual === null) delete s.businessExpensesAnnual; else s.businessExpensesAnnual = userValue(annual, asOf(), "roughly"); ctx.save(); } }));
    }
    if (isWage) {
      const matchPct = el("input", { class: "input", type: "number", min: 0, max: 200, step: 1, value: s.employerMatch?.matchPercent.value ?? "" });
      const matchCap = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.5, value: s.employerMatch?.capPercentOfPay.value ?? "" });
      const updateMatch = () => {
        const p = Number(matchPct.value);
        const c = Number(matchCap.value);
        if (matchPct.value !== "" && matchCap.value !== "" && p >= 0 && c >= 0) s.employerMatch = { matchPercent: userValue(p, asOf()), capPercentOfPay: userValue(c, asOf()) };
        else delete s.employerMatch;
        ctx.save();
      };
      matchPct.addEventListener("input", updateMatch);
      matchCap.addEventListener("input", updateMatch);
      fields.push(labelFor(uid("mpct"), "Employer match, percent matched", matchPct));
      fields.push(labelFor(uid("mcap"), "Match cap, percent of pay", matchCap));

      const ded = (type: "401k" | "hsa", label: string) => {
        const existing = s.preTaxDeductions?.find((d) => d.type === type);
        return moneyInput({
          label,
          annual: existing?.annual.value ?? null,
          cadences: ["paycheck", "month", "year"],
          initialCadence: "year",
          payFrequency: () => s.payFrequency?.value ?? "biweekly",
          onChange: (annual) => {
            const list = (s.preTaxDeductions ?? []).filter((d) => d.type !== type);
            if (annual !== null && annual > 0) list.push({ id: `${s.id}-${type}`, type, annual: userValue(annual, asOf()) });
            if (list.length) s.preTaxDeductions = list;
            else delete s.preTaxDeductions;
            ctx.save();
          },
        });
      };
      fields.push(ded("401k", "Your 401(k) or 403(b) contribution"));
      fields.push(ded("hsa", "Your HSA contribution"));
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
    fields.push(labelFor(uid("end"), "This income lasts", endSelect));
    if (s.end.kind === "age") {
      const endAge = el("input", { class: "input", type: "number", min: 16, max: 100, step: 1, value: s.end.age });
      endAge.addEventListener("input", () => { const v = Number(endAge.value); if (v >= 16 && v <= 100) { s.end = { kind: "age", age: v }; ctx.save(); } });
      fields.push(labelFor(uid("endage"), "Ends at age", endAge));
    }

    const remove = el("button", { type: "button", class: "button button--quiet button--small", onClick: () => {
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
      el("div", { class: "card__title" }, el("h2", {}, typeLabel), el("div", { class: "row-actions" }, kind, remove)),
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
    const answer = h().spending;
    const rows = answer.kind === "rows" ? answer.rows : [];
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

    if (spendingMode === "total") {
      const total = rows.find((r) => r.category === "everythingElse" && r.id === "total");
      body.append(
        moneyInput({
          label: "Everything you spend (not saving, not debt payments)",
          annual: total?.annual.value ?? null,
          cadences: ["month", "year"],
          initialCadence: "month",
          onChange: (annual) => {
            const others = rows.filter((r) => r.id !== "total");
            if (annual !== null && annual > 0) setRows([{ id: "total", category: "everythingElse", annual: userValue(annual, asOf(), "roughly") }, ...others]);
            else setRows(others);
          },
        }),
        el("p", { class: "muted" }, "Spending means consumption only. Debt payments and saving are counted elsewhere, so they are not double counted."),
      );
    } else {
      const grid = el("div", { class: "field-grid" });
      for (const c of loadSpendingCategories()) {
        const row = rows.find((r) => r.category === c.id && r.id !== "total");
        grid.append(
          moneyInput({
            label: c.label,
            annual: row?.annual.value ?? null,
            cadences: ["month", "year"],
            initialCadence: "month",
            onChange: (annual) => {
              const sp = h().spending;
              const current = sp.kind === "rows" ? sp.rows : [];
              const others = current.filter((r) => !(r.category === c.id && r.id !== "total") && r.id !== "total");
              if (annual !== null && annual > 0) others.push({ id: `cat-${c.id}`, category: c.id, annual: userValue(annual, asOf(), "roughly") });
              setRows(others);
            },
          }),
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
          const account: Account = preset.side === "asset"
            ? assetFromPreset(key, id, balance, asOf())
            : debtFromPreset(key, id, balance, { rate: userValue(preset.typicalRate ?? 0, asOf(), "roughly"), minimumPaymentAnnual: userValue(0, asOf(), "roughly") }, asOf());
          h().accounts = { kind: "rows", rows: [...rows, account] };
          pickerOpen = false;
          ctx.save();
          render();
        })
      : null;

    return el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Accounts and debts")), body, actions, picker);
  }

  function accountEditor(a: Account): HTMLElement {
    const preset = getAccountPreset(a.preset);
    const balanceInput = el("input", { class: "input input--money", type: "text", inputmode: "decimal", value: a.balance.value === null ? "" : String(a.balance.value) });
    balanceInput.addEventListener("input", () => {
      const v = parseMoney(balanceInput.value);
      const confidence = a.balance.confidence === "notForMe" ? "roughly" : a.balance.confidence;
      a.balance = v === null ? notForMe(asOf()) : { value: v, asOf: asOf(), source: "user", confidence };
      ctx.save();
    });
    const balanceKind = kindBadge(a.balance.confidence, {
      cycle: ["known", "roughly", "lookUp"],
      onChange: (next) => {
        if (a.balance.value !== null) a.balance = { ...a.balance, confidence: next as "known" | "roughly" | "lookUp" };
        ctx.save();
        render();
      },
    });

    const fields: HTMLElement[] = [labelFor(uid("bal"), a.side === "asset" ? "Balance" : "Balance owed", balanceInput)];

    if (a.side === "asset") {
      const quick = loadQuickAllocations();
      const options = [
        { value: "mostlyStocks", label: "Mostly stocks (90 / 10 / 0)" },
        { value: "balanced", label: "Balanced (60 / 40 / 0)" },
        { value: "mostlyCash", label: "Mostly cash (0 / 0 / 100)" },
        { value: "preset", label: `As preset (${a.allocation.value.stocks} / ${a.allocation.value.bonds} / ${a.allocation.value.cash})` },
      ] as const;
      const current = (Object.keys(quick) as (keyof typeof quick)[]).find((k) => JSON.stringify(quick[k]) === JSON.stringify(a.allocation.value)) ?? "preset";
      fields.push(labelFor(uid("alloc"), "Mix of stocks, bonds, cash", select([...options], current, (v) => {
        if (v !== "preset") { a.allocation = userValue(quick[v], asOf()); ctx.save(); }
      })));
      fields.push(el("div", { class: "field" }, el("label", {}, "Fees"), el("div", {}, percent(a.fees.value), " a year")));
    } else {
      const rate = el("input", { class: "input", type: "number", min: 0, max: 100, step: 0.01, value: a.rate.value });
      rate.addEventListener("input", () => { const v = Number(rate.value); if (v >= 0) { a.rate = userValue(v, asOf()); ctx.save(); } });
      fields.push(labelFor(uid("rate"), "Interest rate, percent per year", rate));
      fields.push(moneyInput({
        label: "Minimum payment",
        annual: a.minimumPaymentAnnual.value || null,
        cadences: ["month", "year"],
        initialCadence: "month",
        onChange: (annual) => {
          const v = annual ?? 0;
          const sameAsMin = a.actualPaymentAnnual.value === a.minimumPaymentAnnual.value;
          a.minimumPaymentAnnual = userValue(v, asOf());
          if (sameAsMin) a.actualPaymentAnnual = userValue(v, asOf());
          ctx.save();
        },
      }));
      fields.push(moneyInput({
        label: "What you actually pay",
        annual: a.actualPaymentAnnual.value || null,
        cadences: ["month", "year"],
        initialCadence: "month",
        onChange: (annual) => { a.actualPaymentAnnual = userValue(annual ?? a.minimumPaymentAnnual.value, asOf()); ctx.save(); },
      }));
    }

    const remove = el("button", { type: "button", class: "button button--quiet button--small", onClick: () => {
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
      el("div", { class: "card__title" }, el("h2", {}, a.name?.value ?? preset.label), el("div", { class: "row-actions" }, balanceKind, remove)),
      el("div", { class: "field-grid" }, ...fields),
    );
  }

  // ---- Sharpeners ------------------------------------------------------------
  function sharpeners(): HTMLElement {
    const hsa = select([{ value: "no", label: "No" }, { value: "yes", label: "Yes, I have a high-deductible health plan" }], h().self.hsaEligible.value ? "yes" : "no", (v) => { h().self.hsaEligible = userValue(v === "yes", asOf()); ctx.save(); });
    const strategy = select(STRATEGIES, h().savingsStrategy.value, (v: SavingsStrategy) => { h().savingsStrategy = userValue(v, asOf()); ctx.save(); });
    const sets = select(listAssumptionSets().map((s) => ({ value: s.key, label: s.label })), h().assumptions.set, (v) => { h().assumptions.set = v; ctx.save(); });
    const bounds = planToAgeBounds();
    const planTo = el("input", { class: "input", type: "number", min: bounds.min, max: bounds.max, step: 1, value: h().assumptions.overrides.planToAge?.value ?? bounds.default });
    planTo.addEventListener("input", () => {
      const v = Number(planTo.value);
      if (v >= bounds.min && v <= bounds.max) h().assumptions.overrides.planToAge = userValue(v, asOf());
      ctx.save();
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
    const zero = el("input", { type: "checkbox", checked: h().self.socialSecurity.claimZero?.value === true });
    zero.addEventListener("change", () => {
      if (zero.checked) h().self.socialSecurity.claimZero = userValue(true, asOf());
      else delete h().self.socialSecurity.claimZero;
      ctx.save();
    });

    return el(
      "details",
      { class: "card" },
      el("summary", {}, el("h2", { style: "display:inline" }, "Sharpen it (optional)")),
      el(
        "div",
        { class: "field-grid", style: "margin-top: var(--space-3)" },
        labelFor(uid("hsa"), "HSA eligible", hsa),
        labelFor(uid("strategy"), "Savings strategy", strategy),
        labelFor(uid("set"), "Assumption set", sets),
        labelFor(uid("planto"), `Plan-to age (${bounds.min} to ${bounds.max})`, planTo),
        labelFor(uid("claim"), "Social Security claiming age", claim),
        el("label", { class: "toggle" }, zero, el("span", {}, "Plan as if Social Security pays nothing (an explicit choice, not a band)")),
      ),
      el("p", { class: "notice" }, "Plan-to age. How long your plan needs to last. Running out at 88 is far worse than leaving some behind at 95, so this is set longer than average on purpose. You can change it."),
    );
  }

  // ---- Examples --------------------------------------------------------------
  function examples(): HTMLElement {
    const files = [maya, jordan, dev] as ExampleHouseholdFile[];
    return el(
      "section",
      { class: "card" },
      el("div", { class: "card__title" }, el("h2", {}, "Or start from an example")),
      el("p", { class: "muted" }, "These are the checked example households from the tests. Loading one replaces what you have entered."),
      el("div", { class: "row-actions" }, ...files.map((f) => el("button", { type: "button", class: "button button--quiet", onClick: () => {
        if (window.confirm(`Replace your numbers with ${f.label}?`)) ctx.replace(householdFromExample(f, asOf()));
      } }, f.label))),
    );
  }

  // ---- Footer ----------------------------------------------------------------
  function footer(): HTMLElement {
    const missing = missingLevelOneAnswers(h());
    const wrap = el("div", { class: "stack" });
    if (missing.length) {
      wrap.append(gentleFlag(`Still needed before a first FI date: ${missing.map((m) => MISSING_LABEL[m]).join(", ")}.`));
    }
    wrap.append(el("div", { class: "row-actions" }, el("button", { type: "button", class: "button", disabled: missing.length > 0, onClick: ctx.goToResult }, "See my FI date")));
    const sp = h().spending;
    const total = sp.kind === "rows" ? sp.rows.length : 0;
    wrap.append(el("p", { class: "notice" }, total ? `Spending rows entered: ${total}. Values shown as ${dollars(0).slice(0, 1)} are today's dollars.` : "Values are in today's dollars."));
    return wrap;
  }

  render();
  return root;
}
