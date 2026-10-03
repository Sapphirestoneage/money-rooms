/**
 * Confirm panel (design system 5): shown inline before anything replaces or
 * removes the person's data. One sentence, the action in its own words, and a way out.
 */

import { el } from "../dom";

export interface ConfirmPanelOptions {
  sentence: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function confirmPanel(o: ConfirmPanelOptions): HTMLElement {
  const confirm = el("button", { type: "button", class: "button", onClick: o.onConfirm }, o.confirmLabel);
  const panel = el(
    "div",
    { class: "confirm-panel", role: "group", "aria-label": "Please confirm" },
    el("p", {}, o.sentence),
    el("div", { class: "row-actions" }, confirm, el("button", { type: "button", class: "button button--quiet", onClick: o.onCancel }, o.cancelLabel)),
  );
  // Move focus to the choice once the panel is on the page.
  window.setTimeout(() => confirm.focus(), 0);
  return panel;
}
