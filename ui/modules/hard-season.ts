/**
 * Hard season (module data/modules/hard-season.json, beta; decision A15): the suggestion, the switch, and
 * the stability list that comes first while it is on. Reads the engine. The switch is a decision on the
 * household (dictionary 9.18), saved with the plan.
 */

import { hardSeasonView, userValue } from "../../engine";
import { kindBadge } from "../components/kind-badge";
import { toggleButton } from "../components/toggle-button";
import { el } from "../dom";
import { dollars } from "../format";
import type { ModuleContext } from "./index";

export function hardSeasonOn(ctx: Pick<ModuleContext, "household">): boolean {
  return ctx.household.hardSeason?.value === true;
}

/** The card for What's next: the suggestion when the numbers point to it, the stability list while it is on. Null when neither applies. */
export function hardSeasonCard(ctx: ModuleContext): HTMLElement | null {
  const h = ctx.household;
  const view = hardSeasonView(h);
  if (!view.on && !view.suggestion.suggested) return null;
  const toggle = toggleButton(view.on ? "Hard season is on" : "Turn hard season on", view.on, (next) => {
    h.hardSeason = userValue(next, h.asOf);
    ctx.save();
    window.location.reload();
  });
  const items = view.items.map((i, n) =>
    el("li", {}, el("strong", {}, `${n + 1}. ${i.label}`), el("span", {}, ` ${i.sentence}`), i.monthly !== null ? el("span", { class: "muted" }, ` About ${dollars(i.monthly)} a month.`) : null),
  );
  return el(
    "section",
    { class: "card", "aria-label": "Hard season" },
    el("div", { class: "card__title" }, el("h2", {}, view.on ? "Hard season: stability first" : "A hard season?"), el("span", { class: "lock-badge" }, "Beta")),
    view.on
      ? el("p", {}, "The plan's nudges are paused. Runway and the staircase come first; nothing here asks you to cut spending. ", kindBadge("computed"))
      : el("p", {}, "The numbers look heavy right now. Hard season mode puts stability first and pauses the rest; it is here if it helps, and it stays off unless you turn it on."),
    view.suggestion.reasons.length ? el("ul", { class: "aged-list" }, ...view.suggestion.reasons.map((r) => el("li", {}, r))) : null,
    view.on ? el("ol", { class: "plan-steps" }, ...items) : null,
    el("div", { class: "row-actions" }, toggle),
  );
}
