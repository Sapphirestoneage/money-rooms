/**
 * Collapsible section (design system 5): a section of the entry screen with a
 * header that opens and closes it. The header is a real button inside the
 * heading, with aria-expanded, and always shows the section's summary line.
 * Closing a section hides its body. Nothing is removed.
 */

import { el } from "../dom";

export interface CollapsibleSectionOptions {
  /** Stable id, used for the body's element id and for keeping focus across refreshes. */
  id: string;
  title: string;
  /** One line: "7 items, $35,829, 2 rough". */
  summary: string;
  /** Shows a checkmark after the summary. */
  complete: boolean;
  open: boolean;
  onToggle(): void;
  body: (HTMLElement | null)[];
}

export function collapsibleSection(o: CollapsibleSectionOptions): HTMLElement {
  const bodyId = `section-body-${o.id}`;
  const button = el(
    "button",
    { type: "button", class: "section-header", "aria-expanded": String(o.open), "aria-controls": bodyId, onClick: o.onToggle },
    el("span", { class: "section-header__caret", "aria-hidden": "true" }, "▸"),
    el(
      "span",
      { class: "section-header__text" },
      el("span", { class: "section-header__title" }, o.title),
      el(
        "span",
        { class: "section-header__summary" },
        el("span", { class: "visually-hidden" }, ": "),
        o.summary,
        o.complete ? el("span", { class: "section-header__check" }, el("span", { "aria-hidden": "true" }, " ✓"), el("span", { class: "visually-hidden" }, ", complete")) : null,
      ),
    ),
  );
  button.dataset.key = `section:${o.id}`;
  const body = el("div", { id: bodyId, class: "section-body" }, ...o.body);
  body.hidden = !o.open;
  return el("section", { class: `card card--section${o.open ? " card--section-open" : ""}` }, el("h2", { class: "section-heading" }, button), body);
}
