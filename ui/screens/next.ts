/**
 * What's next (docs/m3-spec.md): the next card (one big, two small), the
 * Refresh card, the Rough numbers card, level progress, the Small wins tab,
 * and the Sky with its outline. Reads the engine. Never calculates: every
 * value, rank, and total comes from engine/flow.
 */

import {
  MATERIALITY,
  agedValues,
  findSkyNode,
  levelsPassed,
  materialityReport,
  missingLevelOneAnswers,
  nextCard,
  project,
  refreshMinutes,
  skyOutline,
  skyTree,
  smallWins,
  smallWinsTotal,
  worthSharpening,
  type AgedValue,
  type Household,
  type MaterialityReport,
  type SkyNode,
  type ValuedItem,
  type WinState,
} from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { kindBadge } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import type { Drawer } from "../components/trace-drawer";
import { clear, el, svg } from "../dom";
import { dollars, dollarsShort, monthWord } from "../format";
import { activeModule } from "../modules/index";
import type { Store } from "../store";

export interface NextContext {
  household: Household;
  store: Store;
  save(): void;
  goToEntry(): void;
  goToResult(): void;
  drawer: Drawer;
}

type Tab = "next" | "wins" | "sky";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const minutes = (n: number) => `${n} ${n === 1 ? "minute" : "minutes"}`;

export function nextScreen(ctx: NextContext): HTMLElement {
  const root = el("div", {});
  const h = () => ctx.household;
  const prefs = () => ctx.store.loadPrefs();
  const savePrefs = (patch: Partial<ReturnType<Store["loadPrefs"]>>) => ctx.store.savePrefs({ ...prefs(), ...patch });
  let tab: Tab = window.location.hash === "#/next/wins" ? "wins" : window.location.hash === "#/next/sky" ? "sky" : "next";
  let report: MaterialityReport | null = null;
  let working = false;
  let fiLabel = "Your FI date";
  let skyPath: string[] = [];
  let skyOutlineMode = false;
  let sinceLastTime: string | null = null;

  const complete = () => missingLevelOneAnswers(h()).length === 0;
  const materialShare = () => prefs().materialShare ?? MATERIALITY.lines.materialShareOfFiNumber.default;

  /** The materiality engine runs after the screen is on the page: about two projections per input. */
  const compute = () => {
    if (working || !complete()) return;
    working = true;
    window.setTimeout(() => {
      try {
        report = materialityReport(h(), { materialShare: materialShare() });
        const likely = project(h()).bands.likely;
        fiLabel = likely.fiAge === null ? "No date yet" : `FI at ${likely.fiAge}`;
        const last = prefs().lastRefreshFiYear;
        if (last !== undefined && likely.retirementYear !== null && last !== likely.retirementYear) {
          const diff = likely.retirementYear - last;
          sinceLastTime = `Your FI date moved ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "year" : "years"} ${diff < 0 ? "sooner" : "later"} since last time.`;
        }
      } catch {
        report = null;
      }
      working = false;
      render();
    }, 30);
  };

  const goTo = (t: Tab) => {
    tab = t;
    window.location.hash = t === "next" ? "#/next" : `#/next/${t}`;
    render();
  };

  const winsOn = () => activeModule("small-wins", ctx);
  function render(): void {
    clear(root);
    if (tab === "wins" && !winsOn()) tab = "next";
    const tabs = el(
      "div",
      { class: "tabs", role: "tablist", "aria-label": "What's next" },
      ...(["next", "wins", "sky"] as Tab[]).filter((t) => t !== "wins" || winsOn()).map((t) =>
        el("button", { type: "button", role: "tab", class: `tab${t === tab ? " tab--active" : ""}`, "aria-selected": t === tab ? "true" : "false", onClick: () => goTo(t) }, t === "next" ? "Next" : t === "wins" ? "Small wins" : "The Sky"),
      ),
    );
    root.append(el("h1", { class: "screen-title" }, "What's next"), tabs);
    if (tab === "next") root.append(...nextTab());
    else if (tab === "wins") root.append(...winsTab());
    else root.append(skyTab());
  }

  // ---- Next tab ------------------------------------------------------------
  function nextTab(): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (!complete()) {
      const card = nextCard(h(), null);
      out.push(levelProgress(null), bigCard(card.big), ...card.small.map(smallCard));
      return out;
    }
    if (!report) {
      if (!working) compute();
      out.push(el("p", { class: "muted" }, "Measuring what matters most..."));
      return out;
    }
    const card = nextCard(h(), report);
    const aged = agedValues(h(), h().asOf);
    out.push(levelProgress(report));
    if (sinceLastTime) out.push(gentleFlag(sinceLastTime));
    if (report.lines.roughResults) out.push(gentleFlag(`Calculated at ${Math.round(report.lines.materialShare * 100)}% materiality. Results are rougher than usual.`));
    out.push(bigCard(card.big), ...card.small.map(smallCard));
    if (aged.length) out.push(refreshCard(aged));
    const rough = worthSharpening(report);
    const allRough = report.sensitivities.filter((s) => s.kind !== "known");
    if (allRough.length) out.push(roughCard(allRough, rough));
    const wins = smallWins(h(), h().smallWins ?? {});
    const total = smallWinsTotal(wins, report.fiNumber !== null ? report.lines.materialShare * report.fiNumber : null, report.dollarsPerMonth);
    if (total.promote && winsOn()) out.push(el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Your small wins add up")), el("p", {}, `The open small wins add up to about ${dollars(total.openAnnual)} a year. Worth an evening?`), el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: () => goTo("wins") }, "Open small wins"))));
    out.push(settingsCard());
    return out;
  }

  function levelProgress(r: MaterialityReport | null): HTMLElement {
    const passed = levelsPassed(h(), r);
    const current = [1, 2, 3, 4, 5].find((l) => !passed.includes(l)) ?? 5;
    const coverage = r ? Math.round(r.coverage * 100) : complete() ? 100 : 0;
    const names: Record<number, string> = { 1: "Basics", 2: "Resilience", 3: "Life plans", 4: "Optimize and draw down", 5: "Legacy" };
    return el(
      "section",
      { class: "card level-progress", "aria-label": "Level progress" },
      el("div", { class: "card__title" }, el("h2", {}, `Level ${current}: ${names[current]}`)),
      el("p", {}, complete() ? (r ? `You've covered ${coverage}% of what matters.` : "Measuring what matters...") : "Five answers give you a first FI date."),
      el("div", { class: "progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": coverage, "aria-label": "Share of what matters that is covered" }, el("div", { class: "progress__fill", style: `width:${coverage}%` })),
      el("p", { class: "muted" }, `Levels passed: ${passed.length ? passed.join(", ") : "none yet"}. Levels are never locked; the next card suggests the best order.`),
    );
  }

  function itemLines(i: ValuedItem): HTMLElement {
    const value = i.valueDollars >= 100 ? `Worth ${dollarsShort(i.valueDollars)}${i.valueMonths !== null && i.valueMonths >= 1 ? ` (about ${monthWord(Math.round(i.valueMonths))})` : ""}` : "Small value";
    return el("p", { class: "muted" }, `${value}. About ${minutes(i.effortMinutes)}. ${i.why}${i.whereToFind ? ` ${i.whereToFind}.` : ""}`);
  }

  function bigCard(i: ValuedItem | null): HTMLElement {
    if (!i) return el("section", { class: "card" }, el("div", { class: "card__title" }, el("h2", {}, "Nothing to do right now")), el("p", {}, "Everything material is in. Come back when a number changes, or try the Small wins tab."));
    return el(
      "section",
      { class: "card next-card next-card--big" },
      el("div", { class: "next-card__kicker" }, "Next"),
      el("h2", {}, i.sentence.length > 30 && i.sharpens ? i.sentence : i.why),
      itemLines(i),
      el("div", { class: "row-actions" }, el("button", { type: "button", class: "button", onClick: () => openItem(i) }, i.type === "question" ? "Answer it" : "Look at it")),
    );
  }

  function smallCard(i: ValuedItem): HTMLElement {
    return el("section", { class: "card next-card" }, el("h3", { class: "next-card__title" }, i.sharpens ? i.sentence : i.why), itemLines(i), el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => openItem(i) }, "Open")));
  }

  function openItem(i: ValuedItem): void {
    if (i.id === "m.optimizer") ctx.goToResult();
    else ctx.goToEntry();
  }

  function refreshCard(aged: AgedValue[]): HTMLElement {
    let open = false;
    const card = el("section", { class: "card" });
    const draw = () => {
      clear(card);
      const names = aged.slice(0, 4).map((v) => `${v.label} (${v.ageMonths} ${v.ageMonths === 1 ? "month" : "months"} old)`).join(", ");
      card.append(
        el("div", { class: "card__title" }, el("h2", {}, `${aged.length} ${aged.length === 1 ? "number has" : "numbers have"} aged`)),
        el("p", {}, `${names}${aged.length > 4 ? ", and more" : ""}. About ${minutes(refreshMinutes(aged))}.`),
        el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", "aria-expanded": String(open), onClick: () => { open = !open; draw(); } }, open ? "Close" : "Check them")),
      );
      if (!open) return;
      const list = el("ul", { class: "aged-list" });
      for (const v of aged) {
        list.append(
          el(
            "li",
            {},
            el("div", {}, el("strong", {}, v.label), el("span", { class: "muted" }, ` ${dollars(v.value)}, ${v.ageMonths} ${v.ageMonths === 1 ? "month" : "months"} old, due ${v.nextCheck}`)),
            el(
              "div",
              { class: "row-actions" },
              el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { v.confirm(h(), h().asOf); afterConfirm(); } }, "Still right"),
              el("button", { type: "button", class: "button button--quiet button--small", onClick: ctx.goToEntry }, "Update it"),
            ),
          ),
        );
      }
      card.append(list, el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { for (const v of aged) v.confirm(h(), h().asOf); afterConfirm(); } }, "Confirm all that haven't changed")));
    };
    draw();
    return card;
  }

  function afterConfirm(): void {
    ctx.save();
    const likely = project(h()).bands.likely;
    if (likely.retirementYear !== null) savePrefs({ lastRefreshFiYear: likely.retirementYear });
    report = null;
    render();
  }

  function roughCard(all: MaterialityReport["sensitivities"], worth: MaterialityReport["sensitivities"]): HTMLElement {
    let open = false;
    const card = el("section", { class: "card" });
    const total = all.reduce((s, x) => s + x.dollarsAtStake, 0);
    const draw = () => {
      clear(card);
      let running = 0;
      let top3 = 0;
      for (const [i, s] of all.entries()) if (i < 3) top3 += s.dollarsAtStake;
      card.append(
        el("div", { class: "card__title" }, el("h2", {}, `${all.length} ${all.length === 1 ? "number is" : "numbers are"} rough`)),
        el("p", {}, total > 0 ? `Sharpening the top ${Math.min(3, all.length)} covers ${Math.round((top3 / total) * 100)}% of what's at stake. About ${minutes(Math.min(3, all.length) * 2)}.` : "None of them moves the result much."),
        el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", "aria-expanded": String(open), onClick: () => { open = !open; draw(); } }, open ? "Close" : "See them")),
      );
      if (!open) return;
      const list = el("ul", { class: "aged-list" });
      for (const s of all) {
        running += s.dollarsAtStake;
        const share = total > 0 ? Math.round((running / total) * 100) : 100;
        list.append(
          el(
            "li",
            {},
            el("div", {}, el("strong", {}, s.label), " ", kindBadge(s.kind === "default" ? "roughly" : s.kind), el("span", { class: "muted" }, ` could move your FI number by ${dollarsShort(s.dollarsAtStake)}${s.monthsAtStake >= 1 ? ` (about ${monthWord(Math.round(s.monthsAtStake))})` : ""}${s.material ? "" : ", under the material line"}`)),
            el("div", { class: "progress progress--small", "aria-hidden": "true" }, el("div", { class: "progress__fill", style: `width:${share}%` })),
            el("div", { class: "muted" }, `${share}% of the uncertainty cleared once this one is sharpened`),
          ),
        );
      }
      card.append(list, el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: ctx.goToEntry }, "Sharpen them")), el("p", { class: "muted" }, `${worth.length} of these are above the material and worth-it lines.`));
    };
    draw();
    return card;
  }

  function settingsCard(): HTMLElement {
    const current = Math.round(materialShare() * 100);
    const input = el("input", { class: "input", type: "number", min: MATERIALITY.lines.materialShareOfFiNumber.min * 100, max: MATERIALITY.lines.materialShareOfFiNumber.max * 100, step: 1, value: current, id: "material-share" });
    input.addEventListener("change", () => {
      const v = Number(input.value) / 100;
      savePrefs({ materialShare: Math.min(MATERIALITY.lines.materialShareOfFiNumber.max, Math.max(MATERIALITY.lines.materialShareOfFiNumber.min, v)) });
      report = null;
      render();
    });
    return el(
      "details",
      { class: "card" },
      el("summary", { class: "card__summary" }, el("h2", {}, "Settings")),
      el("div", { class: "field card__details-body" }, el("label", { for: "material-share" }, "Materiality (percent of your FI number)"), input, el("p", { class: "field__help" }, `A question is material if its plausible range moves your FI number by at least this share. Default ${MATERIALITY.lines.materialShareOfFiNumber.default * 100}%. Above that, results carry a label saying they are rougher than usual.`)),
    );
  }

  // ---- Small wins tab -----------------------------------------------------------
  function winsTab(): HTMLElement[] {
    const states = h().smallWins ?? {};
    const wins = smallWins(h(), states);
    const total = smallWinsTotal(wins, report && report.fiNumber !== null ? report.lines.materialShare * report.fiNumber : null, report?.dollarsPerMonth ?? null);
    const open = wins.filter((w) => w.state === "open");
    const later = wins.filter((w) => w.state === "later");
    const setState = (id: string, s: WinState) => {
      const next = { ...(h().smallWins ?? {}) };
      if (s === "open") delete next[id];
      else next[id] = s;
      h().smallWins = next;
      ctx.save();
      render();
    };
    const out: HTMLElement[] = [
      el(
        "section",
        { class: "card wins-total", "aria-live": "polite" },
        el("div", { class: "card__title" }, el("h2", {}, `${total.doneCount} small ${total.doneCount === 1 ? "win" : "wins"}`)),
        el("p", { class: "wins-total__number" }, `${dollars(total.doneAnnual)} a year${total.doneMonths !== null && total.doneMonths >= 1 ? `, about ${monthWord(Math.round(total.doneMonths))} sooner` : ""}`),
        el("p", { class: "muted" }, "Every value is a range and an estimate, at the midpoint. One small item doesn't matter; fifteen do."),
      ),
    ];
    const next = open[0] ?? later[0];
    if (next) {
      out.push(
        el(
          "section",
          { class: "card next-card next-card--big" },
          el("div", { class: "next-card__kicker" }, next.categoryLabel),
          el("h2", {}, next.title),
          el("p", { class: "muted" }, `About ${dollars(next.estimate[0])} to ${dollars(next.estimate[1])} a year. About ${minutes(next.minutes)}.${next.note ? ` ${next.note}` : ""}`),
          el(
            "div",
            { class: "row-actions" },
            el("button", { type: "button", class: "button", onClick: () => setState(next.id, "done") }, "Done"),
            el("button", { type: "button", class: "button button--quiet", onClick: () => setState(next.id, "notForMe") }, "Not for me"),
            el("button", { type: "button", class: "button button--quiet", onClick: () => setState(next.id, "later") }, "Later"),
          ),
          el("p", { class: "muted" }, `${open.length} to go${later.length ? `, ${later.length} for later` : ""}.`),
        ),
      );
    } else out.push(el("section", { class: "card" }, el("p", {}, "You've been through every small win. New ones appear as the list grows.")));
    const done = wins.filter((w) => w.state !== "open");
    if (done.length) {
      out.push(
        el(
          "details",
          { class: "card" },
          el("summary", { class: "card__summary" }, el("h2", {}, "Already answered")),
          el("ul", { class: "aged-list card__details-body" }, ...done.map((w) => el("li", {}, el("div", {}, el("strong", {}, w.title), el("span", { class: "muted" }, ` ${w.state === "done" ? "Done" : w.state === "notForMe" ? "Not for me" : "Later"}, ${dollars((w.estimate[0] + w.estimate[1]) / 2)} a year`)), el("button", { type: "button", class: "button button--quiet button--small", onClick: () => setState(w.id, "open") }, "Reopen")))),
        ),
      );
    }
    return out;
  }

  // ---- The Sky ------------------------------------------------------------------
  function skyTab(): HTMLElement {
    if (complete() && !report && !working) compute();
    const tree = skyTree(h(), report, fiLabel);
    const card = el("section", { class: "card sky-card" });
    const current = skyPath.length ? findSkyNode(tree, skyPath[skyPath.length - 1]!) : { node: tree, trail: [tree] };
    const node = current?.node ?? tree;
    const trail = current?.trail ?? [tree];
    const crumbs = el(
      "nav",
      { class: "crumbs", "aria-label": "Where you are in the Sky" },
      ...trail.flatMap((n, i) => [
        i > 0 ? el("span", { class: "crumbs__sep", "aria-hidden": "true" }, " › ") : null,
        i === trail.length - 1 ? el("span", { "aria-current": "location" }, n.depth === 0 ? "Everything" : n.label) : el("button", { type: "button", class: "button button--text", onClick: () => { skyPath = trail.slice(1, i + 1).map((x) => x.id); render(); } }, n.depth === 0 ? "Everything" : n.label),
      ]),
    );
    card.append(
      el("div", { class: "card__title" }, el("h2", {}, "The Sky"), toggleButton(skyOutlineMode ? "Showing the outline" : "Show as an outline", skyOutlineMode, (next) => { skyOutlineMode = next; render(); })),
      crumbs,
    );
    if (skyOutlineMode) {
      card.append(outlineView(tree));
      return card;
    }
    card.append(circlesView(node), el("p", { class: "muted" }, "Tap a circle to zoom in. Fill shows coverage, the ring shows the kind, and size shows how much the number matters. Use the outline for a list you can read with a screen reader or keyboard."));
    if (node.depth === 2 || (node.depth === 1 && node.children.length === 0)) card.append(el("ul", { class: "sky-details" }, ...node.details.map((d) => el("li", {}, d))));
    return card;
  }

  function circlesView(node: SkyNode): HTMLElement {
    const size = Math.min(640, Math.max(300, root.clientWidth - 34));
    const cx = size / 2;
    const cy = size / 2;
    const children = node.children;
    const maxSize = Math.max(1, ...children.map((c) => c.size));
    const ringClass = (k: SkyNode["kind"]) => `sky-circle__ring sky-circle__ring--${k}`;
    const center = svg("g", { class: "sky-center" }, svg("circle", { cx, cy, r: size * 0.16, class: "sky-circle__center" }), svg("text", { x: cx, y: cy, class: "sky-circle__label sky-circle__label--center", "text-anchor": "middle", "dominant-baseline": "middle" }, node.depth === 0 ? node.label : node.label));
    const nodes = children.map((c, i) => {
      const angle = (i / Math.max(1, children.length)) * Math.PI * 2 - Math.PI / 2;
      const orbit = size * 0.36;
      const x = cx + Math.cos(angle) * orbit;
      const y = cy + Math.sin(angle) * orbit;
      const r = Math.max(22, size * (0.045 + 0.07 * Math.sqrt(c.size / maxSize)));
      const g = svg("g", { class: "sky-circle", tabindex: 0, role: "button", "aria-label": `${c.label}: ${Math.round(c.coverage * 100)}% covered, ${c.kind}. Zoom in.` },
        svg("circle", { cx: x, cy: y, r, class: ringClass(c.kind) }),
        svg("clipPath", { id: `clip-${c.id.replace(/[^a-z0-9]/gi, "-")}` }, svg("rect", { x: x - r, y: y + r - 2 * r * c.coverage, width: 2 * r, height: 2 * r * c.coverage })),
        svg("circle", { cx: x, cy: y, r: Math.max(0, r - 3), class: "sky-circle__fill", "clip-path": `url(#clip-${c.id.replace(/[^a-z0-9]/gi, "-")})` }),
        svg("text", { x, y: y + r + 14, class: "sky-circle__label", "text-anchor": "middle" }, c.label),
      );
      const zoom = () => { skyPath = [...skyPath, c.id]; render(); };
      g.addEventListener("click", zoom);
      g.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") { e.preventDefault(); zoom(); } });
      return g;
    });
    const picture = svg("svg", { class: `sky${reducedMotion() ? "" : " sky--animated"}`, viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: "group", "aria-label": `The Sky, zoomed to ${node.depth === 0 ? "everything" : node.label}` }, center, ...nodes);
    const back = skyPath.length ? el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { skyPath = skyPath.slice(0, -1); render(); } }, "Zoom out")) : null;
    return el("div", { class: "sky-wrap" }, picture, back);
  }

  function outlineView(tree: SkyNode): HTMLElement {
    const list = el("ul", { class: "sky-outline" });
    for (const { depth, node } of skyOutline(tree)) {
      list.append(el("li", { class: `sky-outline__item sky-outline__item--${depth}` }, el("span", { class: "sky-outline__label" }, depth === 0 ? "Everything" : node.label), " ", kindBadge(node.kind === "missing" ? "lookUp" : node.kind === "aged" ? "roughly" : node.kind), el("span", { class: "muted" }, ` ${Math.round(node.coverage * 100)}% covered`), node.details.length && depth === 2 ? el("div", { class: "muted" }, node.details.join(". ")) : null));
    }
    return list;
  }

  window.addEventListener("hashchange", () => {
    if (!root.isConnected) return;
    const t: Tab = window.location.hash === "#/next/wins" ? "wins" : window.location.hash === "#/next/sky" ? "sky" : "next";
    if (t !== tab) { tab = t; render(); }
  });
  render();
  return root;
}
