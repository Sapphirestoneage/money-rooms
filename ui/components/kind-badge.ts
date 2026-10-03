/**
 * Kind badge (design system 5): a small pill showing a number's kind, inside a
 * 44px tap target. Tapping it opens the drawer with the kind's explanation and,
 * where the kind can be changed, the choices.
 */

import type { Confidence } from "../../engine";
import { el } from "../dom";
import { KIND_EXPLANATION, KIND_LABEL } from "../format";
import { sharedDrawer } from "./trace-drawer";

/** The kinds a person can give a number they entered. */
export type EditableKind = "known" | "roughly" | "lookUp";
export const EDITABLE_KINDS: readonly EditableKind[] = ["known", "roughly", "lookUp"];

export interface KindBadgeOptions {
  /** When given, the drawer offers the three editable kinds. */
  onChange?: (next: EditableKind) => void;
}

export function kindBadge(kind: Confidence, options: KindBadgeOptions = {}): HTMLButtonElement {
  const pill = el("span", { class: `kind-badge__pill kind-badge__pill--${kind}` }, KIND_LABEL[kind]);
  const button = el(
    "button",
    {
      type: "button",
      class: "kind-badge",
      "aria-label": `${KIND_LABEL[kind]}. ${options.onChange ? "Tap for what this means, or to change it." : "Tap for what this means."}`,
    },
    pill,
  );

  button.addEventListener("click", () => {
    const drawer = sharedDrawer();
    const body = el("div", { class: "stack" }, el("p", {}, KIND_EXPLANATION[kind]));
    const change = options.onChange;
    if (change) {
      body.append(
        el("p", { class: "muted" }, "How sure are you of this number?"),
        el(
          "div",
          { class: "row-actions" },
          ...EDITABLE_KINDS.map((k) =>
            el(
              "button",
              {
                type: "button",
                class: k === kind ? "button" : "button button--quiet",
                "aria-pressed": k === kind,
                onClick: () => {
                  drawer.close();
                  if (k !== kind) change(k);
                },
              },
              KIND_LABEL[k],
            ),
          ),
        ),
      );
    }
    drawer.open(KIND_LABEL[kind], body);
  });
  return button;
}
