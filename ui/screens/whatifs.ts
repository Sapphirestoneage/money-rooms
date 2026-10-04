/**
 * What-ifs (roadmap M5, docs/levels/level-3-life-plans.md sections 2 to 4 and
 * 6): scenario blocks with their headlines and timings, dreams with their price
 * cards, and the payoff methods side by side. Reads the engine. Never calculates.
 */

import {
  BLOCK_TYPES,
  applyBlocks,
  blockFromQuestionnaire,
  blockHeadline,
  comparePayoffMethods,
  goalsInPlan,
  missingLevelOneAnswers,
  payoffDebts,
  priceCard,
  userValue,
  type BlockHeadline,
  type GoalBucket,
  type Household,
  type PriceCard,
  type ScenarioBlock,
  type ScenarioBlockType,
} from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import type { Drawer } from "../components/trace-drawer";
import { clear, el, rowId } from "../dom";
import { dollars, dollarsShort, yearWord } from "../format";
import { activeModule, moduleCards } from "../modules/index";
import type { Store } from "../store";

export interface WhatIfsContext {
  household: Household;
  store: Store;
  save(): void;
  goToEntry(): void;
  drawer: Drawer;
}

export function whatIfsScreen(ctx: WhatIfsContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const asOf = () => ctx.household.asOf;
  const complete = () => missingLevelOneAnswers(h()).length === 0;
  const headlines = new Map<string, BlockHeadline[]>();
  const cards = new Map<string, PriceCard>();
  let goals: ReturnType<typeof goalsInPlan> | null = null;
  let payoff: ReturnType<typeof comparePayoffMethods> | null = null;
  let extraMonthly = 0;
  let working = false;
  const invalidate = () => { headlines.clear(); cards.clear(); goals = null; payoff = null; ctx.save(); render(); };

  const compute = () => {
    if (working || !complete()) return;
    working = true;
    window.setTimeout(() => {
      try {
        for (const b of h().blocks ?? []) if (!headlines.has(b.id)) headlines.set(b.id, b.startDates.map((s) => blockHeadline(h(), b, s)));
        for (const g of h().goals) if (!cards.has(g.id)) cards.set(g.id, priceCard(h(), g, undefined, 8));
        goals = goalsInPlan(h());
        payoff = comparePayoffMethods(h(), extraMonthly);
      } catch {
        // Leave what computed.
      }
      working = false;
      render();
    }, 30);
  };

  const num = (label: string, value: number | undefined, placeholder: string, onChange: (v: number) => void): HTMLElement => {
    const input = el("input", { class: "input", type: "number", value: value ?? "", placeholder, step: "any" });
    input.addEventListener("change", () => { if (input.value !== "") onChange(Number(input.value)); });
    return el("div", { class: "field" }, el("label", {}, label), input);
  };
  const monthInput = (label: string, value: string, onChange: (v: string) => void): HTMLElement => {
    const input = el("input", { class: "input", type: "text", value, placeholder: "YYYY-MM", pattern: "\\d{4}-\\d{2}" });
    input.addEventListener("change", () => { if (/^\d{4}-\d{2}$/.test(input.value)) onChange(input.value); });
    return el("div", { class: "field" }, el("label", {}, label), input);
  };

  function render(): void {
    clear(root);
    root.append(el("h1", { class: "screen-title" }, "What-ifs"), el("p", { class: "lede" }, "Every dream has a price in money, time, and milestones. Blocks and dreams sit on top of your real numbers and never change them."));
    if (!complete()) {
      root.append(gentleFlag("A few answers are still needed before what-ifs have numbers to work with.", { label: "Go to your numbers", onClick: ctx.goToEntry }));
      return;
    }
    root.append(blocksCard(), dreamsCard(), payoffCard(), ...moduleCards("#/whatifs", ctx));
  }

  // ---- Scenario blocks ------------------------------------------------------------
  let pendingType: ScenarioBlockType | null = null;
  const answers: Record<string, number> = {};
  let pendingStart = `${Number(asOf().slice(0, 4)) + 2}-01`;

  function blocksCard(): HTMLElement {
    const blocks = h().blocks ?? [];
    const list = el("div", { class: "stack" });
    for (const b of blocks) {
      const hs = headlines.get(b.id);
      const lines = hs
        ? hs.map((x) => `${x.start}: ${x.monthlyCashFlowChange >= 0 ? "+" : "-"}${dollars(Math.abs(x.monthlyCashFlowChange))} a month in cash flow; FI date ${x.fiDeltaYears === null ? "not funded" : x.fiDeltaYears === 0 ? "does not move" : `${yearWord(Math.abs(x.fiDeltaYears))} ${x.fiDeltaYears > 0 ? "later" : "sooner"}`} (${x.fiAgeWithout ?? "?"} to ${x.fiAgeWith ?? "?"}).`)
        : ["Working out the headline..."];
      list.append(
        el(
          "section",
          { class: "card block-card" },
          el("div", { class: "card__title" }, el("h3", {}, b.name), kindBadge(b.confidence), el("span", { class: "muted" }, b.enabled ? "" : "Off")),
          el("ul", { class: "aged-list" }, ...lines.map((l) => el("li", {}, l))),
          el("p", { class: "muted" }, `${b.changes.length} ${b.changes.length === 1 ? "change" : "changes"}: ${b.changes.map((c) => `${c.op} ${c.target}`).join(", ")}.${b.relation ? ` ${b.relation.kind === "replacing" ? "Replaces" : "In addition to"} another block.` : ""}`),
          el(
            "div",
            { class: "row-actions" },
            el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { b.enabled = !b.enabled; invalidate(); } }, b.enabled ? "Turn off" : "Turn on"),
            el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { const s = window.prompt("Compare another start month (YYYY-MM):", b.startDates[0]); if (s && /^\d{4}-\d{2}$/.test(s)) { b.startDates = [...b.startDates, s]; headlines.delete(b.id); invalidate(); } } }, "Compare a timing"),
            el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { h().blocks = blocks.filter((x) => x.id !== b.id); invalidate(); } }, "Remove"),
          ),
        ),
      );
    }
    if (blocks.length && !blocks.every((b) => headlines.has(b.id))) compute();
    const typeSelect = el("select", { class: "select", "aria-label": "Kind of block" }, el("option", { value: "", selected: pendingType === null }, "Add a block..."), ...BLOCK_TYPES.map((t) => el("option", { value: t.id, selected: pendingType === t.id }, t.label)));
    typeSelect.addEventListener("change", () => { pendingType = (typeSelect.value || null) as ScenarioBlockType | null; for (const k of Object.keys(answers)) delete answers[k]; render(); });
    const questionnaire = pendingType
      ? (() => {
          const t = BLOCK_TYPES.find((x) => x.id === pendingType)!;
          return el(
            "div",
            { class: "stack" },
            el("div", { class: "field-grid" }, ...t.questions.map((q) => num(q.label, answers[q.id], String(q.default), (v) => { answers[q.id] = v; })), monthInput("Starts", pendingStart, (v) => { pendingStart = v; })),
            el("p", { class: "muted" }, "Blanks use national defaults, marked roughly. Real quotes replace them."),
            el("div", { class: "row-actions" }, el("button", { type: "button", class: "button", onClick: () => { const block = blockFromQuestionnaire(pendingType!, rowId("block"), t.label, pendingStart, { ...answers }); h().blocks = [...blocks, block]; pendingType = null; invalidate(); } }, "Add this as a block"), el("button", { type: "button", class: "button button--quiet", onClick: () => { pendingType = null; render(); } }, "Cancel")),
          );
        })()
      : null;
    return el("section", { class: "card", "aria-label": "Scenario blocks" }, el("div", { class: "card__title" }, el("h2", {}, "Scenario blocks")), el("p", { class: "muted" }, "A few questions expand into changes to income, spending, and accounts. Blocks stack. Adding one never changes another; reconfirm related blocks yourself."), list, el("div", { class: "field" }, typeSelect), questionnaire);
  }

  // ---- Dreams ---------------------------------------------------------------------
  function dreamsCard(): HTMLElement {
    const list = el("div", { class: "stack" });
    for (const g of h().goals) {
      const card = cards.get(g.id);
      const body: (HTMLElement | null)[] = [el("div", { class: "card__title" }, el("h3", {}, g.name), kindBadge(g.cost.confidence), el("span", { class: "muted" }, `${g.priority}, ${g.cadence === "oneOff" ? dollars(g.cost.value) : `${dollars(g.cost.value)} a year`} from ${g.startAge}`))];
      if (card) {
        body.push(
          el("ol", { class: "plan-steps" },
            el("li", {}, el("strong", {}, "The cost in time. "), card.costYears === null ? "With this dream the plan is not fully funded." : card.costYears === 0 ? `${g.name} at ${g.startAge} does not move your FI date.` : `${g.name} at ${g.startAge} moves your FI date ${yearWord(Math.abs(card.costYears))} ${card.costYears > 0 ? "later" : "sooner"}.`),
            el("li", {}, el("strong", {}, "The true amount. "), `${dollars(card.cost)} at ${g.startAge} is about ${dollarsShort(card.trueAmount)} at ${card.trueAmountAge}, in today's dollars.`),
            el("li", {}, el("strong", {}, "The other side of the trade. "), card.otherSide),
            el("li", {}, el("strong", {}, "The best timing. "), card.cheapestAge !== null && card.cheapestCostYears !== null ? `Cheapest within your window: ${card.cheapestAge} (${card.cheapestCostYears === 0 ? "no move" : yearWord(card.cheapestCostYears)}). Your chosen timing stays unless you move it.` : "No timing in the window keeps the plan funded."),
          ),
          el("div", { class: "timing-curve", role: "img", "aria-label": `Cost in years by start age: ${card.curve.map((p) => `${p.startAge}: ${p.costYears ?? "not funded"}`).join(", ")}` },
            ...card.curve.map((p) => el("div", { class: "timing-curve__bar", title: `${p.startAge}: ${p.costYears ?? "not funded"} ${p.markers.join(", ")}` }, el("div", { class: "timing-curve__fill", style: `height:${p.costYears === null ? 100 : Math.min(100, p.costYears * 20)}%` }), el("span", { class: "timing-curve__age" }, String(p.startAge)), p.markers.length ? el("span", { class: "timing-curve__marker", "aria-hidden": "true" }, "•") : null))),
          card.curve.some((p) => p.markers.length) ? el("p", { class: "muted" }, `Markers: ${card.curve.filter((p) => p.markers.length).map((p) => `${p.startAge} ${p.markers.join(" and ")}`).join("; ")}.`) : null,
          el("p", { class: "muted" }, `Milestones moved: ${card.milestonesMoved.map((m) => `${m.label} ${m.from ?? "?"} to ${m.to ?? "?"}`).join("; ")}.`),
          el("p", { class: "muted" }, `Ways to lower the price: ${card.waysToLower.join(" ")}`),
        );
      } else {
        compute();
        body.push(el("p", { class: "muted" }, "Pricing this dream..."));
      }
      body.push(el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { h().goals = h().goals.filter((x) => x.id !== g.id); invalidate(); } }, "Remove")));
      list.append(el("section", { class: "card" }, ...body));
    }
    const summary = goals
      ? el("p", {}, goals.trimmed.length ? `Held to your FI date, the plan keeps ${goals.kept.map((g) => g.name).join(", ") || "none"} and trims ${goals.trimmed.map((g) => `${g.name}${goals!.affordableAt[g.id] !== null ? ` (fits from ${goals!.affordableAt[g.id]})` : " (no timing fits)"}`).join(", ")}. With every dream, FI moves to ${goals.withAll.fiAge ?? "never"}.` : h().goals.length ? `Every dream fits with your FI date at ${goals.withKept.fiAge}.${goals.withAll.fiAge !== null && goals.baseline.fiAge !== null && goals.withAll.fiAge === goals.baseline.fiAge ? " You have room for one more dream before then." : ""}` : "No dreams yet. Add one to see its price.")
      : null;
    let name = "";
    let cost = 5000;
    let age = Number(asOf().slice(0, 4)) - Number((h().self.birthDate?.value ?? "2000-01").slice(0, 4)) + 3;
    let priority: GoalBucket["priority"] = "want";
    let cadence: GoalBucket["cadence"] = "oneOff";
    const nameInput = el("input", { class: "input", type: "text", placeholder: "Six months in Lisbon" });
    nameInput.addEventListener("input", () => { name = nameInput.value; });
    const prioritySelect = el("select", { class: "select", "aria-label": "Priority" }, ...(["must", "want", "dream"] as const).map((p) => el("option", { value: p, selected: p === priority }, p)));
    prioritySelect.addEventListener("change", () => { priority = prioritySelect.value as GoalBucket["priority"]; });
    const cadenceSelect = el("select", { class: "select", "aria-label": "One-off or a year" }, el("option", { value: "oneOff", selected: true }, "One-off"), el("option", { value: "annual" }, "Every year"));
    cadenceSelect.addEventListener("change", () => { cadence = cadenceSelect.value as GoalBucket["cadence"]; });
    const add = el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h3", {}, "Add a dream")),
      el("div", { class: "field-grid card__details-body" }, el("div", { class: "field" }, el("label", {}, "Name"), nameInput), num("Cost", cost, "5000", (v) => { cost = v; }), num("Age", age, String(age), (v) => { age = v; }), el("div", { class: "field" }, el("label", {}, "Priority"), prioritySelect), el("div", { class: "field" }, el("label", {}, "One-off or every year"), cadenceSelect)),
      el("div", { class: "row-actions" }, el("button", { type: "button", class: "button", onClick: () => { if (!name) name = "A dream"; h().goals = [...h().goals, { id: rowId("goal"), name, cost: userValue(cost, asOf(), "roughly"), cadence, startAge: age, endAge: cadence === "annual" ? age + 4 : age, priority }]; invalidate(); } }, "Add the dream")),
    );
    return el("section", { class: "card", "aria-label": "Dreams" }, el("div", { class: "card__title" }, el("h2", {}, "Dreams and their price")), summary, list, add);
  }

  // ---- Payoff methods -----------------------------------------------------------
  function payoffCard(): HTMLElement {
    const debts = payoffDebts(h());
    if (!debts.length) return el("section", { class: "card", "aria-label": "Payoff methods" }, el("div", { class: "card__title" }, el("h2", {}, "Payoff methods")), el("p", {}, "No debts to pay off."));
    if (!payoff) compute();
    const extra = el("input", { class: "input", type: "number", min: 0, step: 10, value: extraMonthly, "aria-label": "Extra a month toward debts" });
    extra.addEventListener("change", () => { extraMonthly = Math.max(0, Number(extra.value)); payoff = null; render(); });
    const table = payoff
      ? el("div", { class: "table-wrap", tabindex: 0, role: "region", "aria-label": "Payoff methods compared" }, el(
          "table",
          { class: "compare-table" },
          el("thead", {}, el("tr", {}, el("th", {}, "Method"), el("th", {}, "Order"), el("th", {}, "Debt free in"), el("th", {}, "Interest"), el("th", {}, "Stress-months"))),
          el("tbody", {}, ...payoff.plans.map((p) => el("tr", {}, el("th", { scope: "row" }, p.method === "avalanche" ? "Avalanche (highest rate first)" : p.method === "snowball" ? "Snowball (smallest balance first)" : "Peace-first (fewest stress-months)"), el("td", {}, p.order.map((id) => debts.find((d) => d.id === id)?.label ?? id).join(", ")), el("td", {}, Number.isFinite(p.monthsToDebtFree) ? `${p.monthsToDebtFree} months` : "not at this budget"), el("td", {}, dollars(p.totalInterest)), el("td", {}, String(Math.round(p.stressMonths)))))),
        ))
      : el("p", { class: "muted" }, "Comparing the methods...");
    return el(
      "section",
      { class: "card", "aria-label": "Payoff methods" },
      el("div", { class: "card__title" }, el("h2", {}, "Payoff methods, side by side")),
      el("div", { class: "field" }, el("label", {}, "Extra a month toward debts, on top of the minimums"), extra),
      table,
      payoff ? el("p", {}, `The price of peace: the peace-first order costs ${dollars(payoff.priceOfPeace)} more in interest than the avalanche and saves ${Math.round(payoff.peaceGained)} stress-months. `, kindBadge("computed")) : null,
      activeModule("debt-freedom", ctx) ? el("p", {}, el("a", { href: "#/m/debt-freedom" }, "The Debt freedom room"), ": each debt's own month, the promo-end warnings, and the stress ratings.") : null,
      el("p", { class: "muted" }, "Stress is the 1 to 5 rating on each debt (3 when not rated). Stress-months add up each debt's rating for every month it is still owed."),
    );
  }

  render();
  return root;
}
