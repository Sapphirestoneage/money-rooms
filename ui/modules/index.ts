/**
 * The screens and cards each module brings (docs/module-contract.md section 5). Keyed by module
 * id; the contract test checks every key has a manifest and every manifest screen has a renderer.
 * A module shows only when the registry says it is active for this household (flag and unlock).
 */

import { isModuleActive, loadModules, type Household, type ModuleManifest } from "../../engine";
import type { Drawer } from "../components/trace-drawer";
import type { Store } from "../store";
import { debtFreedomLevelCard, debtFreedomScreen } from "./debt-freedom";

export interface ModuleContext {
  household: Household;
  store: Store;
  save(): void;
  goToEntry(): void;
  drawer: Drawer;
}

export interface ModuleUi {
  /** Renders the module's screen for one of its routes. */
  screen?: (ctx: ModuleContext, route: string) => HTMLElement;
  /** Renders the module's card in its level's section on the Levels screen. */
  levelCard?: (ctx: ModuleContext) => HTMLElement;
}

export const MODULE_UI: Readonly<Record<string, ModuleUi>> = {
  "debt-freedom": { screen: debtFreedomScreen, levelCard: debtFreedomLevelCard },
  // Small wins is a tab of What's next (ui/screens/next.ts); it shows only while the registry says the module is active.
  "small-wins": {},
};

/** The beta setting from display preferences. */
export function betaOn(store: Store): boolean {
  return store.loadPrefs().beta === true;
}

export function activeModule(id: string, ctx: Pick<ModuleContext, "household" | "store">): boolean {
  return isModuleActive(id, ctx.household, { beta: betaOn(ctx.store) });
}

/** The module that owns a route, when it is active for this household. */
export function moduleForRoute(route: string, ctx: Pick<ModuleContext, "household" | "store">): { manifest: ModuleManifest; ui: ModuleUi } | "inactive" | null {
  const manifest = loadModules().find((m) => !m.core && m.adds.screens.includes(route));
  if (!manifest) return null;
  if (!activeModule(manifest.id, ctx)) return "inactive";
  return { manifest, ui: MODULE_UI[manifest.id] ?? {} };
}

/** Every active module's level card for a level, in registry order. */
export function moduleLevelCards(level: number, ctx: ModuleContext): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const m of loadModules()) {
    if (m.core || !activeModule(m.id, ctx)) continue;
    const ui = MODULE_UI[m.id];
    if (ui?.levelCard && m.adds.cards.some((c) => c.level === level && c.screen === "#/levels")) out.push(ui.levelCard(ctx));
  }
  return out;
}
