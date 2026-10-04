/**
 * The result screen (M2 spec section 9): the FI date in three bands, the True
 * FI reveal, the net worth chart, the plan in words, the strategies and what
 * each is worth, the key figures, tripwires and the stress test, the rules
 * behind the plan, and the flags. Sections come in a default order and can be
 * rearranged; the order lives with display preferences, never with the plan.
 * Reads the engine. Never performs a financial calculation.
 */

import {
  OBJECTIVES,
  OBJECTIVE_QUESTION,
  addSnapshot,
  snapshotFrom,
  trendSentence,
  debtsNeedingRate,
  defaultDeps,
  drawdownUnlockItems,
  fiNumbers,
  missingLevelOneAnswers,
  planSteps,
  project,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  runFor,
  strategiesUsed,
  toNominal,
  traceFiDate,
  tripwireFlags,
  unconfirmedIncome,
  type Household,
  type Objective,
  type OptimizerResult,
  type ProjectionResult,
  type ToggleEffect,
  type StressCase,
} from "../../engine";
import { bandChart } from "../components/band-chart";
import { confirmPanel } from "../components/confirm-panel";
import { fieldRow } from "../components/field-row";
import { gentleFlag } from "../components/gentle-flag";
import { headlineResult } from "../components/headline-result";
import { kindBadge } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import { computedFromBody, fiTraceBody, type Drawer } from "../components/trace-drawer";
import { clear, el } from "../dom";
import { dollars, dollarsShort, percent, yearWord } from "../format";
import pkg from "../../package.json";
import MATERIALITY from "../../data/materiality.json";
import type { Store } from "../store";
import { runOptimizerJob, type OptimizerMessage, type OptimizerProgress, type OptimizerRequest } from "../workers/optimizer.worker";

const STAGE_TEXT: Record<OptimizerProgress["stage"], string> = {
  searching: "Working out your True FI number: searching about a hundred plans...",
  toggles: "Working out what each strategy is worth...",
  stress: "Running the stress test...",
};

export interface ResultContext {
  household: Household;
  store: Store;
  goToEntry(): void;
  drawer: Drawer;
}

type SectionId = "date" | "trueFi" | "chart" | "plan" | "strategies" | "figures" | "tripwires" | "rules" | "flags" | "progress";
const DEFAULT_ORDER: readonly SectionId[] = ["date", "trueFi", "chart", "plan", "strategies", "figures", "tripwires", "rules", "flags", "progress"];
const SECTION_TITLE: Record<SectionId, string> = {
  date: "Your FI date",
  trueFi: "Your True FI number",
  chart: "Net worth over time",
  plan: "What the plan does, year by year",
  strategies: "Strategies in this plan",
  figures: "The likely band, in numbers",
  tripwires: "Rules that could change",
  rules: "Rules behind this plan",
  flags: "Things to look at",
  progress: "Your progress",
};

const isObjective = (x: string | undefined): x is Objective => OBJECTIVES.includes(x as Objective);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  // Progress history (docs/history-spec.md): one snapshot a day, taken here and saved with the household.
  {
    const snap = snapshotFrom(ctx.household, result, ctx.household.asOf);
    const next = addSnapshot(ctx.household.history ?? [], snap);
    if (JSON.stringify(next) !== JSON.stringify(ctx.household.history ?? [])) {
      ctx.household.history = next;
      ctx.store.save(ctx.household);
    }
  }
  const prefs = () => ctx.store.loadPrefs();
  const savePrefs = (patch: Partial<ReturnType<Store["loadPrefs"]>>) => ctx.store.savePrefs({ ...prefs(), ...patch });
  let nominal = false;
  let objective: Objective = isObjective(prefs().objective) ? (prefs().objective as Objective) : "earliestFi";
  let rearranging = false;
  let revealing = false;

  // The optimizer runs off the main thread in a Web Worker (docs/performance-budget.md), so the FI date paints first
  // and the page stays responsive; the True FI card shows which stage is running. Without workers it falls back to a timeout.
  let optimized: OptimizerResult | null = null;
  let toggles: ToggleEffect[] | null = null;
  let stress: StressCase[] | null = null;
  let working = false;
  let stage: OptimizerProgress["stage"] | null = null;
  let jobId = 0;
  let worker: Worker | null = null;
  const onMessage = (m: OptimizerMessage) => {
    if (m.id !== jobId) return;
    if ("stage" in m) {
      stage = m.stage;
      const note = root.querySelector("[data-optimizer-stage]");
      if (note) note.textContent = STAGE_TEXT[stage];
      return;
    }
    if ("done" in m) {
      optimized = m.optimized;
      toggles = m.toggles;
      stress = m.stress;
    } else optimized = null;
    working = false;
    stage = null;
    render();
  };
  const optimize_ = () => {
    if (working) return;
    working = true;
    jobId += 1;
    const req: OptimizerRequest = { id: jobId, household: structuredClone(ctx.household), objective };
    if (typeof Worker !== "undefined") {
      try {
        worker ??= new Worker(new URL("../workers/optimizer.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (e: MessageEvent<OptimizerMessage>) => onMessage(e.data);
        worker.onerror = () => onMessage({ id: jobId, error: "The optimizer worker failed." });
        worker.postMessage(req);
        return;
      } catch {
        worker = null;
      }
    }
    window.setTimeout(() => runOptimizerJob(req, onMessage), 30);
  };

  const order = (): SectionId[] => {
    const saved = prefs().resultOrder?.filter((x): x is SectionId => (DEFAULT_ORDER as readonly string[]).includes(x)) ?? [];
    const rest = DEFAULT_ORDER.filter((x) => !saved.includes(x));
    return [...saved, ...rest];
  };
  const move = (id: SectionId, by: -1 | 1) => {
    const o = order();
    const i = o.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j]!, o[i]!];
    savePrefs({ resultOrder: o });
    render();
  };

  const display = (real: number, yearIndex: number) => (nominal ? toNominal(real, likelyBand.inflation, yearIndex) : real);
  const dollarsLabel = () => (nominal ? `future dollars (${percent(likelyBand.inflation)} inflation)` : "today's dollars");
  const chartWidth = () => {
    const column = root.clientWidth || document.documentElement.clientWidth;
    return column - 34;
  };
  const signedYears = (n: number | null, word: { later: string; sooner: string }) => (n === null ? "not funded" : n === 0 ? "no change" : `${yearWord(Math.abs(n))} ${n > 0 ? word.later : word.sooner}`);

  function render(): void {
    clear(root);
    const likely = result.bands.likely;
    const t = likely.timeline;
    const firstYear = t.rows[0]!.year;
    const retirementIndex = likely.retirementYear === null ? 0 : likely.retirementYear - firstYear;
    const lastIndex = t.rows.length - 1;

    const openTrace = () => {
      ctx.drawer.open("What moves your FI date", el("p", { class: "muted" }, "Working it out..."));
      window.setTimeout(() => ctx.drawer.open("What moves your FI date", fiTraceBody(traceFiDate(ctx.household, "likely"))), 20);
    };

    const sectionCard = (id: SectionId, body: (HTMLElement | null)[], titleExtra?: HTMLElement | null): HTMLElement => {
      const o = order();
      const i = o.indexOf(id);
      const controls = rearranging
        ? el(
            "div",
            { class: "section-order", role: "group", "aria-label": `Move ${SECTION_TITLE[id]}` },
            el("button", { type: "button", class: "button button--quiet button--small", disabled: i === 0, onClick: () => move(id, -1), "aria-label": `Move ${SECTION_TITLE[id]} up` }, "Up"),
            el("button", { type: "button", class: "button button--quiet button--small", disabled: i === o.length - 1, onClick: () => move(id, 1), "aria-label": `Move ${SECTION_TITLE[id]} down` }, "Down"),
          )
        : null;
      return el("section", { class: "card", "aria-label": SECTION_TITLE[id] }, el("div", { class: "card__title" }, el("h2", {}, SECTION_TITLE[id]), titleExtra ?? null, controls), ...body);
    };

    const sections: Record<SectionId, () => HTMLElement> = {
      date: () => el("div", {}, headlineResult(result, openTrace), rearranging ? el("div", { class: "section-order section-order--center" }, el("button", { type: "button", class: "button button--quiet button--small", disabled: order().indexOf("date") === 0, onClick: () => move("date", -1) }, "Up"), el("button", { type: "button", class: "button button--quiet button--small", onClick: () => move("date", 1) }, "Down")) : null),
      trueFi: () => trueFiSection(),
      progress: () => progressSection(),
      chart: () => sectionCard("chart", [bandChart(result, { display, dollarsLabel: dollarsLabel(), width: chartWidth() })]),
      plan: () => planSection(),
      strategies: () => strategiesSection(),
      figures: () =>
        sectionCard(
          "figures",
          [
            fieldRow({
              label: "Assets when work income stops",
              value: t.assetsAtRetirement === null ? "Not reached" : dollars(display(t.assetsAtRetirement, Math.max(0, retirementIndex - 1))),
              kind: "computed",
              onTapValue: () => ctx.drawer.open("Assets when work income stops", computedFromBody(["Your starting balances, grown by each account's mix of stocks, bonds, and cash at the likely returns, less fees.", "Plus every year's contributions: what you entered, the employer match, and the surplus the savings waterfall placed.", "Less the debt payments and spending that came out of take-home pay along the way."])),
            }),
            fieldRow({
              label: `Left at age ${likelyBand.planToAge}`,
              value: dollars(display(t.estate, lastIndex)),
              kind: "computed",
              onTapValue: () => ctx.drawer.open(`Left at age ${likelyBand.planToAge}`, computedFromBody(["Everything above, then every retirement year: spending by life phase, health care, Social Security from your claiming age, withdrawals in order, and the taxes those withdrawals create at full depth (ordinary brackets, capital gains, the taxable part of Social Security, penalties where they apply)."])),
            }),
            fieldRow({
              label: "Lifetime taxes",
              value: dollars(t.lifetimeTaxes),
              kind: "computed",
              help: "Federal income and capital gains tax, FICA, self-employment tax, penalties, and state tax, summed over the whole plan in today's dollars.",
              onTapValue: () => ctx.drawer.open("Lifetime taxes", computedFromBody(["Each year's federal tax from the 2026 brackets, the standard deduction (and the extra at 65 and the senior deduction while it exists), long-term gains stacked on top, the taxable part of Social Security, FICA, self-employment tax, the 10% additional tax where no exception applies, and your state's brackets."])),
            }),
            fieldRow({
              label: `Social Security from ${t.socialSecurity.claimingAgeYears}`,
              value: `${dollars(t.socialSecurity.annualBenefit)} a year`,
              kind: "computed",
              help: ctx.household.self.socialSecurity.earningsRecord ? "From your ssa.gov record." : "Estimated from your income. Enter your ssa.gov record to sharpen it.",
              onTapValue: () => ctx.drawer.open("Social Security", computedFromBody([`Primary insurance amount ${dollars(t.socialSecurity.pia)} a month at full retirement age, from your 35 highest years of covered earnings and the 2026 bend points.`, `Claiming factor ${t.socialSecurity.factor.toFixed(3)} for claiming at ${t.socialSecurity.claimingAgeYears}.`, `Policy band: ${percent(likelyBand.socialSecurityPolicy * 100)} of the scheduled benefit in the likely band.`])),
            }),
          ],
          toggleButton(nominal ? "Showing future dollars" : "Show future dollars", nominal, (next) => { nominal = next; render(); }),
        ),
      tripwires: () => tripwiresSection(),
      rules: () => rulesSection(),
      flags: () => flagsSection(),
    };

    root.append(
      el(
        "div",
        { class: "screen-head" },
        el("h1", { class: "screen-title" }, "Your FI date"),
        toggleButton(rearranging ? "Done rearranging" : "Rearrange", rearranging, (next) => { rearranging = next; render(); }),
      ),
    );
    // M3 spec section 4: above the default material line, every result carries the rough-results label.
    const share = prefs().materialShare ?? MATERIALITY.lines.materialShareOfFiNumber.default;
    if (share > MATERIALITY.lines.materialShareOfFiNumber.default + 1e-9) root.append(gentleFlag(`Calculated at ${Math.round(share * 100)}% materiality. Results are rougher than usual.`));
    for (const id of order()) root.append(sections[id]());
    root.append(
      el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: ctx.goToEntry }, "Change my numbers"), el("button", { type: "button", class: "button button--quiet", onClick: () => reportProblem() }, "Something looks wrong?")),
      el("p", { class: "notice" }, "Money Rooms is educational software, not individualized financial, tax, or legal advice. Amounts are in today's dollars unless marked as future dollars. Results describe what the numbers show under the rules as verified; they are not recommendations."),
    );
  }

  // ---- Something looks wrong? (readiness, Upkeep: support) ----------------------
  /** A summary of the inputs' shape and the result, with no personal data, that the person can copy into a report. */
  function problemSummary(): string {
    const hh = ctx.household;
    const count = (a: { kind: string; rows?: unknown[] }) => (a.kind === "rows" ? (a.rows?.length ?? 0) : 0);
    const kinds = (rows: { confidence?: string }[]) => rows.map((r) => r.confidence ?? "?").join(",");
    const incomeRows = hh.self.income.kind === "rows" ? hh.self.income.rows : [];
    const spendingRows = hh.spending.kind === "rows" ? hh.spending.rows : [];
    const accountRows = hh.accounts.kind === "rows" ? hh.accounts.rows : [];
    const bands = (["best", "likely", "worst"] as const).map((b) => `${b}: ${result.bands[b].funded ? `age ${result.bands[b].fiAge}` : "not funded"}`).join("; ");
    const t = result.bands.likely.timeline;
    return [
      `Money Rooms ${pkg.version}, report prepared ${hh.asOf}`,
      `Plan date ${hh.asOf}; state ${hh.self.state?.value ?? "?"}; filing ${hh.self.filingStatus.value}; partner: ${hh.partner ? "yes" : "no"}; conventions ${t.conventions}`,
      `Income rows ${count(hh.self.income)} (kinds ${kinds(incomeRows.map((r) => r.grossAnnual))}); spending rows ${count(hh.spending)} (kinds ${kinds(spendingRows.map((r) => r.annual))}); accounts ${count(hh.accounts)} (${accountRows.map((a) => `${a.preset}:${a.balance.confidence}`).join(",")})`,
      `FI date by band: ${bands}`,
      `Assets at retirement (likely): ${t.assetsAtRetirement === null ? "not reached" : Math.round(t.assetsAtRetirement)}; lifetime taxes ${Math.round(t.lifetimeTaxes)}; estate ${Math.round(t.estate)}`,
      `Flags: ${[...new Set([...t.flags, ...t.rows.flatMap((r) => r.flags)])].join(" | ") || "none"}`,
      `Rules used: ${t.rulesUsed.map((r) => `${r.id}@${r.lastVerified ?? "unverified"}`).join(", ")}`,
      "No names, no dollar inputs, no account balances are included.",
    ].join("\n");
  }

  function reportProblem(): void {
    const summary = problemSummary();
    const text = el("textarea", { class: "input", rows: "10", readonly: "true", "aria-label": "Summary to copy" }, summary);
    const status = el("p", { class: "muted", "aria-live": "polite" }, "");
    const copy = el("button", { type: "button", class: "button", onClick: async () => {
      try {
        await navigator.clipboard.writeText(summary);
        status.textContent = "Copied. Nothing was sent anywhere.";
      } catch {
        text.focus();
        (text as HTMLTextAreaElement).select();
        status.textContent = "Select the text above and copy it.";
      }
    } }, "Copy the summary");
    ctx.drawer.open(
      "Something looks wrong?",
      el(
        "div",
        { class: "stack" },
        el("p", {}, "Thank you for looking closely. The summary below describes the shape of your numbers and what the engine produced, with no names, no dollar inputs, and no balances. Nothing is sent anywhere by this app."),
        el("p", {}, "To report it, copy the summary and paste it into a new issue at ", el("a", { href: "https://github.com/Sapphirestoneage/money-rooms/issues/new", target: "_blank", rel: "noopener" }, "github.com/Sapphirestoneage/money-rooms/issues"), ", or into a message to the maker, with a sentence on what looked wrong."),
        text,
        el("div", { class: "row-actions" }, copy),
        status,
      ),
    );
  }

  // ---- Progress history (docs/history-spec.md) ---------------------------------
  let confirmingClear = false;
  function progressSection(): HTMLElement {
    const history = ctx.household.history ?? [];
    const recent = history.slice(-8).reverse();
    const table = el(
      "div",
      { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Snapshots of your plan" },
      el(
        "table",
        { class: "history-table" },
        el("thead", {}, el("tr", {}, el("th", {}, "Date"), el("th", {}, "Likely FI age"), el("th", {}, "Net worth"), el("th", {}, "Savings rate"))),
        el("tbody", {}, ...recent.map((s) => el("tr", {}, el("td", {}, s.date), el("td", {}, s.fiAge.likely === null ? "Not funded" : String(s.fiAge.likely)), el("td", {}, dollars(s.netWorth)), el("td", {}, s.savingsRatePercent === null ? "" : percent(s.savingsRatePercent))))),
      ),
    );
    const clearControl = confirmingClear
      ? confirmPanel({
          sentence: "This removes every snapshot. Your numbers are not affected.",
          confirmLabel: "Clear history",
          cancelLabel: "Keep it",
          onConfirm: () => { confirmingClear = false; delete ctx.household.history; ctx.store.save(ctx.household); render(); },
          onCancel: () => { confirmingClear = false; render(); },
        })
      : el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { confirmingClear = true; render(); } }, "Clear history"));
    return sectionCard_("progress", [
      el("div", { class: "true-fi__row" }, el("p", {}, trendSentence(history)), kindBadge("computed")),
      el("p", { class: "muted" }, "One snapshot a day, taken when this screen runs, kept with your numbers in this browser and in your export."),
      recent.length ? table : null,
      history.length ? clearControl : null,
    ]);
  }

  // ---- True FI (spec section 9) ------------------------------------------------
  function trueFiSection(): HTMLElement {
    const items = drawdownUnlockItems(ctx.household);
    const revealed = prefs().trueFiRevealed === true;
    const body: (HTMLElement | null)[] = [];
    if (items.length) {
      const minutes = items.reduce((s, i) => s + i.minutes, 0);
      body.push(
        el("p", {}, `Your True FI number unlocks after ${items.length} more ${items.length === 1 ? "question" : "questions"} (about ${minutes} ${minutes === 1 ? "minute" : "minutes"}).`),
        el("ul", { class: "unlock-list" }, ...items.map((i) => el("li", {}, el("a", { href: "#/entry", onClick: (e: Event) => { e.preventDefault(); ctx.goToEntry(); } }, i.label)))),
        el("p", { class: "muted" }, "The True FI number depends on how your money comes out, so it waits for those details rather than showing a guess as an answer."),
      );
      return sectionCard_("trueFi", body, el("span", { class: "lock-badge" }, "Locked"));
    }
    if (!optimized) {
      if (!working) optimize_();
      body.push(el("p", { class: "muted", "data-optimizer-stage": "true", "aria-live": "polite" }, stage ? STAGE_TEXT[stage] : "Working out your True FI number..."));
      return sectionCard_("trueFi", body);
    }
    const band = likelyBand;
    const workingOn = runFor(requireComplete(ctx.household), band, defaultDeps(), Infinity);
    const n = fiNumbers(ctx.household, optimized, workingOn);
    const strategies = strategiesUsed(optimized.best.policy, optimized.best.result.timeline);
    const yearsText = n.differenceYears === null ? "" : n.differenceYears > 0 ? `${yearWord(n.differenceYears)} sooner` : n.differenceYears < 0 ? `${yearWord(-n.differenceYears)} later` : "the same year";
    const dollarsText = n.differenceDollars === null ? "" : `${dollars(Math.abs(n.differenceDollars))} ${n.differenceDollars < 0 ? "less" : "more"}`;
    const numberNode = el("div", { class: "true-fi__number", "aria-live": "polite" }, n.netFi === null ? "Not funded" : dollars(n.netFi));
    body.push(
      el("p", { class: "muted" }, `The 4% rule says you need ${dollars(n.grossFi)} (25 times your ${dollars(n.annualSpending)} a year of spending).`),
      el("div", { class: "true-fi__row" }, numberNode, kindBadge("computed")),
      n.netFi === null
        ? el("p", {}, "With the plan below, the likely band is never fully funded, so there is no True FI number yet.")
        : el("p", { class: "true-fi__difference" }, `With the plan below, ${dollars(n.netFi)} is enough: ${dollarsText}${yearsText ? `, about ${yearsText}` : ""}. Doing the homework is worth ${yearsText || "the difference"}${n.differenceDollars !== null && n.differenceDollars < 0 ? ` and ${dollars(-n.differenceDollars)}` : ""}.`),
      strategies.length ? el("p", {}, el("span", { class: "muted" }, "Top strategies: "), strategies.slice(0, 3).join(", ")) : null,
      el(
        "div",
        { class: "row-actions" },
        el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { savePrefs({ trueFiRevealed: false }); animateReveal(numberNode, n.grossFi, n.netFi); } }, revealed ? "Replay the reveal" : "Reveal"),
        el("button", { type: "button", class: "button button--quiet button--small", onClick: () => shareCard(n.differenceYears, strategies) }, "Share card"),
      ),
    );
    if (!revealed && !revealing && n.netFi !== null) {
      revealing = true;
      window.setTimeout(() => animateReveal(numberNode, n.grossFi, n.netFi), 50);
    }
    return sectionCard_("trueFi", body);
  }

  /** The number animates from the FI number to the True FI number, then lands. Instant when motion is reduced. */
  function animateReveal(node: HTMLElement, from: number, to: number | null): void {
    if (to === null) return;
    const done = () => {
      node.textContent = dollars(to);
      savePrefs({ trueFiRevealed: true });
      revealing = false;
    };
    if (reducedMotion()) {
      done();
      return;
    }
    const start = performance.now();
    const duration = 1600;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = dollars(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
      else done();
    };
    node.textContent = dollars(from);
    requestAnimationFrame(step);
  }

  /** Years gained and the strategies used. No balances or dollar amounts unless turned on. */
  function shareCard(years: number | null, strategies: string[]): void {
    let withDollars = false;
    const body = () => {
      const lines = [years === null ? "A plan with a True FI number" : years > 0 ? `${yearWord(years)} sooner with a plan` : "A plan that shows the real number", strategies.length ? `Strategies: ${strategies.join(", ")}` : "No extra strategies needed", "Money Rooms, Stress Less About Money"];
      if (withDollars && optimized?.best.result.timeline.assetsAtRetirement) lines.splice(1, 0, `True FI number: ${dollars(optimized.best.result.timeline.assetsAtRetirement)}`);
      const card = el("div", { class: "share-card" }, ...lines.map((l) => el("p", {}, l)));
      return el("div", { class: "stack" }, card, toggleButton(withDollars ? "Showing dollar amounts" : "Show dollar amounts", withDollars, (next) => { withDollars = next; ctx.drawer.open("Share card", body()); }), el("p", { class: "muted" }, "Dollar amounts stay off unless you turn them on."));
    };
    ctx.drawer.open("Share card", body());
  }

  // ---- The plan and the strategies --------------------------------------------
  function objectivePicker(): HTMLElement {
    const sel = el("select", { class: "select", "aria-label": "What to optimize for" });
    for (const o of OBJECTIVES) sel.append(el("option", { value: o, selected: o === objective }, OBJECTIVE_QUESTION[o]));
    sel.addEventListener("change", () => {
      objective = sel.value as Objective;
      savePrefs({ objective });
      optimized = null;
      toggles = null;
      stress = null;
      render();
    });
    return sel;
  }

  function planSection(): HTMLElement {
    const body: (HTMLElement | null)[] = [el("div", { class: "field" }, el("label", {}, "Optimize for"), objectivePicker())];
    if (!optimized) {
      if (!working) optimize_();
      body.push(el("p", { class: "muted" }, stage ? STAGE_TEXT[stage] : "Working out the plan..."));
      return sectionCard_("plan", body);
    }
    const best = optimized.best;
    const steps = planSteps(best.result.timeline, best.policy);
    const headline =
      optimized.objective === "earliestFi"
        ? best.result.fiAge === null ? "Never fully funded in the likely band." : `Earliest FI in the likely band: age ${best.result.fiAge} (${best.result.retirementYear}).`
        : optimized.objective === "mostSpending"
          ? `Sustainable spending: about ${dollars(best.sustainableSpending ?? 0)} a year, retiring in ${optimized.retirementYear}.`
          : optimized.objective === "leastLifetimeTax"
            ? `Lifetime taxes: ${dollars(best.headline)}, down from ${dollars(optimized.baseline.headline)} with no strategies.`
            : `Estate after heirs' taxes: ${dollars(best.headline)}, up from ${dollars(optimized.baseline.headline)} with no strategies.`;
    body.push(
      el("p", {}, headline, " ", kindBadge("computed")),
      el(
        "ol",
        { class: "plan-steps" },
        ...steps.map((s) => el("li", {}, el("strong", {}, s.fromAge === s.toAge ? `Age ${s.fromAge}` : `Ages ${s.fromAge} to ${s.toAge}`), el("span", {}, " ", s.lines.join(" ")))),
      ),
      el("p", { class: "muted" }, `The search tried ${optimized.evaluations} full projections of your plan and kept the best one by this objective.`),
    );
    return sectionCard_("plan", body);
  }

  function strategiesSection(): HTMLElement {
    const body: (HTMLElement | null)[] = [];
    if (!optimized || !toggles) {
      if (!working) optimize_();
      body.push(el("p", { class: "muted" }, stage ? STAGE_TEXT[stage] : "Working out what each strategy is worth..."));
      return sectionCard_("strategies", body);
    }
    const on = toggles.filter((t) => t.on);
    if (!on.length) body.push(el("p", {}, "This plan needs no extra strategies: the conventional order does as well as anything else for this objective."));
    for (const tg of toggles) {
      const effect = tg.on
        ? `Off: FI date ${signedYears(tg.deltaYearsOff, { later: "later", sooner: "sooner" })}, lifetime taxes ${tg.deltaLifetimeTaxesOff >= 0 ? "up" : "down"} ${dollarsShort(Math.abs(tg.deltaLifetimeTaxesOff))}, estate after heirs' taxes ${tg.deltaEstateOff >= 0 ? "up" : "down"} ${dollarsShort(Math.abs(tg.deltaEstateOff))}.`
        : "Not in this plan.";
      body.push(el("div", { class: "strategy-row" }, el("div", { class: "strategy-row__name" }, el("span", { class: `strategy-row__state${tg.on ? " strategy-row__state--on" : ""}` }, tg.on ? "On" : "Off"), tg.label), el("div", { class: "strategy-row__effect" }, effect)));
    }
    body.push(el("p", { class: "muted" }, "Each line reruns the whole plan with that strategy turned off. Years come from a fresh search for the FI date; dollars hold the retirement year fixed."));
    return sectionCard_("strategies", body);
  }

  // ---- Tripwires, rules, flags -------------------------------------------------
  function tripwiresSection(): HTMLElement {
    const body: (HTMLElement | null)[] = [];
    const r = optimized?.best.result ?? result.bands.likely;
    const flags = tripwireFlags(r);
    if (!flags.length) body.push(el("p", {}, "This plan does not lean on any rule that is sunsetting or under watch."));
    for (const f of flags) body.push(gentleFlag(f.sentence));
    if (stress) {
      body.push(
        el("h3", { class: "card__subtitle" }, "Stress test"),
        el("ul", { class: "stress-list" }, ...stress.map((c) => el("li", {}, el("span", {}, c.label), el("span", { class: "trace-effect" }, c.funded ? `FI date ${signedYears(c.deltaYears, { later: "later", sooner: "sooner" })}; estate after heirs' taxes ${c.deltaEstate >= 0 ? "down" : "up"} ${dollarsShort(Math.abs(c.deltaEstate))}` : "not funded")))),
        el("p", { class: "muted" }, "Each case reruns the plan as if the rule changed."),
      );
    } else if (working) body.push(el("p", { class: "muted" }, "Running the stress test..."));
    return sectionCard_("tripwires", body);
  }

  function rulesSection(): HTMLElement {
    const r = optimized?.best.result ?? result.bands.likely;
    const rules = r.timeline.rulesUsed;
    return sectionCard_("rules", [
      el("p", { class: "muted" }, "Every rule the plan read, with its source and the date it was last checked against that source."),
      el("ul", { class: "rules-list" }, ...rules.map((x) => el("li", {}, x.url ? el("a", { href: x.url, target: "_blank", rel: "noopener" }, x.name) : el("span", {}, x.name), el("span", { class: "rules-list__meta" }, `${x.source}. Verified ${x.lastVerified ?? "not yet"}. ${x.status}.`)))),
    ]);
  }

  function flagsSection(): HTMLElement {
    const t = (optimized?.best.result ?? result.bands.likely).timeline;
    const flags = [...new Set([...t.flags, ...t.rows.flatMap((r) => r.flags)])].slice(0, 10);
    const notConfirmed = unconfirmedIncome(ctx.household);
    return sectionCard_("flags", [
      notConfirmed.length ? gentleFlag(`Includes income not yet confirmed: ${notConfirmed.join(", ")}.`, { label: "Change my numbers", onClick: ctx.goToEntry }) : null,
      ...(flags.length ? flags.map((f) => gentleFlag(f)) : [el("p", {}, "Nothing to flag.")]),
    ]);
  }

  /** A card for a section, with the rearrange controls when they are on. */
  function sectionCard_(id: SectionId, body: (HTMLElement | null)[], titleExtra?: HTMLElement | null): HTMLElement {
    const o = order();
    const i = o.indexOf(id);
    const controls = rearranging
      ? el(
          "div",
          { class: "section-order", role: "group", "aria-label": `Move ${SECTION_TITLE[id]}` },
          el("button", { type: "button", class: "button button--quiet button--small", disabled: i === 0, onClick: () => move(id, -1), "aria-label": `Move ${SECTION_TITLE[id]} up` }, "Up"),
          el("button", { type: "button", class: "button button--quiet button--small", disabled: i === o.length - 1, onClick: () => move(id, 1), "aria-label": `Move ${SECTION_TITLE[id]} down` }, "Down"),
        )
      : null;
    return el("section", { class: "card", "aria-label": SECTION_TITLE[id] }, el("div", { class: "card__title" }, el("h2", {}, SECTION_TITLE[id]), titleExtra ?? null, controls), ...body);
  }

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
