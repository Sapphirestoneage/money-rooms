import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, userValue, type ExampleHouseholdFile, type Household } from "../model";
import { basicsChecklist, estateView, freedomBudget, givingForever, legacyFi, legacyProjectsFromGoals, sustainableWithdrawalRate } from "./legacy";
import { milestones, spectrumLine } from "./milestones";

const asOf = "2026-10-03";
const mayaHousehold = (): Household => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("Level 3 milestones and the FIRE spectrum", () => {
  const list = milestones(mayaHousehold());
  it("every milestone has a condition and a date or a reason it has none", () => {
    expect(list.map((m) => m.id)).toEqual(["walkAway", "business", "coast", "lean", "barista", "flex", "slow", "fi", "fat"]);
    for (const m of list) {
      expect(m.condition.length).toBeGreaterThan(10);
      if (!m.comingSoon) expect(m.age === null || m.age >= 25).toBe(true);
    }
  });
  it("Flex FI shows coming soon until M6 (acceptance test 6)", () => {
    const flex = list.find((m) => m.id === "flex")!;
    expect(flex.comingSoon).toBe(true);
    expect(flex.age).toBeNull();
  });
  it("Lean FI comes no later than FI, Fat FI no sooner, and Coast FI before FI (acceptance tests 4 and 5)", () => {
    const by = Object.fromEntries(list.map((m) => [m.id, m]));
    expect(by.lean!.age!).toBeLessThanOrEqual(by.fi!.age!);
    expect(by.fat!.age!).toBeGreaterThanOrEqual(by.fi!.age!);
    expect(by.coast!.age!).toBeLessThanOrEqual(by.fi!.age!);
    expect(by.barista!.age!).toBeLessThanOrEqual(by.fi!.age!);
    expect(by.lean!.detail).toMatch(/^About \$[\d,]+ a year$/);
  });
  it("Slow FI names the extra spending that still reaches FI by the target age", () => {
    const slow = list.find((m) => m.id === "slow")!;
    expect(slow.detail).toMatch(/spend about \$[\d,]+ more a year and still be FI by \d+|No room/);
    expect(slow.age).toBe(list.find((m) => m.id === "fi")!.age! + 5);
  });
  it("the spectrum line lists dated milestones by age", () => {
    const line = spectrumLine(list);
    expect(line).toMatch(/^([A-Za-z\- ]+ \d+\. )+[A-Za-z\- ]+ \d+\.$/);
    expect(line).not.toMatch(/Flex/);
  });
  it("settings change the dates: a bigger Fat FI multiplier moves Fat FI later", () => {
    const h = mayaHousehold();
    h.milestones = { fatFiMultiplier: userValue(2.5, asOf) };
    const fat = milestones(h).find((m) => m.id === "fat")!;
    expect(fat.age ?? 999).toBeGreaterThanOrEqual(list.find((m) => m.id === "fat")!.age ?? 0);
  });
});

describe("Level 5 legacy", () => {
  it("the estate view applies the heir rate to pretax only (acceptance test 1)", () => {
    const h = mayaHousehold();
    h.drawdown = { heirTaxRatePercent: userValue(30, asOf) };
    const v = estateView(h);
    expect(v.heirTaxRatePercent).toBe(30);
    for (const band of ["best", "likely", "worst"] as const) {
      const b = v.byBand[band];
      expect(b.after).toBeCloseTo(b.before - 0.3 * b.pretax, 2);
      expect(b.roth + b.taxable + b.cash + b.pretax).toBeGreaterThanOrEqual(b.before - 1);
    }
  });
  it("giving forever is the annual amount over the plan's sustainable withdrawal rate (acceptance test 2)", () => {
    const rate = sustainableWithdrawalRate(mayaHousehold());
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.08);
    expect(givingForever(5000, 0.04)).toBe(125000);
    expect(givingForever(5000, null)).toBeNull();
  });
  it("Legacy FI is the earliest year the plan stays funded with every project paid (acceptance test 3)", () => {
    const h = mayaHousehold();
    const base = legacyFi(h);
    h.legacy = { projects: [{ id: "p1", name: "Scholarship", type: "scholarship", oneOffCost: userValue(0, asOf), annualCost: userValue(5000, asOf), hoursPerWeek: userValue(3, asOf), startAge: 45, horizonYears: null }, { id: "p2", name: "Book", type: "book", oneOffCost: userValue(8000, asOf), annualCost: userValue(0, asOf), hoursPerWeek: userValue(10, asOf), startAge: 43, horizonYears: 1 }] };
    const withProjects = legacyFi(h);
    expect(withProjects.projectsAnnual).toBe(5000);
    expect(withProjects.projectsOneOff).toBe(8000);
    expect(withProjects.age!).toBeGreaterThanOrEqual(base.age!);
    expect(withProjects.targetWithRoom!).toBeGreaterThan(0);
  });
  it("the freedom budget flags when legacy hours exceed available hours (acceptance test 4)", () => {
    const h = mayaHousehold();
    h.legacy = { projects: [{ id: "p", name: "Mentoring", type: "mentoring", oneOffCost: userValue(0, asOf), annualCost: userValue(0, asOf), hoursPerWeek: userValue(50, asOf), startAge: 42, horizonYears: null }] };
    const b = freedomBudget(h);
    expect(b.overCommitted).toBe(true);
    expect(b.sentence).toMatch(/more than the 45 free hours/);
    h.legacy.projects![0]!.hoursPerWeek = userValue(15, asOf);
    expect(freedomBudget(h).sentence).toBe("After FI you'd have about 45 free hours a week. Your legacy projects use 15. That leaves 30 for everything else.");
  });
  it("tagging a dream as legacy moves it to the projects without losing its price (acceptance test 5)", () => {
    const h = mayaHousehold();
    h.goals = [{ id: "g1", name: "Family cabin", cost: userValue(60000, asOf), cadence: "oneOff", startAge: 50, endAge: 50, priority: "want", legacy: true }, { id: "g2", name: "Lisbon", cost: userValue(5000, asOf), cadence: "oneOff", startAge: 32, endAge: 32, priority: "dream" }];
    const projects = legacyProjectsFromGoals(h);
    expect(projects.length).toBe(1);
    expect(projects[0]!.name).toBe("Family cabin");
    expect(projects[0]!.oneOffCost.value).toBe(60000);
    expect(h.goals.length).toBe(2);
  });
  it("the basics checklist has four items, each with what happens without it, unsure by default", () => {
    const items = basicsChecklist(mayaHousehold());
    expect(items.length).toBe(4);
    for (const i of items) {
      expect(i.answer).toBe("unsure");
      expect(i.without).toMatch(/^Without/);
    }
  });
});
