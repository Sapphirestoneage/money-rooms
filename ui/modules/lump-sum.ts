/**
 * The lump-sum decision card (module data/modules/lump-sum.json, beta): where a large amount could come
 * from, side by side, in net dollars, taxes and penalties lost, FI age, and stress. Reads the engine.
 */

import { lumpSumComparison, type LumpSumComparison } from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import { el } from "../dom";
import { dollars } from "../format";
import type { ModuleContext } from "./index";

let amount: number | null = null;

export function lumpSumCard(ctx: ModuleContext): HTMLElement {
  const h = ctx.household;
  if (amount === null) {
    const family = h.accounts.kind === "rows" ? h.accounts.rows.find((a) => a.side === "debt" && a.preset === "family") : undefined;
    amount = family ? family.balance.value ?? 10000 : 10000;
  }
  const body = el("div", { class: "stack" }, el("p", { class: "muted" }, "Working out each source..."));
  const input = el("input", { class: "input input--money", type: "number", min: 0, step: 500, value: amount, id: "lump-sum-amount" });
  const card = el(
    "section",
    { class: "card", "aria-label": "The lump-sum decision" },
    el("div", { class: "card__title" }, el("h2", {}, "A large amount: where it could come from"), el("span", { class: "lock-badge" }, "Beta")),
    el("p", {}, "The same dollars cost different amounts from different places. Each source below is costed as if it came out this year on top of your return as entered; a loan from family already on your books shows as the amount borrowed."),
    el("div", { class: "field" }, el("label", { for: "lump-sum-amount" }, "Amount needed"), input),
    body,
  );
  const run = () => {
    let c: LumpSumComparison;
    try {
      c = lumpSumComparison(h, amount ?? 0, { liquidateAll: false });
    } catch (error) {
      body.replaceChildren(gentleFlag(`The comparison could not run: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }
    const rows = c.sources.map((s) =>
      el(
        "tr",
        {},
        el("th", { scope: "row" }, s.label),
        el("td", {}, dollars(s.gross)),
        el("td", {}, s.kind === "familyLoan" ? "none" : dollars(s.federalTax + s.creditsLost + s.penalty + s.stateTax)),
        el("td", {}, dollars(s.net)),
        el("td", {}, s.fiAge === null ? "not funded" : String(s.fiAge)),
        el("td", {}, s.stress === null ? "" : `${s.stress} of 5`),
      ),
    );
    body.replaceChildren(
      el(
        "div",
        { class: "table-wrap", tabindex: 0, role: "region", "aria-label": "Sources compared" },
        el(
          "table",
          { class: "history-table" },
          el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Source"), el("th", { scope: "col" }, "Out"), el("th", { scope: "col" }, "Taxes and penalties"), el("th", { scope: "col" }, "In hand"), el("th", { scope: "col" }, "FI age"), el("th", { scope: "col" }, "Stress"))),
          el("tbody", {}, ...rows),
        ),
      ),
      c.sources.length > 1 ? el("p", {}, c.sentences[c.sentences.length - 1] ?? "", " ", kindBadge("computed")) : el("p", {}, "No source to compare yet: an account or a family loan is needed."),
      ...c.sources.flatMap((s) => s.flags.map((f) => gentleFlag(`${s.label}: ${f}`))),
      el("p", { class: "muted" }, "Taxes and penalties include any credit the extra income phases down. FI age reruns the plan with that source used and the others untouched."),
    );
  };
  input.addEventListener("change", () => { amount = Math.max(0, Number(input.value) || 0); run(); });
  window.setTimeout(run, 30);
  return card;
}
