/**
 * Group header (design system 5): a small heading over a group of rows, with
 * the group's count and subtotal on the right. The numbers come from the engine.
 */

import { el } from "../dom";

export function groupHeader(label: string, count: number, subtotal: string): HTMLElement {
  return el(
    "h3",
    { class: "group-header" },
    el("span", { class: "group-header__label" }, label),
    el("span", { class: "group-header__total" }, el("span", { class: "visually-hidden" }, ": "), `${count} ${count === 1 ? "item" : "items"}, ${subtotal}`),
  );
}
