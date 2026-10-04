/**
 * Entry point for the Money Rooms UI. Two screens, a hash router, local storage.
 * Screens read the engine. They never calculate.
 */

import { emptyHousehold, type Household } from "../engine";
import { backupNudge } from "./components/backup-nudge";
import { sharedDrawer } from "./components/trace-drawer";
import { clear, el } from "./dom";
import { entryScreen } from "./screens/entry";
import { levelsScreen } from "./screens/levels";
import { meaningScreen } from "./screens/meaning";
import { nextScreen } from "./screens/next";
import { resultScreen } from "./screens/result";
import { riskScreen } from "./screens/risk";
import { aboutScreen, privacyScreen } from "./screens/trust";
import { whatIfsScreen } from "./screens/whatifs";
import { browserStore, todayIso } from "./store";

type Route = "entry" | "result" | "next" | "levels" | "whatifs" | "meaning" | "risk" | "about" | "privacy";

function currentRoute(): Route {
  if (window.location.hash === "#/result") return "result";
  if (window.location.hash.startsWith("#/next")) return "next";
  if (window.location.hash === "#/levels") return "levels";
  if (window.location.hash === "#/whatifs") return "whatifs";
  if (window.location.hash === "#/meaning") return "meaning";
  if (window.location.hash === "#/risk") return "risk";
  if (window.location.hash === "#/about") return "about";
  if (window.location.hash === "#/privacy") return "privacy";
  return "entry";
}

function boot(): void {
  const app = document.getElementById("app");
  if (!app) return;

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  const store = browserStore(storage);
  let household: Household = store.load();
  const save = () => store.save(household);

  const drawer = sharedDrawer();

  const nav = el("nav", { class: "topbar__nav", "aria-label": "Screens" }, el("a", { href: "#/entry" }, "Your numbers"), el("a", { href: "#/next" }, "What's next"), el("a", { href: "#/levels" }, "Levels"), el("a", { href: "#/whatifs" }, "What-ifs"), el("a", { href: "#/meaning" }, "Meaning"), el("a", { href: "#/risk" }, "Risk"), el("a", { href: "#/result" }, "Your FI date"));
  const topbar = el("header", { class: "topbar" }, el("a", { class: "topbar__brand", href: "#/entry" }, "Money Rooms"), nav);
  document.body.prepend(topbar);

  const nudge = el("div", {});
  const main = el("div", {});
  app.append(nudge, main);
  const footer = el(
    "footer",
    { class: "sitefooter" },
    el("nav", { "aria-label": "About this app" }, el("a", { href: "#/about" }, "About"), el("a", { href: "#/privacy" }, "Your data and privacy")),
    el("p", { class: "muted" }, "Educational, not individualized financial, tax, or legal advice. Your numbers stay in this browser."),
  );
  app.after(footer);
  const reset = () => {
    store.clear();
    store.clearSnapshot();
    store.savePrefs({ cadence: {} });
    household = emptyHousehold(todayIso());
  };

  function render(): void {
    const route = currentRoute();
    for (const a of nav.querySelectorAll("a")) {
      if (a.getAttribute("href") === `#/${route}`) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    drawer.close();
    clear(main);
    clear(nudge);
    if (route !== "about" && route !== "privacy") {
      const card = backupNudge(() => household, store, render);
      if (card) nudge.append(card);
    }
    if (route === "about") {
      main.append(aboutScreen());
    } else if (route === "privacy") {
      main.append(privacyScreen({ store, reset, goToEntry: () => { window.location.hash = "#/entry"; render(); } }));
    } else if (route === "result") {
      main.append(resultScreen({ household, store, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else if (route === "risk") {
      main.append(riskScreen({ household, store, save, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else if (route === "meaning") {
      main.append(meaningScreen({ household, store, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else if (route === "whatifs") {
      main.append(whatIfsScreen({ household, store, save, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else if (route === "levels") {
      main.append(levelsScreen({ household, store, save, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else if (route === "next") {
      main.append(nextScreen({ household, store, save, goToEntry: () => { window.location.hash = "#/entry"; }, goToResult: () => { window.location.hash = "#/result"; }, drawer }));
    } else {
      main.append(entryScreen({
        household,
        store,
        save,
        replace: (h) => { household = h; save(); render(); },
        goToResult: () => { window.location.hash = "#/result"; },
      }));
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);
  render();
}

boot();
