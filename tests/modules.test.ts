/**
 * The module contract (docs/module-contract.md section 7): every manifest is valid, every module
 * screen has a renderer and every renderer a manifest, a module's files touch only the fields it
 * declares, and the app reaches modules only through the registry.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOUSEHOLD_KEYS, activeModules, emptyHousehold, flagShows, householdFromExample, isModuleActive, loadModules, moduleUnlocked, validateManifest, type ExampleHouseholdFile } from "../engine";
import { MODULE_UI } from "../ui/modules/index";
import { CORE_ROUTES, allRoutes } from "../ui/routes";
import golden from "./households/debt-freedom-golden.json";
import maya from "./households/maya.json";

const root = join(import.meta.dirname, "..");
const modules = loadModules();

describe("the registry", () => {
  it("loads every manifest in data/modules, the core first", () => {
    const files = readdirSync(join(root, "data", "modules")).filter((f) => f.endsWith(".json"));
    expect(modules.map((m) => m.id).sort()).toEqual(files.map((f) => f.replace(/\.json$/, "")).sort());
    expect(modules[0]!.core).toBe(true);
    expect(modules.filter((m) => m.core)).toHaveLength(1);
  });

  it("rejects an incomplete manifest with plain reasons", () => {
    const errors = validateManifest({ id: "Bad Id", name: "", job: "does things", reads: ["nowhere.field"], flag: "maybe" });
    expect(errors.some((e) => e.includes("id must be"))).toBe(true);
    expect(errors.some((e) => e.includes('"answers: "'))).toBe(true);
    expect(errors.some((e) => e.includes("does not start at a household field"))).toBe(true);
    expect(errors.some((e) => e.includes("flag must be"))).toBe(true);
    expect(errors.some((e) => e.includes("killCriteria"))).toBe(true);
  });

  it("every manifest's reads start at a household field and its job is one sentence", () => {
    for (const m of modules) {
      for (const r of m.reads) expect(HOUSEHOLD_KEYS).toContain(r.split(/[.[]/)[0]);
      expect(m.job.startsWith("answers: ")).toBe(true);
      expect(m.job.split(/[.!?]\s/).length).toBe(1);
    }
  });

  it("flags: on shows for everyone, beta only with the setting, off never", () => {
    expect(flagShows("on", false)).toBe(true);
    expect(flagShows("beta", false)).toBe(false);
    expect(flagShows("beta", true)).toBe(true);
    expect(flagShows("off", true)).toBe(false);
  });

  it("the Debt freedom module is beta: hidden until the setting is on, and unlocked only by a debt", () => {
    const withDebts = householdFromExample(golden as ExampleHouseholdFile, "2026-10-01");
    expect(isModuleActive("debt-freedom", withDebts, { beta: false })).toBe(false);
    expect(isModuleActive("debt-freedom", withDebts, { beta: true })).toBe(true);
    const empty = emptyHousehold("2026-10-01");
    expect(moduleUnlocked(modules.find((m) => m.id === "debt-freedom")!, empty)).toBe(false);
    expect(isModuleActive("debt-freedom", empty, { beta: true })).toBe(false);
  });

  it("Small wins is on for every household, and the core is always active", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-01");
    const ids = activeModules(h, { beta: false }).map((m) => m.id);
    expect(ids).toContain("core");
    expect(ids).toContain("small-wins");
    expect(ids).not.toContain("debt-freedom");
  });
});

describe("screens and renderers", () => {
  const coreNav = CORE_ROUTES.filter((r) => r.nav).map((r) => r.route);

  it("every renderer belongs to a manifest", () => {
    for (const id of Object.keys(MODULE_UI)) expect(modules.some((m) => m.id === id)).toBe(true);
  });

  it("every module screen is rendered through the registry: its own renderer, or a tab of the core screen it sits under", () => {
    for (const m of modules) {
      if (m.core) continue;
      for (const screen of m.adds.screens) {
        const own = MODULE_UI[m.id]?.screen !== undefined;
        const tabOfCore = coreNav.some((r) => screen.startsWith(`${r}/`));
        expect(own || tabOfCore, `${m.id} ${screen}`).toBe(true);
        expect(CORE_ROUTES.some((r) => r.route === screen), `${screen} is a module screen listed as core`).toBe(false);
      }
    }
  });

  it("the route table carries every module screen with its placement screen as parent", () => {
    const routes = allRoutes();
    for (const m of modules) {
      if (m.core) continue;
      for (const screen of m.adds.screens) {
        const r = routes.find((x) => x.route === screen)!;
        expect(r).toBeDefined();
        expect(r.moduleId).toBe(m.id);
        expect(r.parent).toBe(m.placement.screen);
      }
    }
  });

  it("the router names no module: ui/main.ts has no module id and no #/m/ route of its own", () => {
    const main = readFileSync(join(root, "ui", "main.ts"), "utf8");
    for (const m of modules) if (!m.core) expect(main.includes(`"${m.id}"`)).toBe(false);
    expect(main.includes("#/m/")).toBe(false);
  });
});

describe("a module's files touch only the fields it declares", () => {
  const access = /\b(?:h|hh|household)(?:\(\))?\.([A-Za-z_]\w*)/g;
  for (const m of modules) {
    if (m.core || !m.files.length) continue;
    it(`${m.id}: ${m.files.join(", ")}`, () => {
      const allowed = new Set([...m.reads, ...m.adds.fields].map((r) => r.split(/[.[]/)[0]!));
      for (const f of m.files) {
        const path = join(root, f);
        expect(existsSync(path), `${f} exists`).toBe(true);
        const src = readFileSync(path, "utf8");
        const touched = new Set<string>();
        for (const match of src.matchAll(access)) if (HOUSEHOLD_KEYS.includes(match[1]!)) touched.add(match[1]!);
        for (const t of touched) expect(allowed.has(t), `${f} reads household.${t}, which ${m.id}'s manifest does not declare`).toBe(true);
      }
    });
  }
});
