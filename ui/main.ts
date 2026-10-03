/**
 * Entry point for the Money Rooms UI. Two screens, a hash router, local storage.
 * Screens read the engine. They never calculate.
 */

import type { Household } from "../engine";
import { createDrawer } from "./components/trace-drawer";
import { clear, el } from "./dom";
import { entryScreen } from "./screens/entry";
import { resultScreen } from "./screens/result";
import { browserStore } from "./store";

type Route = "entry" | "result";

function currentRoute(): Route {
  return window.location.hash === "#/result" ? "result" : "entry";
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

  const drawer = createDrawer();
  document.body.append(drawer.backdrop, drawer.root);

  const nav = el("nav", { class: "topbar__nav", "aria-label": "Screens" }, el("a", { href: "#/entry" }, "Your numbers"), el("a", { href: "#/result" }, "Your FI date"));
  const topbar = el("header", { class: "topbar" }, el("a", { class: "topbar__brand", href: "#/entry" }, "Money Rooms"), nav);
  document.body.prepend(topbar);

  const main = el("div", {});
  app.append(main);

  function render(): void {
    const route = currentRoute();
    for (const a of nav.querySelectorAll("a")) {
      if (a.getAttribute("href") === `#/${route}`) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    drawer.close();
    clear(main);
    if (route === "result") {
      main.append(resultScreen({ household, goToEntry: () => { window.location.hash = "#/entry"; }, drawer }));
    } else {
      main.append(entryScreen({
        household,
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
