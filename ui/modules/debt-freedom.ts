/**
 * The Debt freedom room (module data/modules/debt-freedom.json, beta): the three payoff methods
 * with their debt-free dates and each debt's own month, the price of peace, what $100 more a month
 * buys, the promo-end warnings, and the stress rating on each debt. Reads the engine. Never calculates.
 */

import { debtFreedomView, debtFreeMilestone, userValue, type DebtFreedomView } from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import { clear, el } from "../dom";
import { dollars } from "../format";
import type { ModuleContext } from "./index";

const STRESS_LABEL: Record<number, string> = { 1: "1, barely on my mind", 2: "2", 3: "3, I think about it", 4: "4", 5: "5, it weighs on me" };

function monthText(ym: string | null): string {
  if (!ym) return "not at this budget";
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} ${y}`;
}

export function debtFreedomLevelCard(ctx: ModuleContext): HTMLElement {
  const m = debtFreeMilestone(ctx.household);
  return el(
    "section",
    { class: "card", "aria-label": "Debt freedom" },
    el("div", { class: "card__title" }, el("h2", {}, "Debt freedom"), el("span", { class: "lock-badge" }, "Beta")),
    m ? el("p", {}, `Debt free ${monthText(m.month)}${m.age !== null ? ` (age ${m.age})` : ""} at today's payments, highest rate first. `, kindBadge("computed")) : el("p", {}, "No debts to pay off."),
    el("p", { class: "muted" }, m ? m.movedBy : ""),
    el("div", { class: "row-actions" }, el("a", { class: "button button--quiet", href: "#/m/debt-freedom" }, "Open the room")),
  );
}

export function debtFreedomScreen(ctx: ModuleContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  let extraMonthly = 0;
  let view: DebtFreedomView | null = null;
  const compute = () => { view = debtFreedomView(h(), { extraMonthly }); };

  function render(): void {
    clear(root);
    if (!view) compute();
    const v = view!;
    root.append(
      el("div", { class: "screen-head" }, el("h1", { class: "screen-title" }, "Debt freedom"), el("span", { class: "lock-badge" }, "Beta")),
      el("p", { class: "lede" }, "Every minimum gets paid; the rest of the budget goes to one debt at a time. Three orders, side by side, with the date each one reaches debt free and what the order costs."),
    );
    if (!v.debts.length) {
      root.append(el("p", {}, "No debts to pay off."), el("p", {}, el("a", { href: "#/levels" }, "Back to Levels")));
      return;
    }
    root.append(budgetCard(v), methodsCard(v), ...v.promoWarnings.map((w) => gentleFlag(w.sentence)), stressCard(v), el("p", {}, el("a", { href: "#/levels" }, "Back to Levels")));
  }

  function budgetCard(v: DebtFreedomView): HTMLElement {
    const extra = el("input", { class: "input", type: "number", min: 0, step: 25, value: extraMonthly, id: "debt-extra", "aria-describedby": "debt-extra-help" });
    extra.addEventListener("change", () => { extraMonthly = Math.max(0, Number(extra.value) || 0); view = null; render(); });
    const hundred = v.hundredMore.find((x) => x.method === "avalanche");
    return el(
      "section",
      { class: "card", "aria-label": "The monthly budget" },
      el("div", { class: "card__title" }, el("h2", {}, `${dollars(v.budgetMonthly)} a month toward debt`)),
      el("p", {}, `The minimums add up to ${dollars(v.budgetMonthly - v.extraMonthly)} a month${v.extraMonthly ? `, plus ${dollars(v.extraMonthly)} extra` : ""}. `, kindBadge("computed")),
      el("div", { class: "field" }, el("label", { for: "debt-extra" }, "Extra a month, on top of the minimums"), extra, el("p", { class: "field__help", id: "debt-extra-help" }, "In today's dollars. This screen only; it is not saved with your numbers.")),
      hundred ? el("p", {}, `With $100 more a month, the avalanche is debt free ${hundred.monthsSaved} ${hundred.monthsSaved === 1 ? "month" : "months"} sooner and pays ${dollars(hundred.interestSaved)} less interest.`) : null,
    );
  }

  function methodsCard(v: DebtFreedomView): HTMLElement {
    const table = el(
      "div",
      { class: "table-wrap", tabindex: 0, role: "region", "aria-label": "Payoff methods compared" },
      el(
        "table",
        { class: "history-table" },
        el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Method"), el("th", { scope: "col" }, "Debt free"), el("th", { scope: "col" }, "Interest"), el("th", { scope: "col" }, "Stress-months"))),
        el("tbody", {}, ...v.methods.map((m) => el("tr", {}, el("th", { scope: "row" }, m.label), el("td", {}, monthText(m.debtFreeMonth)), el("td", {}, dollars(m.totalInterest)), el("td", {}, String(Math.round(m.stressMonths)))))),
      ),
    );
    const orders = el(
      "div",
      { class: "stack" },
      ...v.methods.map((m) => el("div", {}, el("h3", { class: "card__subtitle" }, m.label.split(" (")[0]!), el("ol", { class: "plan-steps" }, ...m.order.map((d) => el("li", {}, el("strong", {}, d.label), el("span", {}, ` paid off ${monthText(d.paidOff)}`)))))),
    );
    return el(
      "section",
      { class: "card", "aria-label": "Payoff methods" },
      el("div", { class: "card__title" }, el("h2", {}, "Three orders, side by side")),
      table,
      v.debts.length > 1 ? el("p", {}, `The price of peace: the peace-first order costs ${dollars(v.priceOfPeace)} more in interest than the avalanche and saves ${Math.round(v.peaceGained)} stress-months. `, kindBadge("computed")) : null,
      el("h3", { class: "card__subtitle" }, "Each debt's own month"),
      orders,
    );
  }

  function stressCard(v: DebtFreedomView): HTMLElement {
    const rows = v.debts.map((d) => {
      const sel = el("select", { class: "select", id: `stress-${d.id}`, "aria-label": `Stress rating for ${d.label}` });
      for (const n of [1, 2, 3, 4, 5]) sel.append(el("option", { value: String(n), selected: n === d.stress }, STRESS_LABEL[n]!));
      sel.addEventListener("change", () => {
        const accounts = h().accounts;
        if (accounts.kind !== "rows") return;
        const row = accounts.rows.find((a) => a.id === d.id);
        if (row && row.side === "debt") row.stress = userValue(Number(sel.value), h().asOf);
        ctx.save();
        view = null;
        render();
      });
      return el("div", { class: "field" }, el("label", { for: `stress-${d.id}` }, `${d.label}: ${dollars(d.balance)} at ${d.promo ? `${d.promo.ratePercent}% until the promo ends, then ${d.ratePercent}%` : `${d.ratePercent}%`}`), sel);
    });
    return el(
      "section",
      { class: "card", "aria-label": "How much each debt weighs on you" },
      el("div", { class: "card__title" }, el("h2", {}, "How much each debt weighs on you")),
      el("p", { class: "muted" }, "The peace-first order uses these ratings: each debt's rating times the months it is still owed, kept as small as possible. Saved with your numbers."),
      el("div", { class: "field-grid" }, ...rows),
    );
  }

  render();
  return root;
}
