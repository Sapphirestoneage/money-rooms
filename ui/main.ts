/**
 * Entry point for the Money Rooms UI: the screens, a hash router, local storage.
 * Screens read the engine. They never calculate. Module screens (docs/module-contract.md)
 * are reached only through the registry: a route a manifest owns renders that module's
 * screen when the module is active for this household.
 */

import pkg from "../package.json";
import { emptyHousehold, type Household } from "../engine";
import { backupNudge } from "./components/backup-nudge";
import { sharedDrawer } from "./components/trace-drawer";
import { clear, el } from "./dom";
import { moduleForRoute } from "./modules/index";
import { CORE_ROUTES, routeForHash } from "./routes";
import { entryScreen } from "./screens/entry";
import { levelsScreen } from "./screens/levels";
import { meaningScreen } from "./screens/meaning";
import { nextScreen } from "./screens/next";
import { resultScreen } from "./screens/result";
import { riskScreen } from "./screens/risk";
import { aboutScreen, privacyScreen } from "./screens/trust";
import { whatIfsScreen } from "./screens/whatifs";
import { browserStore, todayIso } from "./store";

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

  const nav = el("nav", { class: "topbar__nav", "aria-label": "Screens" }, ...CORE_ROUTES.filter((r) => r.nav).map((r) => el("a", { href: r.route }, r.label)));
  const topbar = el("header", { class: "topbar" }, el("a", { class: "topbar__brand", href: "#/entry" }, "Money Rooms"), nav);
  document.body.prepend(topbar);

  const nudge = el("div", {});
  const main = el("div", {});
  app.append(nudge, main);
  const footer = el(
    "footer",
    { class: "sitefooter" },
    el("nav", { "aria-label": "About this app" }, el("a", { href: "#/about" }, "About"), el("a", { href: "#/privacy" }, "Your data and privacy")),
    el("p", { class: "muted" }, `Educational, not individualized financial, tax, or legal advice. Your numbers stay in this browser. Version ${pkg.version}.`),
  );
  app.after(footer);
  const reset = () => {
    store.clear();
    store.clearSnapshot();
    store.savePrefs({ cadence: {} });
    household = emptyHousehold(todayIso());
  };
  const goToEntry = () => { window.location.hash = "#/entry"; };

  function render(): void {
    const hash = window.location.hash;
    const route = routeForHash(hash);
    // The top bar marks the screen whose route the hash sits under.
    const current = route.nav ? route.route : route.parent && CORE_ROUTES.some((r) => r.route === route.parent && r.nav) ? route.parent : null;
    for (const a of nav.querySelectorAll("a")) {
      if (a.getAttribute("href") === current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    drawer.close();
    clear(main);
    clear(nudge);
    if (route.route !== "#/about" && route.route !== "#/privacy") {
      const card = backupNudge(() => household, store, render);
      if (card) nudge.append(card);
    }
    const ctx = { household, store, save, goToEntry, drawer };
    if (route.moduleId) {
      const found = moduleForRoute(route.route, ctx);
      if (found === "inactive" || found === null || !found.ui.screen) {
        main.append(
          el("h1", { class: "screen-title" }, "Not available yet"),
          el("p", {}, found === "inactive" ? "This room is in beta or has not unlocked for your numbers yet. Beta rooms can be turned on under About." : "There is no screen at this address."),
          el("p", {}, el("a", { href: "#/about" }, "About Money Rooms")),
        );
      } else main.append(found.ui.screen(ctx, route.route));
    } else if (route.route === "#/about") {
      main.append(aboutScreen({ store, onChange: render }));
    } else if (route.route === "#/privacy") {
      main.append(privacyScreen({ store, reset, goToEntry: () => { goToEntry(); render(); } }));
    } else if (route.route === "#/result") {
      main.append(resultScreen({ household, store, goToEntry, drawer }));
    } else if (route.route === "#/risk") {
      main.append(riskScreen({ household, store, save, goToEntry, drawer }));
    } else if (route.route === "#/meaning") {
      main.append(meaningScreen({ household, store, goToEntry, drawer }));
    } else if (route.route === "#/whatifs") {
      main.append(whatIfsScreen({ household, store, save, goToEntry, drawer }));
    } else if (route.route === "#/levels") {
      main.append(levelsScreen({ household, store, save, goToEntry, drawer }));
    } else if (route.route.startsWith("#/next")) {
      main.append(nextScreen({ household, store, save, goToEntry, goToResult: () => { window.location.hash = "#/result"; }, drawer }));
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
