/**
 * Risk (docs/m6-spec.md): the return series and its status, the backtest at
 * the plan's own FI date, the worst starts, the sturdy FI date, guardrails,
 * and Flex FI. Reads the engine. Never calculates.
 */

import { SERIES_SOURCE, missingLevelOneAnswers, userValue, type Backtest, type Household } from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import type { Drawer } from "../components/trace-drawer";
import { clear, el } from "../dom";
import { dollars } from "../format";
import type { Store } from "../store";
import { nextJobId, runInEngineWorker } from "../workers/client";
import type { EngineStage, SturdyFiYear } from "../workers/engine.worker";

const STAGE_TEXT: Partial<Record<EngineStage, string>> = {
  fiDate: "Finding the plan's own FI date...",
  backtest: "Replaying the plan from every start year in history...",
  guardrails: "Replaying it with guardrails...",
  flex: "Replaying it with the Flex FI trim...",
  sturdy: "Searching for the sturdy FI date...",
  flexSturdy: "Searching for Flex FI...",
};

export interface RiskContext {
  household: Household;
  store: Store;
  save(): void;
  goToEntry(): void;
  drawer: Drawer;
}

export function riskScreen(ctx: RiskContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const complete = () => missingLevelOneAnswers(h()).length === 0;
  let fiYear: number | null = null;
  let fiAge: number | null = null;
  let plain: Backtest | null = null;
  let guard: Backtest | null = null;
  let flex: Backtest | null = null;
  let sturdy: SturdyFiYear | null = null;
  let flexSturdy: SturdyFiYear | null = null;
  let working = false;
  let computed = false;
  let failed: string | null = null;
  let stage: EngineStage | null = null;
  let jobId = 0;
  const threshold = () => h().risk?.successThresholdPercent?.value ?? 90;
  const trim = () => h().milestones?.flexFiTrimPercent?.value ?? 10;

  // The backtests and sturdy dates run in the engine worker (decision A3); the screen shows which stage is running.
  const compute = () => {
    if (working || failed || !complete()) return;
    working = true;
    jobId = nextJobId();
    runInEngineWorker({ id: jobId, kind: "backtests", household: structuredClone(h()), thresholdPercent: threshold(), trimPercent: trim(), minHistoryYears: 30 }, (m) => {
      if (m.id !== jobId) return;
      if ("stage" in m) {
        stage = m.stage;
        const note = root.querySelector("[data-risk-stage]");
        if (note) note.textContent = STAGE_TEXT[stage] ?? "Replaying the plan...";
        return;
      }
      if ("done" in m && m.kind === "backtests") {
        fiYear = m.fiYear;
        fiAge = m.fiAge;
        plain = m.plain;
        guard = m.guard;
        flex = m.flex;
        sturdy = m.sturdy;
        flexSturdy = m.flexSturdy;
        computed = true;
      } else {
        plain = null;
        failed = "error" in m ? m.error : "The replay did not finish.";
      }
      working = false;
      stage = null;
      render();
    });
  };
  const invalidate = () => { plain = null; guard = null; flex = null; sturdy = null; flexSturdy = null; computed = false; failed = null; ctx.save(); render(); };
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  function render(): void {
    clear(root);
    root.append(el("h1", { class: "screen-title" }, "Risk"), el("p", { class: "lede" }, "Everything else runs one path. Here the plan is replayed against every start year in history, so you can see how sure it is, and two ways to bend without breaking."));
    if (!complete()) {
      root.append(gentleFlag("A few answers are still needed before the plan can be replayed.", { label: "Go to your numbers", onClick: ctx.goToEntry }));
      return;
    }
    root.append(seriesCard());
    if (!plain) {
      if (failed) {
        root.append(gentleFlag(`The replay could not run: ${failed}`));
        return;
      }
      if (computed && fiYear === null) {
        root.append(el("p", { class: "muted" }, "The plan is not fully funded in the likely band, so there is no date to replay yet."));
        return;
      }
      if (!working) compute();
      root.append(el("p", { class: "muted", "data-risk-stage": "true", "aria-live": "polite" }, (stage && STAGE_TEXT[stage]) ?? "Replaying the plan from every start year in history..."));
      return;
    }
    root.append(backtestCard(), guardrailsCard(), flexCard(), settingsCard());
  }

  function seriesCard(): HTMLElement {
    return el(
      "section",
      { class: "card", "aria-label": "The return series" },
      el("div", { class: "card__title" }, el("h2", {}, "The return series")),
      el("p", {}, `Real returns on US stocks, bonds, and bills, ${SERIES_SOURCE.years[0]} to ${SERIES_SOURCE.years[1]}. Source: ${SERIES_SOURCE.source}. ${SERIES_SOURCE.lastVerified ? `Verified ${SERIES_SOURCE.lastVerified}.` : "Not yet verified against the source."}`),
      SERIES_SOURCE.unverified ? gentleFlag("The series has not been checked against its source yet, so every result on this screen is illustrative until it is.") : null,
    );
  }

  function startsList(b: Backtest): HTMLElement {
    const worst = b.worstStarts.slice(0, 6);
    return worst.length
      ? el("ul", { class: "aged-list" }, ...worst.map((s) => el("li", {}, `Retiring in ${fiYear} with ${s.startYear}'s markets ahead: the plan ran short at ${s.shortfallAge}.`)))
      : el("p", {}, "No start year in the series broke the plan.");
  }

  function backtestCard(): HTMLElement {
    const b = plain!;
    return el(
      "section",
      { class: "card", "aria-label": "Historical backtest" },
      el("div", { class: "card__title" }, el("h2", {}, `Your FI date, replayed: ${pct(b.successRate)} of starts hold`)),
      el("p", {}, `Retiring in ${fiYear} (age ${fiAge}), the plan stayed funded through plan-to age in ${b.starts.filter((s) => s.funded).length} of ${b.starts.length} start years. Median left at the end: ${dollars(b.medianEstate)}; worst: ${dollars(b.worstEstate)}. `, kindBadge("computed")),
      el("h3", { class: "card__subtitle" }, "The starts that broke it"),
      startsList(b),
      el("h3", { class: "card__subtitle" }, `The sturdy FI date (${threshold()}% of starts)`),
      el("p", {}, sturdy && sturdy.year !== null ? `Retiring in ${sturdy.year} (age ${sturdy.age}) holds in ${pct(sturdy.successRate!)} of starts${sturdy.year === fiYear ? ", the same year as your plan's own date" : `, ${sturdy.year - fiYear!} ${sturdy.year - fiYear! === 1 ? "year" : "years"} after your plan's own date`}.` : "No retirement year before plan-to age reaches the threshold."),
      ...b.flags.map((f) => gentleFlag(f)),
    );
  }

  function guardrailsCard(): HTMLElement {
    const g = guard!;
    const cuts = g.starts.filter((s) => s.lowestSpendingShare < 1).length;
    const lowest = Math.min(...g.starts.map((s) => s.lowestSpendingShare));
    return el(
      "section",
      { class: "card", "aria-label": "Guardrails spending" },
      el("div", { class: "card__title" }, el("h2", {}, `Guardrails spending: ${pct(g.successRate)} of starts hold`)),
      el("p", {}, `Cut spending 10% when the withdrawal rate rises above 1.2 times the starting rate; raise it 10% when it falls under 0.8 times; never below 60% of plan. ${cuts} of ${g.starts.length} starts needed a cut; the deepest took spending to ${pct(lowest)} of plan. `, kindBadge("computed")),
      el("p", { class: "muted" }, "Guyton-Klinger's rule, simplified to the two guardrails that matter most (M6 spec section 2.3)."),
    );
  }

  function flexCard(): HTMLElement {
    const f = flex!;
    return el(
      "section",
      { class: "card", "aria-label": "Flex FI" },
      el("div", { class: "card__title" }, el("h2", {}, `Flex FI: trim ${trim()}% in down years`)),
      el("p", {}, `With spending trimmed ${trim()}% in every year the market was down, retiring in ${fiYear} holds in ${pct(f.successRate)} of starts (${pct(plain!.successRate)} without the trim). `, kindBadge("computed")),
      el("p", {}, flexSturdy && flexSturdy.year !== null ? `Flex FI at the ${threshold()}% threshold: ${flexSturdy.year} (age ${flexSturdy.age})${sturdy && sturdy.year !== null ? `, against ${sturdy.year} without the trim` : ""}.` : "No retirement year reaches the threshold with the trim."),
    );
  }

  function settingsCard(): HTMLElement {
    const risk = () => (h().risk ??= {});
    const t = el("input", { class: "input", type: "number", min: 50, max: 100, step: 5, value: threshold(), id: "risk-threshold" });
    t.addEventListener("change", () => { const v = Number(t.value); if (v >= 50 && v <= 100) risk().successThresholdPercent = userValue(v, h().asOf); invalidate(); });
    const tr = el("input", { class: "input", type: "number", min: 0, max: 50, step: 5, value: trim(), id: "flex-trim" });
    tr.addEventListener("change", () => { const v = Number(tr.value); if (v >= 0 && v <= 50) (h().milestones ??= {}).flexFiTrimPercent = userValue(v, h().asOf); invalidate(); });
    return el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h2", {}, "Settings")),
      el("div", { class: "field-grid card__details-body" }, el("div", { class: "field" }, el("label", { for: "risk-threshold" }, "Success threshold (percent of starts)"), t), el("div", { class: "field" }, el("label", { for: "flex-trim" }, "Flex FI trim (percent)"), tr)),
      el("div", { class: "row-actions" }, toggleButton(h().risk?.guardrailsOn?.value ? "Guardrails on in the plan" : "Guardrails off in the plan", h().risk?.guardrailsOn?.value === true, (next) => { risk().guardrailsOn = userValue(next, h().asOf); ctx.save(); render(); })),
    );
  }

  render();
  return root;
}
