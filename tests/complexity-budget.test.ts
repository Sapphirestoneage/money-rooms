/**
 * The complexity budget (docs/complexity-budget.md, decision A6). Five rules, each a failing test
 * when broken: five required questions, three taps, one concept per screen, three cards per level,
 * and a new module fits or names what it replaces.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import items from "../data/items.json";
import materiality from "../data/materiality.json";
import { emptyHousehold, loadModules, missingLevelOneAnswers } from "../engine";
import { allRoutes, tapsFromHome } from "../ui/routes";

const root = join(import.meta.dirname, "..");
const modules = loadModules();
const counted = modules.filter((m) => m.core || m.flag !== "off");

function uiFiles(dir = join(root, "ui")): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...uiFiles(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("rule 1: Level 1 asks at most 5 required questions", () => {
  it("the Level 1 checklist", () => {
    expect(missingLevelOneAnswers(emptyHousehold("2026-10-01")).length).toBeLessThanOrEqual(5);
  });
  it("the checklist's questions each have an item in data/items.json, and the required ones are the checklist's five", () => {
    // Required means the plan cannot run without it (missingLevelOneAnswers). Filing status and HSA eligibility are Level 1
    // questions with defaults, so they are asked but not required.
    const required = missingLevelOneAnswers(emptyHousehold("2026-10-01"));
    const fieldOf: Record<string, string> = { birthDate: "self.birthDate", state: "self.state", income: "self.income", spending: "spending", accounts: "accounts" };
    const level1 = (items as { items: { level: number; type: string; fields: string[] }[] }).items.filter((i) => i.level === 1 && i.type === "question");
    for (const r of required) expect(level1.some((i) => i.fields.includes(fieldOf[r]!)), r).toBe(true);
    expect(required.length).toBeLessThanOrEqual(5);
  });
});

describe("rule 2: no screen is more than 3 taps from home", () => {
  const routes = allRoutes();
  it("every route in the table, core and module", () => {
    for (const r of routes) expect(tapsFromHome(r.route, routes), r.route).toBeLessThanOrEqual(3);
  });
  it("every #/ link in the UI points at a route in the table", () => {
    const known = new Set(routes.map((r) => r.route));
    const link = /["'`](#\/[a-z0-9/-]*)["'`]/g;
    for (const f of uiFiles()) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(link)) {
        const href = m[1]!;
        if (href === "#/" || href === "#/m/") continue;
        expect(known.has(href), `${f.replace(root, "")} links to ${href}`).toBe(true);
      }
    }
  });
});

describe("rule 3: at most one new concept per screen per module", () => {
  for (const m of modules) {
    it(m.id, () => {
      const perScreen = new Map<string, number>();
      for (const c of m.adds.concepts) perScreen.set(c.screen, (perScreen.get(c.screen) ?? 0) + 1);
      for (const [screen, n] of perScreen) expect(n, `${m.id} teaches ${n} concepts on ${screen}`).toBeLessThanOrEqual(1);
    });
  }
});

describe("rule 4: at most 3 cards shown at once per level", () => {
  it("the next card shows at most three items", () => {
    expect(materiality.nextCard.smallCards + 1).toBeLessThanOrEqual(3);
  });
  it("each level's cards on any one screen, the core's plus every module's that is on or beta", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const byScreen = new Map<string, string[]>();
      for (const m of counted) for (const c of m.adds.cards) if (c.level === level) byScreen.set(c.screen, [...(byScreen.get(c.screen) ?? []), `${m.id}:${c.id}`]);
      for (const [screen, cards] of byScreen) expect(cards.length, `level ${level} on ${screen}: ${cards.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });
});

describe("rule 5: a new module fits the budget or names what it replaces", () => {
  for (const m of modules) {
    if (m.core) continue;
    it(m.id, () => {
      for (const level of [1, 2, 3, 4, 5]) {
        const mine = m.adds.cards.filter((c) => c.level === level);
        if (!mine.length) continue;
        const screens = new Set(mine.map((c) => c.screen));
        const others = counted.filter((x) => x.id !== m.id).flatMap((x) => x.adds.cards.filter((c) => c.level === level && screens.has(c.screen)));
        const over = [...screens].some((screen) => others.filter((c) => c.screen === screen).length + mine.filter((c) => c.screen === screen).length > 3);
        if (over) {
          const replaced = others.filter((c) => m.replaces.includes(c.id));
          expect(replaced.length, `${m.id} takes level ${level} past 3 cards and names nothing it replaces there`).toBeGreaterThan(0);
        }
      }
    });
  }
});
