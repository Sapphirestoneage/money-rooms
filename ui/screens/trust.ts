/**
 * The trust pages: About (what Money Rooms is and is not) and Privacy (where
 * the data lives, and how to take it out or delete it). Plain text, no numbers.
 */

import { confirmPanel } from "../components/confirm-panel";
import { el } from "../dom";
import type { Store } from "../store";

export interface TrustContext {
  store: Store;
  /** Clears everything stored in this browser and starts an empty household. */
  reset(): void;
  goToEntry(): void;
}

export function aboutScreen(): HTMLElement {
  return el(
    "div",
    {},
    el("h1", { class: "screen-title" }, "About Money Rooms"),
    el(
      "section",
      { class: "card stack" },
      el("p", {}, "Money Rooms is a way to see your money whole: what comes in, what goes out, what you own and owe, and the date your savings could carry you without work income. It shows the numbers in today's dollars, under tax and benefit rules verified against their official sources, with every number traceable to what you entered."),
      el("p", {}, el("strong", {}, "Educational, not individualized financial, tax, or legal advice."), " Money Rooms describes what your numbers show under stated assumptions. It does not know your whole situation, it is not a fiduciary, and it does not recommend any product, account, or action. Decisions about your money are yours; a licensed professional who knows your situation can give advice that this software cannot."),
      el("p", {}, "The rules the engine uses (brackets, limits, Social Security formulas, health care rules) are listed with their source and the date they were last checked on every result. Where a rule could not be verified against its source, the result says so."),
      el("p", {}, "Projections are not predictions. Returns, inflation, and the law will differ from the assumptions, which is why every date comes as a range of three bands rather than one number."),
    ),
    el(
      "section",
      { class: "card stack" },
      el("h2", {}, "How it works"),
      el("p", {}, "Everything is calculated in your browser from the numbers you enter. Each number carries its own date and how sure you are of it (known, look it up, roughly). The engine runs a year-by-year plan from today to your plan-to age, finds the earliest year the plan stays funded, and shows what moves it."),
      el("p", {}, el("a", { href: "#/privacy" }, "Where your data lives"), "."),
    ),
  );
}

export function privacyScreen(ctx: TrustContext): HTMLElement {
  const root = el("div", {});
  let confirming = false;
  const render = () => {
    root.replaceChildren(
      el("h1", { class: "screen-title" }, "Your data and privacy"),
      el(
        "section",
        { class: "card stack" },
        el("p", {}, el("strong", {}, "Your numbers stay in your browser."), " Money Rooms has no account, no server, and no database. What you enter is saved in this browser's own storage on this device, and nowhere else."),
        el("p", {}, el("strong", {}, "Nothing is sent anywhere."), " The app makes no network request with your data. The only thing it loads from the internet is its own code and a font. There is no analytics, no tracking, and no third party."),
        el("p", {}, el("strong", {}, "You can take your numbers with you."), " Export writes a file to your device that you keep; import reads one back. A file you export is yours to share or not. If you send it to anyone, that is your choice and outside this app."),
        el("p", {}, el("strong", {}, "You can delete everything."), " The button below removes every number, the saved copy from before your last import, and your display choices from this browser. Clearing the browser's site data does the same."),
        el("p", { class: "muted" }, "This browser ", ctx.store.isPersistent() ? "keeps what you enter between visits." : "is not keeping what you enter (a private window or blocked storage). Export a file to keep your numbers."),
      ),
      el(
        "section",
        { class: "card stack" },
        el("h2", {}, "Delete everything stored here"),
        confirming
          ? confirmPanel({
              sentence: "This removes every number and setting from this browser. A file you exported is not affected.",
              confirmLabel: "Delete everything",
              cancelLabel: "Keep my numbers",
              onConfirm: () => { confirming = false; ctx.reset(); ctx.goToEntry(); },
              onCancel: () => { confirming = false; render(); },
            })
          : el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: () => { confirming = true; render(); } }, "Delete my numbers from this browser")),
      ),
    );
  };
  render();
  return root;
}
