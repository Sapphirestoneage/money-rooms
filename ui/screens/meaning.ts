/**
 * Meaning (docs/m4-spec.md): the ratios (unlocked by level), the lenses, and
 * the Advice Translator. Reads the engine. Never calculates.
 */

import {
  LENSES,
  adviceTranslator,
  drafttLens,
  formatRatio,
  fourPercentLens,
  hoursLens,
  levelsPassed,
  missingLevelOneAnswers,
  ratioInputs,
  ratios,
  simpleMathLens,
  taxesLens,
  type AdviceVerdict,
  type Household,
  type RatioInputs,
  type RatioValue,
} from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import type { Drawer } from "../components/trace-drawer";
import { clear, el } from "../dom";
import { dollars, dollarsShort } from "../format";
import type { Store } from "../store";

export interface MeaningContext {
  household: Household;
  store: Store;
  goToEntry(): void;
  drawer: Drawer;
}

export function meaningScreen(ctx: MeaningContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const complete = () => missingLevelOneAnswers(h()).length === 0;
  let inputs: RatioInputs | null = null;
  let list: RatioValue[] | null = null;
  let advice: AdviceVerdict[] | null = null;
  let four: ReturnType<typeof fourPercentLens> | null = null;
  let simple: ReturnType<typeof simpleMathLens> | null = null;
  let taxes: ReturnType<typeof taxesLens> | null = null;
  let showLocked = false;
  let therapy = true;
  let taxLetter = false;
  let openLens: string | null = null;
  let working = false;

  const compute = () => {
    if (working || !complete()) return;
    working = true;
    window.setTimeout(() => {
      try {
        inputs = ratioInputs(h());
        list = ratios(h(), levelsPassed(h(), null), { includeLocked: showLocked });
        advice = adviceTranslator(h(), undefined, inputs);
        simple = simpleMathLens(h(), undefined, inputs);
      } catch {
        list = null;
      }
      working = false;
      render();
    }, 30);
  };
  const computeLens = (id: string) => {
    window.setTimeout(() => {
      try {
        if (id === "fourPercent" && !four) four = fourPercentLens(h());
        if (id === "taxes" && !taxes && inputs) taxes = taxesLens(h(), undefined, inputs);
      } catch {
        // Leave it.
      }
      render();
    }, 30);
  };

  function render(): void {
    clear(root);
    root.append(el("h1", { class: "screen-title" }, "Meaning"), el("p", { class: "lede" }, "What the numbers say about your life: ratios anyone can repeat, lenses that show the same plan from another angle, and the advice everyone hears, translated for you."));
    if (!complete()) {
      root.append(gentleFlag("A few answers are still needed before the numbers mean anything.", { label: "Go to your numbers", onClick: ctx.goToEntry }));
      return;
    }
    if (!list) {
      if (!working) compute();
      root.append(el("p", { class: "muted" }, "Working out the ratios..."));
      return;
    }
    root.append(ratiosCard(), lensesCard(), adviceCard());
  }

  function ratiosCard(): HTMLElement {
    const rows = list!.map((r) =>
      el(
        "div",
        { class: "ratio-row" },
        el("div", { class: "ratio-row__head" }, el("strong", {}, r.name), r.locked ? el("span", { class: "lock-badge" }, `Level ${r.unlockLevel}`) : kindBadge("computed"), el("span", { class: "ratio-row__value" }, r.value === null ? "" : formatRatio(r.value, r.unit))),
        el("div", {}, r.text),
        el("div", { class: "muted" }, `How: ${r.formula}.`),
      ),
    );
    return el(
      "section",
      { class: "card", "aria-label": "Ratios" },
      el("div", { class: "card__title" }, el("h2", {}, "Your ratios"), toggleButton(showLocked ? "Showing locked ratios" : "Show locked ratios", showLocked, (next) => { showLocked = next; list = null; render(); })),
      el("p", { class: "muted" }, "Each ratio names its arithmetic so you can check it. A ratio waits for its level unless you ask for it."),
      ...rows,
    );
  }

  function lensesCard(): HTMLElement {
    const buttons = el("div", { class: "row-actions" }, ...LENSES.map((l) => toggleButton(l.name, openLens === l.id, () => { openLens = openLens === l.id ? null : l.id; if (openLens) computeLens(openLens); render(); })));
    let body: HTMLElement | null = null;
    const lens = LENSES.find((l) => l.id === openLens);
    if (lens) {
      const parts: (HTMLElement | null)[] = [el("p", { class: "muted" }, lens.idea)];
      if (lens.id === "fourPercent") {
        parts.push(four ? el("p", {}, four.sentence, " ", kindBadge("computed")) : el("p", { class: "muted" }, "Working it out..."));
        if (four) parts.push(el("ul", { class: "aged-list" }, el("li", {}, `Gross FI (25 times ${dollars(four.annualSpending)}): ${dollars(four.grossFi)}${four.grossFiYear ? `, which your plan's assets reach in ${four.grossFiYear}` : ""}`), el("li", {}, `Net FI (assets at the optimized FI date): ${four.netFi === null ? "not funded" : dollars(four.netFi)}${four.netFiYear ? `, in ${four.netFiYear}` : ""}`), el("li", {}, four.differenceDollars === null ? "" : `Difference: ${dollars(Math.abs(four.differenceDollars))} ${four.differenceDollars < 0 ? "less" : "more"}${four.differenceYears !== null ? `, ${Math.abs(four.differenceYears)} ${Math.abs(four.differenceYears) === 1 ? "year" : "years"} ${four.differenceYears >= 0 ? "sooner" : "later"}` : ""}`)));
      } else if (lens.id === "simpleMath" && simple) {
        parts.push(
          el("p", {}, simple.sentence, " ", kindBadge("computed")),
          el("div", { class: "table-wrap", tabindex: 0, role: "region", "aria-label": "Years to FI by savings rate" }, el("table", { class: "compare-table" }, el("thead", {}, el("tr", {}, el("th", {}, "Savings rate"), el("th", {}, `Years to FI (${simple.tableReturnPercent}% real, ${simple.tableWithdrawalRatePercent}% withdrawal)`))), el("tbody", {}, ...simple.table.map((row) => el("tr", { class: simple!.savingsRatePercent !== null && Math.abs(row.savingsRate - simple!.savingsRatePercent) < 2.5 ? "compare-table__you" : "" }, el("td", {}, `${row.savingsRate}%`), el("td", {}, row.years === null ? "never" : `${Math.round(row.years)}`)))))),
          el("p", { class: "muted" }, `Source: ${simple.source}.`),
        );
      } else if (lens.id === "draftt" && inputs) {
        const d = drafttLens(h(), { therapy, taxes: taxLetter }, undefined, inputs);
        parts.push(
          el("div", { class: "row-actions" }, toggleButton(therapy ? "Therapy letter on" : "Therapy letter off", therapy, (n) => { therapy = n; render(); }), toggleButton(taxLetter ? "Taxes letter on" : "Taxes letter off", taxLetter, (n) => { taxLetter = n; render(); })),
          el("ul", { class: "aged-list" }, ...d.letters.map((l) => el("li", {}, el("strong", {}, `${l.id.replace(/\d/, "")}: ${l.label}`), el("span", {}, ` ${Math.round(l.sharePercent)}% of ${l.id === "T2" ? "gross" : "take-home"} pay`), el("span", { class: "muted" }, ` (a common range is ${l.range[0]} to ${l.range[1]}%${l.inRange ? ", and this is inside it" : ", and this is outside it"})`)))),
          el("p", { class: "muted" }, `The letters add to ${Math.round(d.totalPercent)}% of take-home pay. Ranges are plain words from common guidance, not verdicts.`),
        );
      } else if (lens.id === "hours" && inputs) {
        const hl = hoursLens(h(), undefined, inputs);
        parts.push(el("p", {}, hl.hourlyWage ? `An hour of your work is worth about ${dollars(hl.hourlyWage)} after taxes.` : "Hours need an income."), el("ul", { class: "aged-list" }, ...hl.lines.slice(0, 12).map((x) => el("li", {}, el("strong", {}, x.label), el("span", { class: "muted" }, ` ${dollars(x.annual)} a year is about ${Math.round(x.hours)} hours of work`)))));
      } else if (lens.id === "taxes") {
        parts.push(taxes ? el("div", { class: "stack" }, el("p", {}, `Lifetime taxes under the plan: ${dollars(taxes.lifetimeTaxes)}. This year taxes take ${Math.round(taxes.effectiveRateNow ?? 0)}% of gross income; over the whole plan, ${Math.round(taxes.taxEfficiencyPercent ?? 0)}% of every dollar that comes in. `, kindBadge("computed")), taxes.strategies.length ? el("ul", { class: "aged-list" }, ...taxes.strategies.map((s) => el("li", {}, `${s.label}: without it, lifetime taxes ${s.deltaLifetimeTaxesOff >= 0 ? "rise" : "fall"} by ${dollarsShort(Math.abs(s.deltaLifetimeTaxesOff))}.`))) : el("p", { class: "muted" }, "No strategy in the least-tax plan changes lifetime taxes.")) : el("p", { class: "muted" }, "Working it out..."));
      }
      body = el("div", { class: "stack" }, ...parts);
    }
    return el("section", { class: "card", "aria-label": "Lenses" }, el("div", { class: "card__title" }, el("h2", {}, "More ways to look at this")), buttons, body);
  }

  function adviceCard(): HTMLElement {
    const rows = (advice ?? []).map((a) => el("div", { class: "ratio-row" }, el("div", { class: "ratio-row__head" }, el("strong", {}, a.statement), el("span", { class: `verdict verdict--${a.verdict}` }, a.verdict === "applies" ? "Applies" : a.verdict === "partly" ? "Partly" : "Unlearn")), el("div", {}, a.sentence)));
    return el("section", { class: "card", "aria-label": "Advice Translator" }, el("div", { class: "card__title" }, el("h2", {}, "The Advice Translator")), el("p", { class: "muted" }, "The advice everyone hears, checked against your numbers. Applies, partly, or unlearn."), ...rows);
  }

  render();
  return root;
}
