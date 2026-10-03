import { describe, expect, it } from "vitest";
import dev from "../../tests/households/dev.json";
import maya from "../../tests/households/maya.json";
import { householdFromExample, userValue, type ExampleHouseholdFile, type GoalBucket, type Household } from "../model";
import { applyBlock, applyBlocks, blockFromQuestionnaire, blockHeadline } from "./blocks";
import { planMarkers, priceCard, trueAmount } from "./dreams";
import { goalsInPlan, withGoals } from "./goals";
import { comparePayoffMethods, payoffDebts, payoffOrder, simulate } from "./payoff";

const asOf = "2026-10-03";
const mayaHousehold = (): Household => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("scenario blocks (dictionary 9.5, decision X5)", () => {
  it("applying a block never edits the real rows", () => {
    const h = mayaHousehold();
    const before = JSON.stringify(h);
    const block = blockFromQuestionnaire("car", "b1", "A car", "2028-03");
    const c = applyBlock(h, block);
    expect(JSON.stringify(h)).toBe(before);
    expect(c.accounts.kind === "rows" && c.accounts.rows.length).toBeGreaterThan(h.accounts.kind === "rows" ? h.accounts.rows.length : 0);
  });

  it("the questionnaire expands into dated changes: a home adds a mortgage, upkeep, and removes the rent and the down payment", () => {
    const block = blockFromQuestionnaire("home", "home1", "A home", "2030-06", { price: 400000, downPercent: 20, ratePercent: 6, rentReplaced: 1600 });
    const targets = block.changes.map((c) => `${c.target}.${c.op}`);
    expect(targets).toEqual(["asset.remove", "debt.add", "spending.add", "spending.add"]);
    const debt = block.changes.find((c) => c.target === "debt")!;
    expect(debt.target === "debt" && debt.balance).toBe(320000);
    expect(debt.target === "debt" && Math.round(debt.paymentMonthly)).toBe(1919);
    expect(block.confidence).toBe("roughly");
  });

  it("the headline shows the change in monthly cash flow and the FI date moved; two start dates compare", () => {
    const h = mayaHousehold();
    const kid = blockFromQuestionnaire("kid", "k1", "A kid", "2029-01", { annualCost: 15000, years: 18, childcareAnnual: 12000 });
    const a = blockHeadline(h, kid, "2029-01");
    expect(a.monthlyCashFlowChange).toBeLessThan(-1000);
    expect(a.fiDeltaYears!).toBeGreaterThan(0);
    const later = blockHeadline(h, kid, "2036-01");
    expect(later.fiAgeWithout).toBe(a.fiAgeWithout);
  });

  it("blocks stack in order and a replacing block skips the one it replaces", () => {
    const h = mayaHousehold();
    const car1 = blockFromQuestionnaire("car", "c1", "Car one", "2028-01");
    const car2 = { ...blockFromQuestionnaire("car", "c2", "Car two", "2028-01"), relation: { kind: "replacing" as const, blockId: "c1" } };
    h.blocks = [car1, car2];
    const c = applyBlocks(h);
    const debts = c.accounts.kind === "rows" ? c.accounts.rows.filter((a) => a.side === "debt" && a.id.startsWith("block-")) : [];
    expect(debts.length).toBe(1);
    expect(debts[0]!.id).toMatch(/c2/);
  });

  it("a sabbatical pauses income for its months and the stream resumes after", () => {
    const h = mayaHousehold();
    const sab = blockFromQuestionnaire("sabbatical", "s1", "Lisbon", "2032-03", { months: 6, costTotal: 12000 });
    const c = applyBlock(h, sab);
    if (c.self.income.kind !== "rows") throw new Error("income");
    const job = c.self.income.rows.find((r) => r.id === "job")!;
    expect(job.end).toEqual({ kind: "date", date: "2032-02" });
    const resumed = c.self.income.rows.find((r) => r.id.endsWith("-job-after"))!;
    expect(resumed.start).toBe("2032-09");
  });
});

describe("goal buckets in the projection", () => {
  const dream = (id: string, cost: number, startAge: number, priority: GoalBucket["priority"]): GoalBucket => ({ id, name: id, cost: userValue(cost, asOf), cadence: "oneOff", startAge, endAge: startAge, priority });
  it("lays goals into spending as dated rows", () => {
    const h = mayaHousehold();
    const c = withGoals(h, [dream("trip", 5000, 32, "dream")]);
    expect(c.spending.kind === "rows" && c.spending.rows.find((r) => r.id === "goal-trip")?.start).toBe("2033-01");
  });
  it("trims dreams first, then wants, protects musts, and says when a trimmed goal fits", () => {
    const h = mayaHousehold();
    h.goals = [dream("cabin", 400000, 40, "dream"), dream("wedding", 30000, 30, "want"), dream("car", 15000, 28, "must")];
    const r = goalsInPlan(h);
    expect(r.trimmed.map((g) => g.id)).toContain("cabin");
    expect(r.kept.map((g) => g.id)).toContain("car");
    expect(r.withKept.funded).toBe(true);
    expect(r.withAll.retirementYear! >= r.baseline.retirementYear!).toBe(true);
    for (const g of r.trimmed) expect(r.affordableAt[g.id] === null || r.affordableAt[g.id]! >= g.startAge).toBe(true);
  });
});

describe("the price card (acceptance tests 1 to 3)", () => {
  it("shows cost in time, true amount, the other side, and best timing, in that order", () => {
    const h = mayaHousehold();
    const trip: GoalBucket = { id: "lisbon", name: "Six months in Lisbon", cost: userValue(20000, asOf), cadence: "oneOff", startAge: 32, endAge: 32, priority: "dream" };
    h.goals = [trip];
    const card = priceCard(h, trip, undefined, 8);
    expect(Object.keys(card).indexOf("costYears")).toBeLessThan(Object.keys(card).indexOf("trueAmount"));
    expect(Object.keys(card).indexOf("trueAmount")).toBeLessThan(Object.keys(card).indexOf("otherSide"));
    expect(Object.keys(card).indexOf("otherSide")).toBeLessThan(Object.keys(card).indexOf("curve"));
    expect(card.costYears).not.toBeNull();
    expect(card.curve.length).toBe(9);
    expect(card.cheapestAge).not.toBeNull();
    expect(card.cheapestCostYears!).toBeLessThanOrEqual(card.costYears!);
    expect(card.otherSide).toMatch(/What would you rather have/);
    expect(card.milestonesMoved.length).toBeGreaterThan(0);
  });
  it("the true amount is the cost grown at the likely return to the stated age (test 2)", () => {
    expect(trueAmount(5000, 25, 65, 6.05)).toBeCloseTo(5000 * Math.pow(1.0605, 40), 6);
    const h = mayaHousehold();
    const trip: GoalBucket = { id: "t", name: "Trip", cost: userValue(5000, asOf), cadence: "oneOff", startAge: 25, endAge: 25, priority: "dream" };
    const card = priceCard(h, trip, undefined, 2);
    expect(card.trueAmountAge).toBe(65);
    expect(card.trueAmount).toBeCloseTo(5000 * Math.pow(1 + (0.9 * 6.5 + 0.1 * 2.0) / 100, 40), 3);
  });
  it("the timing curve's markers match the plan's actual event dates (test 3)", () => {
    const h = mayaHousehold();
    const markers = planMarkers(h);
    const payoff = markers.find((m) => m.label.includes("paid off"));
    expect(payoff).toBeDefined();
    expect(markers.some((m) => m.label === "FI" || m.label === "Coast FI")).toBe(true);
    const trip: GoalBucket = { id: "t", name: "Trip", cost: userValue(5000, asOf), cadence: "oneOff", startAge: 26, endAge: 26, priority: "dream" };
    const card = priceCard(h, trip, undefined, 12);
    const point = card.curve.find((p) => p.startAge === payoff!.age);
    if (point) expect(point.markers).toContain(payoff!.label);
  });
});

describe("payoff methods (decision M2)", () => {
  const debts = [
    { id: "card", label: "Card", balance: 6800, ratePercent: 26.9, minimumMonthly: 200, stress: 3 },
    { id: "mom", label: "Family loan", balance: 5000, ratePercent: 0, minimumMonthly: 100, stress: 5 },
    { id: "auto", label: "Car", balance: 9000, ratePercent: 7, minimumMonthly: 250, stress: 1 },
  ];
  it("avalanche goes by rate, snowball by balance, peace-first by the fewest stress-months", () => {
    expect(payoffOrder(debts, "avalanche", 800)).toEqual(["card", "auto", "mom"]);
    expect(payoffOrder(debts, "snowball", 800)).toEqual(["mom", "card", "auto"]);
    const peace = payoffOrder(debts, "peaceFirst", 800);
    expect(peace[0]).toBe("mom");
  });
  it("the simulation pays every minimum, sends the rest to the first debt, and reports months, interest, and stress-months", () => {
    const r = simulate(debts, ["card", "auto", "mom"], 800);
    expect(r.monthsToDebtFree).toBeGreaterThan(20);
    expect(r.monthsToDebtFree).toBeLessThan(40);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.paidOffMonth.card!).toBeLessThan(r.paidOffMonth.mom!);
    expect(r.stressMonths).toBeGreaterThan(0);
  });
  it("side by side: the price of peace is the extra interest, and peace-first saves stress-months", () => {
    const h = householdFromExample({ ...(maya as ExampleHouseholdFile) }, asOf);
    if (h.accounts.kind !== "rows") throw new Error("accounts");
    expect(payoffDebts(h).length).toBe(1);
    const devHousehold = householdFromExample(dev as ExampleHouseholdFile, asOf);
    const c = comparePayoffMethods(devHousehold, 100);
    expect(c.plans.map((p) => p.method)).toEqual(["avalanche", "snowball", "peaceFirst"]);
    expect(c.priceOfPeace).toBeGreaterThanOrEqual(0);
    expect(c.peaceGained).toBeGreaterThanOrEqual(0);
    const avalanche = c.plans[0]!;
    for (const p of c.plans) expect(p.totalInterest).toBeGreaterThanOrEqual(avalanche.totalInterest - 1e-6);
  });
});
