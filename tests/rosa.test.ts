/**
 * Rosa: the messy-financials test case (answers batch, Part 3; tests/households/rosa.json). Fictional and
 * anonymized. Every expected value is Eli's hand computation for 2026 under the 2026 rules, asserted within
 * $5. Where the engine differs, the test says why and asserts the engine's own figure beside Eli's, never
 * changing his. Expected values are never edited to make a test pass.
 *
 * Three conventions the hand sheet uses, applied to the 2026 return check and recorded here:
 * 1. No investment income. The engine taxes the savings account's interest and the brokerage's dividends
 *    (about $622 at the presets' yields, plus $19 of PA tax on it). The return is checked with a zero-return
 *    band so the figures compare like for like. The liquidation comparison stacks on the return as Eli did.
 * 2. The gap is met from cash. On the real numbers the engine meets the minus $2,054 gap by drawing $2,741
 *    from the 401(k) with the 10% penalty, because the $12,000 of cash sits inside the protected reserve
 *    (3 months of spending) and the brokerage is sold first only when it has gains to spare. That is recorded
 *    in docs/audits/rosa-walkthrough.md as a problem; for the return check, cash is raised to $30,000 so the
 *    gap is met without a taxable draw.
 * 3. The year. Eli's figures are a full calendar year. The plan's as-of date is 2026-01-01 so year 0 is the
 *    whole of 2026; the Rule of 5 is checked at 2026-10-04, when Rosa is 38 (7.6 months).
 */

import { describe, expect, it } from "vitest";
import rosa from "./households/rosa.json";
import { defaultDeps, householdFromExample, lumpSumComparison, requireComplete, resolveAssumptions, resolveBand, ruleOfFive, runFor, type ExampleHouseholdFile, type Household } from "../engine";

const expected = (rosa as unknown as { expected: unknown }).expected as {
  selfEmploymentTax: number; deductibleHalfSeTax: number; agi: number; qbiDeduction: number; federalTaxableIncome: number; standardDeduction: number; federalTaxBeforeCredits: number;
  ifSingle: { taxableIncome: number; tax: number }; childTaxCredit: number; dependentCareCredit: number; federalTaxAfterCredits: number; fica: number; stateTax: number; localTax: number;
  totalTaxes: number; takeHomeAfter401k: number; spending: number; familyLoanPayments: number; annualGap: number; beforeThisBatchGap: number;
  ruleOfFive: { targetMonths: number; monthlySpending: number; targetDollars: number; gap: number };
  liquidation: { cashOut401k: { gross: number; federalTax: number; penalty: number; stateTax: number; net: number }; sellBrokerage: { gross: number; gains: number; federalTax: number; stateTax: number; net: number }; bothNet: number; needed: number; lostToTaxesAndPenalties: number };
};

const within = (actual: number, target: number, tolerance = 5) => expect(Math.abs(actual - target), `${actual} vs ${target}`).toBeLessThanOrEqual(tolerance);

function rosaHousehold(asOf = "2026-01-01", options: { cash?: number } = {}): Household {
  const h = householdFromExample(rosa as ExampleHouseholdFile, asOf);
  if (h.accounts.kind === "rows") {
    const b = h.accounts.rows.find((a) => a.id === "brokerage");
    if (b && b.side === "asset") b.costBasis = { value: 21000, asOf, source: "user", confidence: "known" };
    const c = h.accounts.rows.find((a) => a.id === "cash");
    if (c && c.side === "asset" && options.cash !== undefined) c.balance = { ...c.balance, value: options.cash };
  }
  return h;
}

/** The hand sheet's household for the return check: conventions 1 and 2 above. */
const forReturnCheck = () => rosaHousehold("2026-01-01", { cash: 30000 });

/** The 2026 row of the plan, working, under the app's defaults (M2 depth), with returns set to zero (convention 1). */
function year2026(h: Household) {
  const band = { ...resolveBand(resolveAssumptions(h.assumptions), "likely"), returns: { stocks: 0, bonds: 0, cash: 0 } };
  const t = runFor(requireComplete(h), band, defaultDeps(), Infinity);
  const row = t.rows[0]!;
  expect(row.year).toBe(2026);
  expect(row.fraction).toBe(1);
  return { t, row, m2: row.m2! };
}

describe("Rosa's 2026 return as head of household", () => {
  const { row, m2, t } = year2026(forReturnCheck());

  it("self-employment tax on the $7,500 net: $1,060, half of it deductible", () => {
    within(row.taxes.selfEmployment, expected.selfEmploymentTax);
  });
  it("AGI $71,570: wages less the 401(k), plus the business net, less half the SE tax", () => {
    within(m2.agi, expected.agi);
  });
  it("federal tax before credits $5,169 on taxable income of $46,026 after the $24,150 deduction and the $1,394 QBI deduction", () => {
    within(m2.taxDetail.ordinary, expected.federalTaxBeforeCredits);
    // Taxable income: AGI less the standard deduction less the QBI deduction.
    within(expected.agi - expected.standardDeduction - expected.qbiDeduction, expected.federalTaxableIncome, 1);
  });
  it("the child tax credit $2,200 and the dependent care credit $1,050 (35% of the $3,000 cap) bring it to $1,919", () => {
    within(row.taxes.federalIncome, expected.federalTaxAfterCredits);
  });
  it("FICA $5,202, PA tax $2,318 on wages before the 401(k) plus the business net, local tax $755", () => {
    within(row.taxes.fica, expected.fica);
    within(row.taxes.state, expected.stateTax);
    within(row.taxes.local, expected.localTax);
  });
  it("total taxes $11,254 and take-home after the 401(k) $60,846", () => {
    within(row.taxes.total, expected.totalTaxes);
    within(row.takeHome, expected.takeHomeAfter401k);
  });
  it("spending $50,900 (core, childcare, and the 1% maintenance reserve on the home) plus $12,000 to the family loan: a gap of minus $2,054", () => {
    within(row.spending, expected.spending);
    within(row.debt.scheduled, expected.familyLoanPayments);
    within(row.gap, expected.annualGap);
  });
  it("the plan says what it leaves out and what is unconfirmed", () => {
    expect(t.flags.some((f) => f.includes("home") && f.includes("not counted"))).toBe(true);
    expect(t.flags.some((f) => f.includes("dependent care credit"))).toBe(true);
    expect(t.flags.some((f) => f.includes("Pennsylvania"))).toBe(true);
  });
});

describe("the messy financials swing", () => {
  it("as the app stood before this batch (single, no child, no childcare, no home), the same year shows plus $3,356; filed single the tax is $6,609 on $54,076", () => {
    const h = forReturnCheck();
    h.self.filingStatus = { ...h.self.filingStatus, value: "single" };
    delete h.dependents;
    delete h.home;
    if (h.spending.kind === "rows") h.spending.rows = h.spending.rows.filter((r) => r.category !== "childcare");
    const { row, m2 } = year2026(h);
    within(m2.taxDetail.ordinary, expected.ifSingle.tax);
    within(m2.agi - 16100 - expected.qbiDeduction, expected.ifSingle.taxableIncome);
    within(row.gap, expected.beforeThisBatchGap);
  });
});

describe("the Rule of 5 at 38", () => {
  it("7.6 months of $4,242 (spending without the flexible family loan payment) is $32,237; the gap against $12,000 of cash is $20,237", () => {
    const r = ruleOfFive(rosaHousehold("2026-10-04"));
    within(r.targetMonths, expected.ruleOfFive.targetMonths, 0.01);
    within(r.monthlySpending, expected.ruleOfFive.monthlySpending);
    within(r.targetDollars, expected.ruleOfFive.targetDollars);
    within(r.gap, expected.ruleOfFive.gap);
  });
});

describe("the liquidation comparison (what she avoided), stacked on her 2026 return", () => {
  const c = lumpSumComparison(rosaHousehold("2026-01-01"), expected.liquidation.needed, { year: 2026, liquidateAll: true });
  const k401 = c.sources.find((s) => s.kind === "retirement")!;
  const brokerage = c.sources.find((s) => s.kind === "brokerage")!;
  const loan = c.sources.find((s) => s.kind === "familyLoan")!;

  it("cashing out the $85,000 401(k): about $17,064 of federal tax at the bracket rates, the $8,500 penalty, $2,610 of PA tax, about $56,826 net", () => {
    expect(k401.gross).toBe(expected.liquidation.cashOut401k.gross);
    within(k401.federalTax, expected.liquidation.cashOut401k.federalTax);
    within(k401.penalty, expected.liquidation.cashOut401k.penalty);
    within(k401.stateTax, expected.liquidation.cashOut401k.stateTax);
    // Eli's net leaves the credits alone. The engine also loses $450 of the dependent care credit, because AGI of
    // $156,570 moves its rate from 35% to 20% under the 2026 phase-down (rule fed.dependentCareCredit.2026, unverified).
    within(k401.net + k401.creditsLost, expected.liquidation.cashOut401k.net);
    within(k401.creditsLost, 450);
  });
  it("selling the $30,000 brokerage with $21,000 of basis: $9,000 of gains in the 0% bracket, $276 of PA tax, $29,724 net", () => {
    expect(brokerage.gross).toBe(expected.liquidation.sellBrokerage.gross);
    within(brokerage.federalTax, expected.liquidation.sellBrokerage.federalTax);
    within(brokerage.stateTax, expected.liquidation.sellBrokerage.stateTax);
    // Eli's net leaves the credits alone. The engine also loses $90 of the dependent care credit: AGI of $80,570 moves its
    // rate from 35% to 32% under the 2026 phase-down (rule fed.dependentCareCredit.2026, unverified).
    within(brokerage.net + brokerage.creditsLost, expected.liquidation.sellBrokerage.net);
    within(brokerage.creditsLost, 90);
    expect(brokerage.flags.some((f) => f.includes("0% bracket"))).toBe(true);
  });
  it("both together: about $86,550 of the $230,000 needed, about $28,450 lost (each stacked on the return alone, as the hand sheet does)", () => {
    const creditsLost = k401.creditsLost + brokerage.creditsLost;
    within(c.allTaxableNet + creditsLost, expected.liquidation.bothNet);
    within(c.lostToTaxesAndPenalties - creditsLost, expected.liquidation.lostToTaxesAndPenalties);
  });
  it("the family loan costs no tax, carries her stress rating of 5, and names the gift exclusion and the below-market rule", () => {
    expect(loan.net).toBe(expected.liquidation.needed);
    expect(loan.stress).toBe(5);
    expect(loan.flags.some((f) => f.includes("$19,000"))).toBe(true);
    expect(loan.flags.some((f) => f.includes("lender's tax"))).toBe(true);
  });
});

describe("the dated changes", () => {
  it("childcare ends at 13 (2029), the child tax credit ends the year the child turns 17 (2033), head of household ends when no qualifying child remains (2035)", () => {
    const { t } = year2026(forReturnCheck());
    const flagged = (year: number, text: string) => t.rows.find((r) => r.year === year)!.flags.some((f) => f.includes(text));
    expect(flagged(2029, "turns 13")).toBe(true);
    expect(flagged(2033, "child tax credit ends")).toBe(true);
    expect(flagged(2035, "Head of household ends")).toBe(true);
    const spending = (year: number) => t.rows.find((r) => r.year === year)!.spending;
    within(spending(2028) - spending(2029), 6000);
  });
});
