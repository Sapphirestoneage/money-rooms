/**
 * Toggle button (design system 5): a button that is on or off, for display
 * choices. A full 44px tap target, used instead of a small checkbox.
 */

import { el } from "../dom";

export function toggleButton(label: string, pressed: boolean, onChange: (next: boolean) => void): HTMLButtonElement {
  const button = el("button", { type: "button", class: "toggle-button", "aria-pressed": pressed ? "true" : "false" }, label);
  button.addEventListener("click", () => onChange(!pressed));
  return button;
}
