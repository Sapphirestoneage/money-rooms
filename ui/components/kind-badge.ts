/**
 * Kind badge (design system 5): a small pill showing a number's kind.
 * Tapping it explains the kind. Optionally cycles between known and roughly for entry.
 */

import type { Confidence } from "../../engine";
import { el } from "../dom";
import { KIND_EXPLANATION, KIND_LABEL } from "../format";

export interface KindBadgeOptions {
  /** When given, tapping cycles the kind through these values and calls onChange. */
  cycle?: readonly Confidence[];
  onChange?: (next: Confidence) => void;
}

export function kindBadge(kind: Confidence, options: KindBadgeOptions = {}): HTMLButtonElement {
  const button = el("button", {
    type: "button",
    class: `kind-badge kind-badge--${kind}`,
    title: KIND_EXPLANATION[kind],
    "aria-label": options.cycle ? `${KIND_LABEL[kind]}. Tap to change.` : `${KIND_LABEL[kind]}. ${KIND_EXPLANATION[kind]}`,
  }, KIND_LABEL[kind]);

  button.addEventListener("click", () => {
    if (options.cycle && options.onChange) {
      const i = options.cycle.indexOf(kind);
      const next = options.cycle[(i + 1) % options.cycle.length] ?? kind;
      options.onChange(next);
      return;
    }
    window.alert(`${KIND_LABEL[kind]}. ${KIND_EXPLANATION[kind]}`);
  });
  return button;
}
