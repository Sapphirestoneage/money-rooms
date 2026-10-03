/**
 * Headline result (design system 5): the FI date in hero type, with the best
 * and worst range beneath it in one line. Never a verdict. Both the age and
 * the range carry a Computed badge.
 */

import type { ProjectionResult } from "../../engine";
import { el } from "../dom";
import { age, dollars } from "../format";
import { kindBadge } from "./kind-badge";

export function headlineResult(result: ProjectionResult, onTap: () => void): HTMLElement {
  const { best, likely, worst } = result.bands;

  if (!likely.funded) {
    const short = likely.neverFundedShortfall;
    return el(
      "section",
      { class: "headline", "aria-label": "Your FI date" },
      el("div", { class: "headline__kicker" }, "Your FI date"),
      el("div", { class: "headline__number-row" }, el("button", { type: "button", class: "headline__number", onClick: onTap }, "Not yet"), kindBadge("computed")),
      el(
        "p",
        { class: "headline__range" },
        short
          ? `In the likely band, the plan is short by ${dollars(short.amount)} a year starting at age ${short.age}, even working to plan-to age.`
          : "In the likely band, the plan is not fully funded through plan-to age.",
        best.funded && best.fiAge !== null ? ` In the best band it works from age ${best.fiAge}.` : "",
      ),
    );
  }

  const soon = best.funded && best.retirementYear !== null ? `Could be as soon as ${best.retirementYear}` : "";
  const late = worst.funded && worst.retirementYear !== null ? `as late as ${worst.retirementYear}` : "later than plan-to age in the worst band";
  const range = soon ? `${soon} or ${late}.` : `In the worst band, ${late}.`;

  return el(
    "section",
    { class: "headline", "aria-label": "Your FI date" },
    el("div", { class: "headline__kicker" }, "Your FI date"),
    el(
      "div",
      { class: "headline__number-row" },
      el("button", { type: "button", class: "headline__number", onClick: onTap, "aria-label": `${age(likely.fiAge ?? 0)}. Tap to see what moves it.` }, age(likely.fiAge ?? 0)),
      kindBadge("computed"),
    ),
    el("div", { class: "headline__range-row" }, el("p", { class: "headline__range" }, `Likely in ${likely.retirementYear}. ${range}`), kindBadge("computed")),
  );
}
