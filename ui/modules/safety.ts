/**
 * Safety features (module data/modules/safety.json, beta; decision A16): a quick-exit button, a discreet
 * mode (neutral tab title and icon, no amounts in titles or notifications), and an optional passcode
 * curtain. The passcode is a curtain, not encryption: the numbers stay readable in the browser's storage,
 * and the Privacy screen says so. Display preferences only; nothing here touches the plan.
 */

import { confirmPanel } from "../components/confirm-panel";
import { toggleButton } from "../components/toggle-button";
import { el } from "../dom";
import type { Store } from "../store";
import type { ModuleContext } from "./index";

export const NEUTRAL_TITLE = "Notes";
export const APP_TITLE = "Money Rooms";
/** Where the quick exit goes: a neutral, common page. */
export const QUICK_EXIT_URL = "https://www.wikipedia.org/";

const NEUTRAL_ICON = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="#888"/></svg>');

let appIconHref: string | null = null;

/** Swaps the tab title and icon for neutral ones, and back. */
export function applyDiscreetMode(on: boolean): void {
  document.title = on ? NEUTRAL_TITLE : APP_TITLE;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = el("link", { rel: "icon" }) as HTMLLinkElement;
    document.head.append(link);
  }
  if (appIconHref === null) appIconHref = link.getAttribute("href") ?? "";
  link.setAttribute("href", on ? NEUTRAL_ICON : appIconHref || "data:,");
}

/** Leaves at once for a neutral page, replacing this page in the history so the back button does not return here. */
export function quickExit(): void {
  window.location.replace(QUICK_EXIT_URL);
}

export function quickExitButton(): HTMLElement {
  return el("button", { type: "button", class: "button button--quiet quick-exit", onClick: quickExit, "aria-label": "Leave this page quickly" }, "Leave quickly");
}

export async function hashPasscode(code: string): Promise<string> {
  const data = new TextEncoder().encode(`money-rooms:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The passcode curtain: shown over the app until the right code is entered. Resolves when unlocked. */
export function passcodeCurtain(store: Store, onUnlock: () => void): HTMLElement {
  const input = el("input", { class: "input", type: "password", inputmode: "numeric", autocomplete: "off", id: "passcode", "aria-describedby": "passcode-help" });
  const note = el("p", { class: "muted", id: "passcode-help" }, "The passcode you set under Your data and privacy. Forgot it? Clearing this site's data in the browser removes it along with your numbers.");
  const error = el("p", { class: "field__error", "aria-live": "polite" });
  const form = el("form", { class: "card stack curtain__card" }, el("h1", { class: "screen-title" }, "Passcode"), el("div", { class: "field" }, el("label", { for: "passcode" }, "Enter your passcode"), input), note, error, el("div", { class: "row-actions" }, el("button", { type: "submit", class: "button" }, "Unlock")));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void hashPasscode(input.value).then((hash) => {
      if (hash === store.loadPrefs().passcodeHash) onUnlock();
      else {
        error.textContent = "That is not the passcode.";
        input.value = "";
        input.focus();
      }
    });
  });
  const curtain = el("div", { class: "curtain", role: "dialog", "aria-modal": "true", "aria-label": "Passcode" }, form);
  window.setTimeout(() => input.focus(), 30);
  return curtain;
}

/** Shell effects after every render: the tab title and icon, and the quick-exit button. */
export function applySafetyShell(ctx: ModuleContext): void {
  const p = ctx.store.loadPrefs();
  applyDiscreetMode(p.discreet === true);
  document.querySelector(".quick-exit")?.remove();
  if (p.quickExit) document.body.append(quickExitButton());
}

/** The passcode curtain before the first render, when a passcode is set. */
export function safetyCurtain(ctx: ModuleContext, onUnlock: () => void): HTMLElement | null {
  if (!ctx.store.loadPrefs().passcodeHash) return null;
  applyDiscreetMode(ctx.store.loadPrefs().discreet === true);
  return passcodeCurtain(ctx.store, onUnlock);
}

/** The settings card for the Privacy screen (module card for "#/privacy"). A change re-renders the shell. */
export function safetySettingsCard(ctx: ModuleContext): HTMLElement {
  return settingsCard(ctx.store, () => window.dispatchEvent(new Event("hashchange")));
}

function settingsCard(store: Store, onChange: () => void): HTMLElement {
  const prefs = store.loadPrefs();
  const save = (patch: Partial<ReturnType<Store["loadPrefs"]>>) => { store.savePrefs({ ...store.loadPrefs(), ...patch }); onChange(); };
  const code = el("input", { class: "input", type: "password", inputmode: "numeric", autocomplete: "new-password", id: "new-passcode", minlength: 4, maxlength: 12, placeholder: "4 to 12 digits" });
  const set = el("button", { type: "button", class: "button button--quiet button--small" }, prefs.passcodeHash ? "Change the passcode" : "Set a passcode");
  const status = el("p", { class: "muted", "aria-live": "polite" }, prefs.passcodeHash ? "A passcode is set. It is asked for when the app opens." : "No passcode. Anyone with this browser can open the app.");
  set.addEventListener("click", () => {
    const v = code.value.trim();
    if (!/^\d{4,12}$/.test(v)) {
      status.textContent = "A passcode is 4 to 12 digits.";
      return;
    }
    void hashPasscode(v).then((hash) => { code.value = ""; save({ passcodeHash: hash }); });
  });
  let confirming = false;
  const clearRow = (): HTMLElement =>
    confirming
      ? confirmPanel({ sentence: "This removes the passcode. Your numbers stay.", confirmLabel: "Remove the passcode", cancelLabel: "Keep it", onConfirm: () => { const next = { ...store.loadPrefs() }; delete next.passcodeHash; store.savePrefs(next); onChange(); }, onCancel: () => { confirming = false; onChange(); } })
      : el("button", { type: "button", class: "button button--quiet button--small", onClick: () => { confirming = true; onChange(); } }, "Remove the passcode");
  return el(
    "section",
    { class: "card stack", "aria-label": "Safety features" },
    el("div", { class: "card__title" }, el("h2", {}, "Safety features"), el("span", { class: "lock-badge" }, "Beta")),
    el("p", {}, "For using the app where someone might look over your shoulder, or might open your browser."),
    toggleButton(prefs.quickExit ? "Quick exit button is on" : "Quick exit button is off", prefs.quickExit === true, (next) => save({ quickExit: next })),
    el("p", { class: "muted" }, "A button in the corner of every screen that leaves at once for a plain page and replaces this page in the history, so the back button does not come here."),
    toggleButton(prefs.discreet ? "Discreet mode is on" : "Discreet mode is off", prefs.discreet === true, (next) => save({ discreet: next })),
    el("p", { class: "muted" }, `The browser tab says "${NEUTRAL_TITLE}" with a plain icon instead of the app's name. No amount ever appears in a tab title or a notification.`),
    el("div", { class: "field" }, el("label", { for: "new-passcode" }, "Passcode"), code),
    el("div", { class: "row-actions" }, set, prefs.passcodeHash ? clearRow() : null),
    status,
    el("p", { class: "muted" }, "The passcode is a curtain, not a lock: it keeps the screens from showing until it is entered, but your numbers stay readable in this browser's storage to anyone who looks there. For real protection, export a file and delete your numbers from this browser."),
  );
}
