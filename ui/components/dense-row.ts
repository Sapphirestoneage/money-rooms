/**
 * Dense row (design system 5): one item shown as one line, name on the left and
 * its key number on the right, with its kind badge. A second, smaller line
 * appears only when there is something to say. Tapping the row opens its
 * fields in place; Done folds it back.
 */

import { el } from "../dom";

export interface DenseRowOptions {
  id: string;
  name: string;
  /** The key number, already formatted: "$5,000" or "$40/mo". */
  value: string;
  /** The key number's kind badge, or null when there is no number yet. */
  badge: HTMLElement | null;
  /** The second line, like "17%, $40/mo" or "starts Jan 2027". Left out when empty. */
  detail?: string;
  /** True when the row still needs an answer, so the value reads as a prompt. */
  needsAnswer?: boolean;
  onOpen(): void;
}

/** The row folded up: a button that opens it, and the badge beside it. */
export function denseRow(o: DenseRowOptions): HTMLElement {
  const main = el(
    "button",
    { type: "button", class: "dense-row__main", "aria-expanded": "false", "aria-label": `${o.name}, ${o.value}${o.detail ? `, ${o.detail}` : ""}. Edit`, onClick: o.onOpen },
    el("span", { class: "dense-row__line" }, el("span", { class: "dense-row__name" }, o.name), el("span", { class: `dense-row__value${o.needsAnswer ? " dense-row__value--needed" : ""}` }, o.value)),
    o.detail ? el("span", { class: "dense-row__detail" }, o.detail) : null,
  );
  main.dataset.key = `row:${o.id}`;
  return el("div", { class: "dense-row" }, main, o.badge);
}

export interface DenseRowEditorOptions {
  id: string;
  name: string;
  fields: HTMLElement[];
  /** Gentle flags about this item. */
  flags?: HTMLElement[];
  /** Other actions, shown after Done ("Remove"). */
  actions?: HTMLElement[];
  onDone(): void;
}

/** The row opened for editing: its fields, then Done and any other actions. */
export function denseRowEditor(o: DenseRowEditorOptions): HTMLElement {
  const done = el("button", { type: "button", class: "button", onClick: o.onDone }, "Done");
  const editor = el(
    "div",
    { class: "dense-row dense-row--open", role: "group", "aria-label": `Editing ${o.name}` },
    el("div", { class: "dense-row__editor-title" }, o.name),
    el("div", { class: "field-grid" }, ...o.fields),
    o.flags?.length ? el("div", { class: "stack" }, ...o.flags) : null,
    el("div", { class: "row-actions" }, done, ...(o.actions ?? [])),
  );
  editor.dataset.editor = o.id;
  return editor;
}
