/**
 * The result screen: the FI date in three bands, net worth over time, the key
 * figures behind it, and the trace behind the likely date. Reads the engine.
 * Never performs a financial calculation. Every number shown carries its kind.
 */

import {
  debtsNeedingRate,
  missingLevelOneAnswers,
  project,
  resolveAssumptions,
  resolveBand,
  toNominal,
  traceFiDate,
  type Household,
  type ProjectionResult,
} from "../../engine";
import { bandChart } from "../components/band-chart";
import { fieldRow } from "../components/field-row";
import { gentleFlag } from "../components/gentle-flag";
import { headlineResult } from "../components/headline-result";
import { toggleButton } from "../components/toggle-button";
import { computedFromBody, fiTraceBody, type Drawer } from "../components/trace-drawer";
import { clear, el } from "../dom";
import { dollars, percent } from "../format";

export interface ResultContext {
  household: Household;
  goToEntry(): void;
  drawer: Drawer;
}

export function resultScreen(ctx: ResultContext): HTMLElement {
  const root = el("div", {});
  const missing = missingLevelOneAnswers(ctx.household);
  const needRate = debtsNeedingRate(ctx.household);
  if (missing.length || needRate.length) {
    root.append(
      el("h1", { class: "screen-title" }, "Your FI date"),
      gentleFlag(
        missing.length ? "A few answers are still needed before there is a date to show." : `A debt still needs its interest rate: ${needRate.map((d) => d.label).join(", ")}.`,
        { label: "Go to your numbers", onClick: ctx.goToEntry },
      ),
    );
    return root;
  }

  let result: ProjectionResult;
  try {
    result = project(ctx.household);
  } catch (error) {
    root.append(
      el("h1", { class: "screen-title" }, "Your FI date"),
      gentleFlag(`The plan could not run: ${error instanceof Error ? error.message : String(error)}`, { label: "Go to your numbers", onClick: ctx.goToEntry }),
    );
    return root;
  }

  const likelyBand = resolveBand(resolveAssumptions(ctx.household.assumptions), "likely");
  let nominal = false;

  const display = (real: number, yearIndex: number) => (nominal ? toNominal(real, likelyBand.inflation, yearIndex) : real);
  const dollarsLabel = () => (nominal ? `future dollars (${percent(likelyBand.inflation)} inflation)` : "today's dollars");

  /** The width the chart will be shown at: the content column less the page and card padding. */
  const chartWidth = () => {
    const column = root.clientWidth || document.documentElement.clientWidth;
    const cardPadding = 34;
    return column - cardPadding;
  };

  function render(): void {
    clear(root);
    const likely = result.bands.likely;
    const t = likely.timeline;

    const openTrace = () => {
      ctx.drawer.open("What moves your FI date", el("p", { class: "muted" }, "Working it out..."));
      window.setTimeout(() => ctx.drawer.open("What moves your FI date", fiTraceBody(traceFiDate(ctx.household, "likely"))), 20);
    };

    const firstYear = t.rows[0]!.year;
    const retirementIndex = likely.retirementYear === null ? 0 : likely.retirementYear - firstYear;
    const lastIndex = t.rows.length - 1;

    const figures = el(
      "section",
      { class: "card key-figures", "aria-label": "Key figures, likely band" },
      el("div", { class: "card__title" }, el("h2", {}, "The likely band, in numbers"), toggleButton(nominal ? "Showing future dollars" : "Show future dollars", nominal, (next) => { nominal = next; render(); })),
      fieldRow({
        label: "Assets when work income stops",
        value: t.assetsAtRetirement === null ? "Not reached" : dollars(display(t.assetsAtRetirement, Math.max(0, retirementIndex - 1))),
        kind: "computed",
        onTapValue: () => ctx.drawer.open("Assets when work income stops", computedFromBody([
          "Your starting balances, grown by each account's mix of stocks, bonds, and cash at the likely returns, less fees.",
          "Plus every year's contributions: what you entered, the employer match, and the surplus the savings waterfall placed.",
          "Less the debt payments and spending that came out of take-home pay along the way.",
        ])),
      }),
      fieldRow({
        label: `Left at age ${likelyBand.planToAge}`,
        value: dollars(display(t.estate, lastIndex)),
        kind: "computed",
        onTapValue: () => ctx.drawer.open(`Left at age ${likelyBand.planToAge}`, computedFromBody([
          "Everything above, then every retirement year: spending by life phase, Social Security from your claiming age, withdrawals in order (cash above your reserve, taxable, pretax, Roth, then the reserve), and the taxes those withdrawals create.",
        ])),
      }),
      fieldRow({
        label: "Lifetime taxes",
        value: dollars(t.lifetimeTaxes),
        kind: "computed",
        help: "Federal income tax, FICA, self-employment tax, penalties, and state tax, summed over the whole plan in today's dollars.",
        onTapValue: () => ctx.drawer.open("Lifetime taxes", computedFromBody([
          "Each year's federal tax from the 2026 brackets and standard deduction, FICA at 7.65%, self-employment tax where it applies, the 10% penalty on early pretax withdrawals, and your state's brackets.",
        ])),
      }),
      fieldRow({
        label: `Social Security from ${t.socialSecurity.claimingAgeYears}`,
        value: `${dollars(t.socialSecurity.annualBenefit)} a year`,
        kind: "computed",
        help: ctx.household.self.socialSecurity.earningsRecord ? "From your ssa.gov record." : "Estimated from your income. Enter your ssa.gov record to sharpen it.",
        onTapValue: () => ctx.drawer.open("Social Security", computedFromBody([
          `Primary insurance amount ${dollars(t.socialSecurity.pia)} a month at full retirement age, from your 35 highest years of covered earnings and the 2026 bend points.`,
          `Claiming factor ${t.socialSecurity.factor.toFixed(3)} for claiming at ${t.socialSecurity.claimingAgeYears}.`,
          `Policy band: ${percent(likelyBand.socialSecurityPolicy * 100)} of the scheduled benefit in the likely band.`,
        ])),
      }),
    );

    const flags = [...new Set([...t.flags, ...t.rows.flatMap((r) => r.flags)])].slice(0, 8);

    root.append(
      el("h1", { class: "screen-title" }, "Your FI date"),
      headlineResult(result, openTrace),
      el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Net worth over time")), bandChart(result, { display, dollarsLabel: dollarsLabel(), width: chartWidth() })),
      figures,
      el("section", { class: "stack" }, ...flags.map((f) => gentleFlag(f))),
      el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: ctx.goToEntry }, "Change my numbers")),
      el("p", { class: "notice" }, "Money Rooms is educational software, not individualized financial, tax, or legal advice. Amounts are in today's dollars unless marked as future dollars."),
    );
  }

  // Draw once the screen is on the page, so the chart can be sized to its real width,
  // and redraw when the width changes.
  window.setTimeout(render, 0);
  let lastWidth = 0;
  const onResize = () => {
    if (!root.isConnected) {
      window.removeEventListener("resize", onResize);
      return;
    }
    const w = chartWidth();
    if (w !== lastWidth) {
      lastWidth = w;
      render();
    }
  };
  window.addEventListener("resize", onResize);
  return root;
}
