/**
 * The M2 engine (docs/m2-spec.md), checked piece by piece on Maya and on small
 * built households. Every case runs under m2 conventions; the Maya tie-out in
 * households.test.ts keeps m1 conventions honest.
 */

import { describe, expect, it } from "vitest";
import {
  assetFromPreset,
  defaultDeps,
  defaultPolicy,
  emptyHousehold,
  findFiDate,
  householdFromExample,
  loadRules,
  project,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  runTimeline,
  userValue,
  type Account,
  type DrawdownPolicy,
  type ExampleHouseholdFile,
  type Household,
  type IncomeStream,
  type SpendingRow,
  type WorkplacePlan,
} from "../engine";
import maya from "./households/maya.json";

const asOf = "2026-10-03";
const deps = defaultDeps();
const likelyBand = (h: Household) => resolveBand(resolveAssumptions(h.assumptions), "likely");
const run = (h: Household, retirementYear: number, policy?: DrawdownPolicy) =>
  runTimeline(requireComplete(h), { band: likelyBand(h), retirementYear, tables: deps.tables, ssParams: deps.ssParams, conventions: "m2", ...(policy ? { policy } : {}) });

function salary(gross: number, extra: Partial<IncomeStream> = {}): IncomeStream {
  return { id: "job", type: "salary", grossAnnual: userValue(gross, asOf), end: { kind: "retirement" }, ...extra };
}
function spend(annual: number): SpendingRow {
  return { id: "s", category: "everythingElse", annual: userValue(annual, asOf, "roughly") };
}
function household(o: { birth: string; income: IncomeStream[] | "none"; spending: number; accounts: Account[]; plans?: WorkplacePlan[] }): Household {
  const h = emptyHousehold(asOf);
  h.self.birthDate = userValue(o.birth, asOf);
  h.self.state = userValue("NY", asOf);
  h.self.income = o.income === "none" ? { kind: "none", asOf } : { kind: "rows", rows: o.income };
  h.spending = { kind: "rows", rows: [spend(o.spending)] };
  h.accounts = { kind: "rows", rows: o.accounts };
  if (o.plans) h.plans = o.plans;
  return h;
}
const brokerage = (balance: number, basis?: number): Account => {
  const a = assetFromPreset("brokerage", "brk", userValue(balance, asOf), asOf);
  if (basis !== undefined) a.costBasis = userValue(basis, asOf);
  return a;
};
const pretax = (balance: number, planId?: string): Account => {
  const a = assetFromPreset("trad401k", "k401", userValue(balance, asOf), asOf);
  if (planId) a.planId = planId;
  return a;
};
const roth = (balance: number, basis: number): Account => {
  const a = assetFromPreset("rothIRA", "roth", userValue(balance, asOf), asOf);
  a.rothBasis = userValue(basis, asOf);
  return a;
};
const plan = (id: string, over: Partial<WorkplacePlan> = {}): WorkplacePlan => ({
  id, employerIncomeId: "job", planType: "401k", ruleOf55Allowed: userValue("unknown", asOf), megaBackdoorAllowed: userValue("unknown", asOf), rothOffered: userValue(true, asOf), ...over,
});

describe("rules come only from the registry", () => {
  it("every rule a run used is listed with its source and verified date, and only verified rules are used", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const t = project(h, deps).bands.likely.timeline;
    expect(t.conventions).toBe("m2");
    expect(t.rulesUsed.length).toBeGreaterThan(5);
    for (const r of t.rulesUsed) {
      expect(r.lastVerified).not.toBeNull();
      expect(r.url).toMatch(/^https:\/\//);
    }
    expect(t.rulesUsed.map((r) => r.id)).toEqual(expect.arrayContaining(["fed.brackets.2026", "fed.standardDeduction.2026", "ss.taxationThresholds", "fed.niit"]));
  });

  it("an unverified rule is in the registry but never in a run", () => {
    const unverified = [...loadRules().values()].filter((r) => r.lastVerified === null).map((r) => r.id);
    expect(unverified).toContain("ss.wageBase.2026");
    const t = project(householdFromExample(maya as ExampleHouseholdFile, asOf), deps).bands.likely.timeline;
    for (const id of unverified) expect(t.rulesUsed.map((r) => r.id)).not.toContain(id);
  });

  it("names the sunsetting and watched rules the plan leans on (tripwires)", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const t = project(h, deps).bands.likely.timeline;
    expect(t.tripwires.map((r) => r.id)).toEqual(expect.arrayContaining(["health.acaPtc.2026"]));
  });
});

describe("m1 conventions are untouched", () => {
  it("the same household under m1 has no M2 detail and uses no rules", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const t = project(h, { ...deps, conventions: "m1" }).bands.likely.timeline;
    expect(t.conventions).toBe("m1");
    expect(t.rulesUsed).toEqual([]);
    expect(t.rows[0]!.m2).toBeUndefined();
  });
});

describe("capital gains with cost basis", () => {
  it("selling from a taxable account realizes gains in proportion to the unrealized share, and they fall in the 0% bracket when income is low", () => {
    const h = household({ birth: "1990-01", income: "none", spending: 40000, accounts: [brokerage(1_000_000, 400_000)] });
    const t = run(h, 2026);
    const y1 = t.rows[1]!;
    const sold = y1.withdrawals["brk"]!;
    expect(sold).toBeGreaterThan(30000);
    // 60% of each dollar sold is gain (basis is 40% of the balance at the start, a little less after year 0).
    expect(y1.m2!.gainsRealized / sold).toBeGreaterThan(0.55);
    expect(y1.m2!.gainsRealized / sold).toBeLessThan(0.65);
    expect(y1.m2!.taxDetail.capitalGains).toBe(0);
    expect(y1.taxes.federalIncome).toBe(0);
  });

  it("a large sale crosses the 0% top and owes 15% on the part above it", () => {
    const h = household({ birth: "1990-01", income: "none", spending: 150000, accounts: [brokerage(3_000_000, 300_000)] });
    const y1 = run(h, 2026).rows[1]!;
    expect(y1.m2!.taxDetail.capitalGains).toBeGreaterThan(0);
    expect(y1.m2!.taxDetail.ordinary).toBe(0);
  });
});

describe("Roth ordering with basis (A1) replaces the M1 simplification", () => {
  it("drawing Roth earnings before 59 and a half is taxed and penalized at M2 depth, and free in M1", () => {
    const h = household({ birth: "1990-01", income: "none", spending: 50000, accounts: [roth(400_000, 50_000)] });
    const m2 = run(h, 2026);
    const y3 = m2.rows[3]!;
    // Basis (50,000) is gone after about a year; by year 3 the draw is earnings.
    expect(y3.m2!.penalized).toBeGreaterThan(0);
    expect(y3.taxes.penalty).toBeGreaterThan(0);
    expect(y3.taxes.federalIncome).toBeGreaterThan(0);
    const m1 = runTimeline(requireComplete(h), { band: likelyBand(h), retirementYear: 2026, tables: deps.tables, ssParams: deps.ssParams, conventions: "m1" });
    expect(m1.rows[3]!.taxes.penalty).toBe(0);
  });
});

describe("Roth conversion ladder (A2, B1, B2)", () => {
  const h = household({ birth: "1986-01", income: "none", spending: 36000, accounts: [brokerage(900_000, 800_000), pretax(600_000)] });

  it("fill the standard deduction: converts exactly the deduction each year and pays no ordinary tax on it", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fillStandardDeduction" });
    const y1 = t.rows[1]!;
    expect(y1.m2!.conversion).toBeCloseTo(16100, 0);
    expect(y1.m2!.taxDetail.ordinary).toBe(0);
    const without = run(h, 2026).rows[1]!;
    expect(y1.balances["k401"]!).toBeLessThan(without.balances["k401"]! - 15000);
    expect(y1.m2!.actions.join(" ")).toMatch(/Convert about 16,100/);
  });

  it("fill the 12% bracket converts more and pays tax at 10% and 12%", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fill12" });
    const y1 = t.rows[1]!;
    expect(y1.m2!.conversion).toBeCloseTo(16100 + 50400, 0);
    expect(y1.m2!.taxDetail.ordinary).toBeCloseTo(1240 + 0.12 * (50400 - 12400), 0);
  });

  it("converted dollars come out penalty free five years later, under 59 and a half", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fill12", withdrawalOrder: "conventional" });
    // The brokerage runs down eventually; when Roth is drawn the seasoned conversions are free.
    const rothDraws = t.rows.filter((r) => (r.withdrawals["engine:rothIRA"] ?? 0) > 0 && r.age < 59);
    if (rothDraws.length) expect(rothDraws[0]!.m2!.penalized).toBe(0);
    expect(t.rows.some((r) => r.m2!.conversion > 0)).toBe(true);
  });

  it("a year lock sets that year's conversion exactly and leaves the others to the policy", () => {
    const policy: DrawdownPolicy = { ...defaultPolicy(), conversionTarget: "fillStandardDeduction", locks: { 2028: { conversion: 30000 }, 2029: { conversion: 0 } } };
    const t = run(h, 2026, policy);
    expect(t.rows.find((r) => r.year === 2028)!.m2!.conversion).toBeCloseTo(30000, 0);
    expect(t.rows.find((r) => r.year === 2029)!.m2!.conversion).toBe(0);
    expect(t.rows.find((r) => r.year === 2030)!.m2!.conversion).toBeCloseTo(16100, 0);
  });
});

describe("0% gain harvesting (A5, B3)", () => {
  it("harvests the room left in the 0% bracket and raises basis by the same amount", () => {
    const h = household({ birth: "1986-01", income: "none", spending: 30000, accounts: [brokerage(1_000_000, 300_000)] });
    const t = run(h, 2026, { ...defaultPolicy(), gainHarvesting: "fillZeroBracket" });
    const y1 = t.rows[1]!;
    expect(y1.m2!.harvested).toBeGreaterThan(10000);
    // Taxable income (sales gains plus harvest less the deduction) lands at the top of the 0% bracket.
    expect(y1.m2!.gainsRealized - 16100).toBeCloseTo(49450, -1);
    expect(y1.m2!.taxDetail.capitalGains).toBe(0);
    const later = t.rows[8]!;
    const saleShare = (r: typeof y1) => (r.m2!.gainsRealized - r.m2!.harvested) / (r.withdrawals["brk"] ?? 1);
    expect(saleShare(later)).toBeLessThan(saleShare(y1));
  });
});

describe("ACA premium credit and the cliff (C1)", () => {
  const h = household({ birth: "1986-01", income: "none", spending: 36000, accounts: [brokerage(1_200_000, 1_000_000), pretax(500_000)] });

  it("keeping income at 200% of the poverty line caps conversions and prices the premium after the credit", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fillToAcaTarget", acaTarget: 200 });
    const y1 = t.rows[1]!;
    expect(y1.m2!.magiAca).toBeLessThanOrEqual(2 * 15960 + 1);
    expect(y1.m2!.healthcare.acaPctFpl).toBeCloseTo(200, 0);
    expect(y1.m2!.healthcare.total).toBeLessThan(7200);
    expect(y1.m2!.conversion).toBeGreaterThan(0);
  });

  it("filling the 22% bracket pushes income over the cliff and the plan pays the full premium", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fill22" });
    const y1 = t.rows[1]!;
    expect(y1.m2!.healthcare.total).toBeCloseTo(7200, 0);
    expect(y1.flags.join(" ")).toMatch(/above 400%/);
  });

  it("the stay-under-the-cliff limit holds conversions back", () => {
    const t = run(h, 2026, { ...defaultPolicy(), conversionTarget: "fill22", limits: { ...defaultPolicy().limits, stayUnderAcaCliff: true } });
    expect(t.rows[1]!.m2!.magiAca).toBeLessThanOrEqual(4 * 15960 + 1);
  });
});

describe("IRMAA with the two-year lookback (C3) and required distributions (B5)", () => {
  it("a big conversion at 63 raises Medicare premiums at 65, and RMDs start at 75 for someone born in 1965", () => {
    const h = household({ birth: "1963-01", income: "none", spending: 60000, accounts: [brokerage(1_500_000, 1_000_000), pretax(2_000_000)] });
    const policy: DrawdownPolicy = { ...defaultPolicy(), locks: { 2026: { conversion: 150000 } } };
    const t = run(h, 2026, policy);
    const at65 = t.rows.find((r) => r.age === 65)!;
    expect(at65.m2!.healthcare.irmaaTier).toBeGreaterThan(0);
    const at66 = t.rows.find((r) => r.age === 66)!;
    expect(at66.m2!.healthcare.irmaaTier).toBe(0);
    const h2 = household({ birth: "1965-01", income: "none", spending: 40000, accounts: [brokerage(3_000_000, 2_000_000), pretax(1_000_000)] });
    const t2 = run(h2, 2026);
    expect(t2.rows.find((r) => r.age === 74)!.m2!.rmd).toBe(0);
    expect(t2.rows.find((r) => r.age === 75)!.m2!.rmd).toBeGreaterThan(0);
  });
});

describe("72(t), rule of 55, and governmental 457(b) (A3, A4, A7)", () => {
  it("a 72(t) plan takes level penalty-free payments from the 401(k) before 59 and a half", () => {
    const h = household({ birth: "1976-01", income: "none", spending: 50000, accounts: [brokerage(20_000, 18_000), pretax(1_200_000)] });
    const t = run(h, 2026, { ...defaultPolicy(), sepp: { startAge: 51, method: "fixedAmortization", interestRatePercent: 5, federalMidTermRatePercent: 4 } });
    const y1 = t.rows[1]!;
    expect(y1.m2!.sepp).toBeGreaterThan(30000);
    expect(y1.m2!.penalized).toBe(0);
    expect(t.rows[5]!.m2!.sepp).toBeCloseTo(y1.m2!.sepp, 0);
    const without = run(h, 2026);
    expect(without.rows[1]!.m2!.penalized).toBeGreaterThan(0);
  });

  it("rule of 55: leaving at 56 from a plan that allows it makes 401(k) draws penalty free; without the plan's OK they are penalized", () => {
    const p = plan("p1", { ruleOf55Allowed: userValue("yes", asOf), separationAge: userValue(56, asOf) });
    const h = household({ birth: "1970-01", income: [salary(90000)], spending: 50000, accounts: [brokerage(20_000, 20_000), pretax(900_000, "p1")], plans: [p] });
    const sep = 2026 + (56 - 56);
    const t = run(h, sep, { ...defaultPolicy(), ruleOf55: true });
    const y1 = t.rows[1]!;
    expect(y1.withdrawals["k401"]).toBeGreaterThan(0);
    expect(y1.m2!.penalized).toBe(0);
    const off = run(h, sep, { ...defaultPolicy(), ruleOf55: false });
    expect(off.rows[1]!.m2!.penalized).toBeGreaterThan(0);
  });

  it("a governmental 457(b) gets its own limit in the waterfall and is penalty free after separation", () => {
    const p = plan("g457", { planType: "457bGovernmental" });
    const h = household({ birth: "1990-01", income: [salary(150000)], spending: 40000, accounts: [brokerage(50_000)], plans: [p] });
    h.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
    const t = run(h, 2060);
    const y1 = t.rows[1]!;
    expect(y1.waterfall.some((s) => s.step.startsWith("5. Governmental 457(b)"))).toBe(true);
    expect(y1.contributions["engine:457b"]).toBeCloseTo(24500, 0);
    expect(y1.contributions["engine:trad401k"]).toBeCloseTo(24500, 0);
  });
});

describe("the full savings waterfall (engine spec section 4)", () => {
  it("a deductible traditional IRA step applies under the phase-out, and the mega backdoor fills to the total additions limit", () => {
    const p = plan("p1", { megaBackdoorAllowed: userValue("yes", asOf) });
    const h = household({ birth: "1995-01", income: [salary(70000)], spending: 20000, accounts: [brokerage(10_000)], plans: [p] });
    h.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
    const y1 = run(h, 2060).rows[1]!;
    const steps = y1.waterfall.map((s) => s.step);
    expect(steps).toContain("6. Traditional IRA (deductible)");
    expect(y1.contributions["engine:tradIRA"]).toBeCloseTo(7500, 0);
    expect(steps.some((s) => s.startsWith("7. Mega backdoor"))).toBe(true);
    expect(y1.m2!.agi).toBeLessThan(70000 - 24500 - 7500 + 1);
  });

  it("above the IRA deduction phase-out the step is a Roth IRA, flagged as backdoor above the Roth limit", () => {
    const h = household({ birth: "1995-01", income: [salary(200000)], spending: 40000, accounts: [brokerage(10_000)], plans: [plan("p1")] });
    h.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
    const y1 = run(h, 2060).rows[1]!;
    expect(y1.waterfall.map((s) => s.step)).toContain("6. Roth IRA");
    expect(y1.flags.join(" ")).toMatch(/backdoor Roth/);
  });

  it("the contribution-type knob can test switching an entered 401(k) to Roth without changing what is stored", () => {
    const h = household({ birth: "1995-01", income: [salary(80000, { preTaxDeductions: [{ id: "d", type: "401k", percentOfPay: userValue(10, asOf), accountType: userValue("traditional", asOf) }] })], spending: 30000, accounts: [brokerage(10_000)] });
    const asEntered = run(h, 2060).rows[1]!;
    const asRoth = run(h, 2060, { ...defaultPolicy(), contributionType: "roth" }).rows[1]!;
    expect(asEntered.deductions.workplacePretax).toBeCloseTo(8000 * 1.015, 0);
    expect(asRoth.deductions.workplacePretax).toBe(0);
    expect(asRoth.deductions.workplaceRoth).toBeCloseTo(8000 * 1.015, 0);
    expect(asRoth.taxes.federalIncome).toBeGreaterThan(asEntered.taxes.federalIncome);
  });
});

describe("income after retirement (Barista FI, E6) and the claiming age knob (D1)", () => {
  it("a stream that ends at an age keeps paying after retirement under m2, and stops under m1", () => {
    const h = household({ birth: "1990-01", income: [salary(80000), { id: "gig", type: "sideGig", grossAnnual: userValue(20000, asOf, "roughly"), end: { kind: "age", age: 50 } }], spending: 40000, accounts: [brokerage(800_000, 600_000)] });
    const m2 = run(h, 2030);
    expect(m2.rows.find((r) => r.year === 2032)!.income.gross).toBeCloseTo(20000, 0);
    expect(m2.rows.find((r) => r.age === 51)!.income.gross).toBe(0);
    const m1 = runTimeline(requireComplete(h), { band: likelyBand(h), retirementYear: 2030, tables: deps.tables, ssParams: deps.ssParams, conventions: "m1" });
    expect(m1.rows.find((r) => r.year === 2032)!.income.gross).toBe(0);
  });

  it("claiming at 70 pays more per year than claiming at 62", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const at62 = findFiDate(requireComplete(h), likelyBand(h), { ...deps, policy: { ...defaultPolicy(), claimingAge: { years: 62, months: 0 } } });
    const at70 = findFiDate(requireComplete(h), likelyBand(h), { ...deps, policy: { ...defaultPolicy(), claimingAge: { years: 70, months: 0 } } });
    expect(at70.timeline.socialSecurity.annualBenefit).toBeGreaterThan(at62.timeline.socialSecurity.annualBenefit * 1.5);
    expect(at62.timeline.socialSecurity.claimingAgeYears).toBe(62);
  });
});

describe("Maya at M2 depth", () => {
  it("runs in every band, lands near her M1 date, and the ladder with harvesting lowers lifetime taxes", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const plain = project(h, deps).bands;
    expect(plain.likely.fiAge).toBeGreaterThanOrEqual(39);
    expect(plain.likely.fiAge).toBeLessThanOrEqual(43);
    const ladder = project(h, { ...deps, policy: { ...defaultPolicy(), conversionTarget: "fillStandardDeduction", gainHarvesting: "fillZeroBracket", acaTarget: 200 } }).bands.likely;
    expect(ladder.timeline.lifetimeTaxes).toBeLessThan(plain.likely.timeline.lifetimeTaxes);
    expect(ladder.timeline.rows.some((r) => r.m2!.conversion > 0)).toBe(true);
  });
});
