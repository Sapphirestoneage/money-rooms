/**
 * Gentle flag (design system 5): attention color, one plain sentence, one action.
 */

import { el } from "../dom";

export function gentleFlag(sentence: string, action?: { label: string; onClick: () => void }): HTMLElement {
  return el(
    "div",
    { class: "gentle-flag", role: "status" },
    el("span", { class: "gentle-flag__label" }, "Needs a look"),
    el("div", { class: "stack" }, el("div", {}, sentence), action ? el("button", { type: "button", class: "button button--quiet button--small", onClick: action.onClick }, action.label) : null),
  );
}
