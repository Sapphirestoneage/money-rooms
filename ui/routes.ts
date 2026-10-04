/**
 * The route table (docs/complexity-budget.md rule 2): every screen, its parent, and whether it
 * sits in the top bar. The core's routes are listed here; a module's screens come only from its
 * manifest through the registry (docs/module-contract.md), with its placement screen as parent.
 * Taps from home are counted from this table, and the budget test reads it.
 */

import { loadModules } from "../engine";

export interface RouteDef {
  route: string;
  label: string;
  /** The screen this one is reached from; null for home. */
  parent: string | null;
  /** True when the route has a top-bar link (one tap from anywhere). */
  nav: boolean;
  /** The module that owns the screen, when one does. */
  moduleId?: string;
}

export const HOME = "#/entry";

export const CORE_ROUTES: readonly RouteDef[] = [
  { route: "#/entry", label: "Your numbers", parent: null, nav: true },
  { route: "#/next", label: "What's next", parent: "#/entry", nav: true },
  { route: "#/next/sky", label: "The Sky", parent: "#/next", nav: false },
  { route: "#/levels", label: "Levels", parent: "#/entry", nav: true },
  { route: "#/whatifs", label: "What-ifs", parent: "#/entry", nav: true },
  { route: "#/meaning", label: "Meaning", parent: "#/entry", nav: true },
  { route: "#/risk", label: "Risk", parent: "#/entry", nav: true },
  { route: "#/result", label: "Your FI date", parent: "#/entry", nav: true },
  { route: "#/about", label: "About", parent: "#/entry", nav: false },
  { route: "#/privacy", label: "Your data and privacy", parent: "#/about", nav: false },
];

/** The core's routes plus every module screen from the registry. */
export function allRoutes(): RouteDef[] {
  const out = [...CORE_ROUTES];
  for (const m of loadModules()) {
    if (m.core) continue;
    for (const screen of m.adds.screens) out.push({ route: screen, label: m.name, parent: m.placement.screen, nav: false, moduleId: m.id });
  }
  return out;
}

/** Taps from home: a top-bar screen is one tap from anywhere; a child screen is one more than its parent. */
export function tapsFromHome(route: string, routes: readonly RouteDef[] = allRoutes()): number {
  const r = routes.find((x) => x.route === route);
  if (!r) return Infinity;
  if (r.route === HOME) return 0;
  if (r.nav) return 1;
  return r.parent === null ? 1 : 1 + tapsFromHome(r.parent, routes);
}

/** The route a hash belongs to: an exact match, else the core screen it begins with, else home. */
export function routeForHash(hash: string, routes: readonly RouteDef[] = allRoutes()): RouteDef {
  const exact = routes.find((r) => r.route === hash);
  if (exact) return exact;
  const prefix = routes.filter((r) => r.nav && hash.startsWith(r.route)).sort((a, b) => b.route.length - a.route.length)[0];
  return prefix ?? routes.find((r) => r.route === HOME)!;
}
