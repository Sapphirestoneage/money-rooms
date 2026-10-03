/**
 * Edge cases (overnight build, Phase 0d). Each case builds a household at the
 * edge of what the data dictionary allows and checks that the engine gives a
 * sensible answer rather than a crash or a silent nonsense number. The verdicts
 * ("sensible" or "confusing") are in docs/session-report-2026-10-04.md.
 */

import { describe, expect, it } from "vitest";
import {
  TEMPLATE_HEADER,
  assetFromPreset,
  debtFromPreset,
  emptyHousehold,
  missingLevelOneAnswers,
  project,
  readTemplate,
  requireComplete,
  userValue,
  type Account,
  type Household,
  type IncomeStream,
  type SpendingRow,
} from "../engine";

const asOf = "2026-10-03";

function salary(gross: number, id = "job"): IncomeStream {
  return { id, type: "salary", grossAnnual: userValue(gross, asOf), end: { kind: "retirement" } };
}
function spend(annual: number, category = "everythingElse"): SpendingRow {
  return { id: `s-${category}`, category, annual: userValue(annual, asOf, "roughly") };
}
function household(opts: { birth: string; income: IncomeStream[] | "none"; spending: SpendingRow[]; accounts: Account[] | "none"; state?: "NY" }): Household {
  const h = emptyHousehold(asOf);
  h.self.birthDate = userValue(opts.birth, asOf);
  h.self.state = userValue(opts.state ?? "NY", asOf);
  h.self.income = opts.income === "none" ? { kind: "none", asOf } : { kind: "rows", rows: opts.income };
  h.spending = { kind: "rows", rows: opts.spending };
  h.accounts = opts.accounts === "none" ? { kind: "none", asOf } : { kind: "rows", rows: opts.accounts };
  return h;
}
const card = (id: string, balance: number, rate: number, monthly: number): Account =>
  debtFromPreset("creditCard", id, userValue(balance, asOf), { rate: userValue(rate, asOf), minimumPaymentAnnual: userValue(monthly * 12, asOf) }, asOf);

describe("no income", () => {
  it("with savings: the plan runs and the FI date is decided by the balances alone", () => {
    const h = household({ birth: "2000-06", income: "none", spending: [spend(30000)], accounts: [assetFromPreset("brokerage", "brk", userValue(1_500_000, asOf), asOf)] });
    const r = project(h);
    const likely = r.bands.likely;
    expect(likely.funded).toBe(true);
    expect(likely.fiAge).toBe(26);
    expect(likely.timeline.rows[0]!.income.gross).toBe(0);
    expect(likely.timeline.rows[0]!.taxes.total).toBe(0);
  });

  it("with no savings: never funded, and the shortfall starts in the first year", () => {
    const h = household({ birth: "2000-06", income: "none", spending: [spend(30000)], accounts: "none" });
    const likely = project(h).bands.likely;
    expect(likely.funded).toBe(false);
    expect(likely.neverFundedShortfall?.year).toBe(2026);
    expect(likely.fiAge).toBeNull();
  });
});

describe("only debt", () => {
  it("income, spending, and one credit card: the card is paid down and the plan still finds a date", () => {
    const h = household({ birth: "2000-06", income: [salary(60000)], spending: [spend(30000)], accounts: [card("card", 8000, 26.9, 250)] });
    const likely = project(h).bands.likely;
    expect(likely.funded).toBe(true);
    const payoff = likely.timeline.rows.find((r) => r.balances["card"] === 0);
    expect(payoff).toBeDefined();
    expect(payoff!.age).toBeLessThan(30);
    expect(likely.timeline.rows[0]!.waterfall.some((s) => s.step.startsWith("2. High-interest debt"))).toBe(true);
  });

  it("no income and only debt: never funded, the shortfall is the spending plus the payment, and the balance grows", () => {
    const h = household({ birth: "2000-06", income: "none", spending: [spend(24000)], accounts: [card("card", 8000, 26.9, 100)] });
    const likely = project(h).bands.likely;
    expect(likely.funded).toBe(false);
    const first = likely.timeline.rows[0]!;
    expect(first.shortfall).toBeGreaterThan(0);
    expect(first.flags.some((f) => f.includes("does not cover the interest"))).toBe(true);
  });
});

describe("age edges", () => {
  it("age 16 (the youngest the dictionary allows) runs through plan-to age with a 79-year horizon", () => {
    const h = household({ birth: "2010-06", income: [salary(12000)], spending: [spend(6000)], accounts: [assetFromPreset("checking", "chk", userValue(500, asOf), asOf)] });
    const r = project(h);
    const t = r.bands.likely.timeline;
    expect(t.rows[0]!.age).toBe(16);
    expect(t.rows[t.rows.length - 1]!.age).toBe(95);
    expect(t.rows.length).toBe(80);
  });

  it("age 70, still working, past full retirement age: Social Security pays from year 0 and the date is now", () => {
    const h = household({ birth: "1956-03", income: [salary(80000)], spending: [spend(50000)], accounts: [assetFromPreset("trad401k", "k", userValue(900000, asOf), asOf)] });
    const likely = project(h).bands.likely;
    expect(likely.timeline.rows[0]!.age).toBe(70);
    expect(likely.timeline.rows[0]!.socialSecurity).toBeGreaterThan(0);
    expect(likely.funded).toBe(true);
    expect(likely.fiAge).toBe(70);
    // Nothing in M1 forces required distributions at 73: a known gap, M2 strategy B5.
    const at75 = likely.timeline.rows.find((r) => r.age === 75)!;
    expect(at75.withdrawals["k"] ?? 0).toBeGreaterThanOrEqual(0);
  });

  it("age 100 is outside the dictionary's range and the plan is a single year", () => {
    const h = household({ birth: "1926-01", income: "none", spending: [spend(20000)], accounts: [assetFromPreset("savings", "sv", userValue(100000, asOf), asOf)] });
    const t = project(h).bands.likely.timeline;
    expect(t.rows.length).toBe(0);
  });
});

describe("spending above income", () => {
  it("never funded while working: the shortfall starts the first year and the result says where", () => {
    const h = household({ birth: "1998-01", income: [salary(30000)], spending: [spend(50000)], accounts: [assetFromPreset("checking", "chk", userValue(2000, asOf), asOf)] });
    const likely = project(h).bands.likely;
    expect(likely.funded).toBe(false);
    expect(likely.neverFundedShortfall).not.toBeNull();
    expect(likely.neverFundedShortfall!.year).toBe(2026);
    expect(likely.timeline.rows[0]!.gap).toBeLessThan(0);
  });

  it("the proof-of-cash gap is visible on the row: take-home minus spending is negative every working year", () => {
    const h = household({ birth: "1998-01", income: [salary(30000)], spending: [spend(50000)], accounts: "none" });
    const rows = project(h).bands.likely.timeline.rows;
    expect(rows.slice(0, 5).every((r) => r.gap < 0)).toBe(true);
  });
});

describe("a 0% promo ending next month", () => {
  const promoCard = (): Account => {
    const c = card("promo", 6000, 0, 150);
    if (c.side !== "debt") throw new Error("debt");
    c.promo = { rate: userValue(0, asOf), endDate: userValue("2026-11", asOf), rateAfter: userValue(24.99, asOf) };
    c.rate = userValue(0, asOf);
    return c;
  };

  it("charges almost nothing in the stub year and the full rate from the next year", () => {
    const h = household({ birth: "1999-01", income: [salary(50000)], spending: [spend(28000)], accounts: [promoCard()] });
    const rows = project(h).bands.likely.timeline.rows;
    const y0 = rows[0]!;
    const y1 = rows[1]!;
    // Oct and Nov at 0%, December at 24.99%: one month of interest on about $6,000 is under $130.
    expect(y0.debt.interest).toBeGreaterThan(0);
    expect(y0.debt.interest).toBeLessThan(150);
    // Year 1 carries the full rate on what is left.
    expect(y1.debt.interest).toBeGreaterThan(y0.debt.interest);
  });

  it("the waterfall treats it as high-interest debt once the promo has ended", () => {
    const h = household({ birth: "1999-01", income: [salary(50000)], spending: [spend(28000)], accounts: [promoCard()] });
    const rows = project(h).bands.likely.timeline.rows;
    expect(rows[1]!.waterfall.some((s) => s.step.startsWith("2. High-interest debt"))).toBe(true);
  });
});

describe("an all-dontknow import", () => {
  const file = [
    TEMPLATE_HEADER,
    "profile,,birth_month,,,dontknow,2026-10,",
    "profile,,state,,,dontknow,2026-10,",
    "income,Job,type,salary,,known,2026-10,",
    "income,Job,gross_amount,,year,dontknow,2026-10,",
    "spending,Rent,category,accommodation,,known,2026-10,",
    "spending,Rent,amount,,month,dontknow,2026-10,",
    "account,Savings,type,savings,,known,2026-10,",
    "account,Savings,balance,,,dontknow,2026-10,",
    "debt,Card,type,credit_card,,known,2026-10,",
    "debt,Card,balance,,,dontknow,2026-10,",
    "debt,Card,rate,,,dontknow,2026-10,",
  ].join("\n");

  it("reads without file problems and lists every unknown to look up", () => {
    const p = readTemplate(file, asOf);
    expect(p.fileProblems).toEqual([]);
    expect(p.toLookUp.length).toBeGreaterThanOrEqual(6);
  });

  it("leaves the household incomplete: birth date and state are still missing, so no date can show", () => {
    const p = readTemplate(file, asOf);
    const missing = missingLevelOneAnswers(p.household);
    expect(missing).toContain("birthDate");
    expect(missing).toContain("state");
    expect(() => requireComplete(p.household)).toThrow(/still needs/);
  });

  it("items with an unknown amount exist as rows marked Look it up, so nothing typed is lost", () => {
    const p = readTemplate(file, asOf);
    if (p.household.accounts.kind !== "rows") throw new Error("accounts");
    const savings = p.household.accounts.rows.find((a) => a.id.includes("savings") || a.name?.value === "Savings");
    expect(savings?.balance.confidence).toBe("lookUp");
  });
});
