/**
 * The drawer (design system 5). It opens from any computed number to list the
 * inputs that produced it, and from any kind badge to explain the kind.
 * One drawer is shared by the whole app.
 */

import type { FiTrace } from "../../engine";
import { clear, el } from "../dom";
import { yearWord } from "../format";

export interface Drawer {
  root: HTMLElement;
  backdrop: HTMLElement;
  open(title: string, body: HTMLElement): void;
  close(): void;
}

export function createDrawer(): Drawer {
  const titleNode = el("h2", { id: "drawer-title" });
  const bodyNode = el("div", { class: "stack" });
  const closeButton = el("button", { type: "button", class: "button button--quiet" }, "Close");
  const root = el(
    "aside",
    { class: "drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "drawer-title", hidden: true },
    el("div", { class: "drawer__inner" }, el("div", { class: "drawer__head" }, titleNode, closeButton), bodyNode),
  );
  const backdrop = el("div", { class: "drawer-backdrop", hidden: true });
  let returnFocus: HTMLElement | null = null;

  const drawer: Drawer = {
    root,
    backdrop,
    open(title, body) {
      if (root.hidden) returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      titleNode.textContent = title;
      clear(bodyNode);
      bodyNode.append(body);
      root.hidden = false;
      backdrop.hidden = false;
      closeButton.focus();
    },
    close() {
      if (root.hidden) return;
      root.hidden = true;
      backdrop.hidden = true;
      if (returnFocus?.isConnected) returnFocus.focus();
    },
  };
  closeButton.addEventListener("click", drawer.close);
  backdrop.addEventListener("click", drawer.close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root.hidden) drawer.close();
  });
  return drawer;
}

let shared: Drawer | null = null;

/** The app's one drawer, created and attached on first use. */
export function sharedDrawer(): Drawer {
  if (!shared) {
    shared = createDrawer();
    document.body.append(shared.backdrop, shared.root);
  }
  return shared;
}

/** The body for the FI date trace. */
export function fiTraceBody(trace: FiTrace): HTMLElement {
  const items = trace.entries.map((e) => {
    let effect: string;
    if (e.deltaYears === null) effect = e.fiAgeTested === null ? "never funded" : "becomes funded";
    else if (e.deltaYears === 0) effect = "no change";
    else effect = `${yearWord(Math.abs(e.deltaYears))} ${e.deltaYears > 0 ? "later" : "sooner"}`;
    return el("li", {}, el("span", {}, e.label), el("span", { class: "trace-effect" }, effect));
  });
  return el(
    "div",
    { class: "stack" },
    el("p", { class: "muted" }, "Each line changes one input and reruns the whole plan. The biggest movers are first."),
    el("ul", { class: "trace-list" }, ...items),
  );
}

/** A plain-words body for other computed numbers. */
export function computedFromBody(lines: readonly string[]): HTMLElement {
  return el("ul", { class: "trace-list" }, ...lines.map((line) => el("li", {}, el("span", {}, line))));
}
