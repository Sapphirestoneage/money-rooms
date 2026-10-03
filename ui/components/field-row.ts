/**
 * Field row (design system 5): one label, one value, one kind badge.
 * Tapping the value opens whatever the caller wants (an editor, or a trace).
 */

import type { Confidence } from "../../engine";
import { el } from "../dom";
import { kindBadge } from "./kind-badge";

export interface FieldRowOptions {
  label: string;
  value: string;
  kind: Confidence;
  help?: string;
  onTapValue?: () => void;
  onKindChange?: (next: Confidence) => void;
}

export function fieldRow(o: FieldRowOptions): HTMLElement {
  const valueNode = o.onTapValue
    ? el("button", { type: "button", class: "value-button", onClick: o.onTapValue, "aria-label": `${o.label}: ${o.value}. Tap for details.` }, o.value)
    : el("span", {}, o.value);
  const badge = o.onKindChange
    ? kindBadge(o.kind, { cycle: ["known", "roughly", "lookUp"], onChange: o.onKindChange })
    : kindBadge(o.kind);
  return el(
    "div",
    { class: "field-row" },
    el("div", { class: "field-row__label" }, o.label),
    el("div", { class: "field-row__value" }, valueNode, badge),
    o.help ? el("div", { class: "field-row__help" }, o.help) : null,
  );
}
