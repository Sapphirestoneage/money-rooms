/**
 * The Debt freedom module's golden household (data/modules/debt-freedom.json, docs/packs/debt-freedom.md
 * section 7). Three debts, one on a 0% promo that ends within a year. Payoff dates are hand-checked below;
 * the interest figures are the simulation's, recorded 2026-10-04 as a regression line. Expected values are
 * never changed to make the test pass.
 */

import { describe, expect, it } from "vitest";
import golden from "../households/debt-freedom-golden.json";
import { balanceAtPromoEnd, debtFreedomView, debtFreeMilestone, householdFromExample, moduleUnlocked, moduleById, payoffDebts, simulate, type ExampleHouseholdFile } from "../../engine";

const asOf = "2026-10-01";
const h = () => householdFromExample(golden as ExampleHouseholdFile, asOf);

describe("the golden household's debts", () => {
  it("carries the promo into the simulation: 0% for the twelve months through September 2027, 24.99% after", () => {
    const debts = payoffDebts(h());
    const promo = debts.find((d) => d.id === "promo")!;
    // October 2026 is month 1; September 2027 is month 12.
    expect(promo.promo).toEqual({ ratePercent: 0, monthsRemaining: 12 });
    expect(promo.ratePercent).toBe(24.99);
    expect(debts.map((d) => d.minimumMonthly)).toEqual([100, 150, 200]);
  });

  it("unlocks the module: a debt exists", () => {
    expect(moduleUnlocked(moduleById("debt-freedom")!, h())).toBe(true);
  });
});

describe("the avalanche at $700 a month ($450 of minimums plus $250 extra)", () => {
  const view = debtFreedomView(h(), { extraMonthly: 250 });
  const avalanche = view.methods.find((m) => m.method === "avalanche")!;

  it("pays the store card first and clears it in June 2027, inside the promo, with no interest", () => {
    // Hand check: $3,000 at 0%, $100 minimum plus $250 extra is $350 a month. Eight months pay $2,800; the ninth pays
    // the last $200. Month 9 from October 2026 is June 2027, three months before the promo ends, so the card never
    // accrues interest. The avalanche ranks by the rate that applies after the promo (24.99%), so it comes first.
    expect(avalanche.order[0]!.id).toBe("promo");
    expect(avalanche.order[0]!.paidOff).toBe("2027-06");
    const r = simulate(payoffDebts(h()), ["promo", "card", "car"], 700);
    expect(r.paidOffMonth["promo"]).toBe(9);
  });

  it("clears the car loan on its own minimum in 22 months, July 2028", () => {
    // Hand check: $4,000 at 6% (0.5% a month) with $200 payments: n = ln(1 / (1 - 0.005 x 4000 / 200)) / ln(1.005)
    // = ln(1 / 0.9) / ln(1.005) = 0.10536 / 0.0049875 = 21.1 months, so the 22nd payment finishes it. Month 22 is July 2028.
    expect(avalanche.order.find((d) => d.id === "car")!.paidOff).toBe("2028-07");
  });

  it("clears the credit card in July 2028 too, so the household is debt free in July 2028", () => {
    // Hand check: $6,000 at 22% (1.8333% a month). Months 1 to 8 pay the $150 minimum: 6000 x 1.018333^8 - 150 x (1.018333^8 - 1) / 0.018333
    // = 6,938.1 - 1,279.3 = $5,658.8. Month 9 pays $300 (the minimum plus the $150 the store card no longer needs): 5658.8 x 1.018333 - 300 = $5,462.5.
    // From month 10 the card gets $500: n = ln(1 / (1 - 0.018333 x 5462.5 / 500)) / ln(1.018333) = ln(1.2505) / 0.018167 = 12.3, so 13 more
    // payments, month 22, July 2028.
    expect(avalanche.order.find((d) => d.id === "card")!.paidOff).toBe("2028-07");
    expect(avalanche.debtFreeMonth).toBe("2028-07");
    expect(avalanche.monthsToDebtFree).toBe(22);
    // Regression line (the simulation's figure on 2026-10-04): total interest about $1,877, all of it on the card and the car.
    expect(avalanche.totalInterest).toBeCloseTo(1877.27, 0);
  });
});

describe("snowball and peace-first", () => {
  const view = debtFreedomView(h(), { extraMonthly: 250 });
  const snowball = view.methods.find((m) => m.method === "snowball")!;
  const peace = view.methods.find((m) => m.method === "peaceFirst")!;

  it("the snowball takes the car ($4,000) before the card ($6,000) and clears the car in November 2027", () => {
    expect(snowball.order.map((d) => d.id)).toEqual(["promo", "car", "card"]);
    expect(snowball.order[1]!.paidOff).toBe("2027-11");
    expect(snowball.debtFreeMonth).toBe("2028-07");
  });

  it("peace-first (stress 5, 4, 2) lands on the same order as the snowball here, and the price of peace is the interest difference", () => {
    expect(peace.order.map((d) => d.id)).toEqual(["promo", "car", "card"]);
    expect(view.priceOfPeace).toBeCloseTo(peace.totalInterest - view.methods.find((m) => m.method === "avalanche")!.totalInterest, 6);
    expect(view.priceOfPeace).toBeGreaterThan(0);
    expect(view.peaceGained).toBe(32);
  });

  it("$100 more a month shortens the avalanche by whole months and never lengthens it (acceptance test 2)", () => {
    const more = view.hundredMore.find((x) => x.method === "avalanche")!;
    expect(more.monthsSaved).toBeGreaterThanOrEqual(1);
    expect(more.interestSaved).toBeGreaterThan(0);
    const direct = debtFreedomView(h(), { extraMonthly: 350 }).methods.find((m) => m.method === "avalanche")!;
    expect(view.methods.find((m) => m.method === "avalanche")!.monthsToDebtFree - direct.monthsToDebtFree).toBe(more.monthsSaved);
  });
});

describe("the promo-end warning", () => {
  it("names the end month, the rate after, and the balance left at the minimum alone: $3,000 less twelve $100 payments is $1,800", () => {
    const view = debtFreedomView(h(), { extraMonthly: 250 });
    expect(view.promoWarnings).toHaveLength(1);
    const w = view.promoWarnings[0]!;
    expect(w.endsAt).toBe("2027-09");
    expect(w.monthsLeft).toBe(12);
    expect(w.rateAfterPercent).toBe(24.99);
    expect(w.balanceAtEndAtMinimum).toBe(1800);
    expect(balanceAtPromoEnd(payoffDebts(h()).find((d) => d.id === "promo")!)).toBe(1800);
    expect(w.paidOffBeforeEnd).toEqual({ avalanche: true, snowball: true, peaceFirst: true });
    expect(w.sentence).toContain("Every method here clears it before then.");
  });

  it("at the minimums alone no order clears the card before the rate changes", () => {
    const view = debtFreedomView(h());
    expect(view.promoWarnings[0]!.paidOffBeforeEnd).toEqual({ avalanche: false, snowball: false, peaceFirst: false });
  });
});

describe("the debt-free milestone", () => {
  it("is the avalanche at today's payments: November 2029, age 35", () => {
    // At the minimums alone ($450), the car clears in month 22; its $200 then goes to the store card, which clears in month 26;
    // the credit card is last, in month 38, November 2029. Born May 1994, the person is 35 that month.
    const m = debtFreeMilestone(h())!;
    expect(m.month).toBe("2029-11");
    expect(m.age).toBe(35);
    expect(debtFreedomView(h()).methods.find((x) => x.method === "avalanche")!.monthsToDebtFree).toBe(38);
  });

  it("is null without debts", () => {
    const noDebts = h();
    if (noDebts.accounts.kind === "rows") noDebts.accounts.rows = noDebts.accounts.rows.filter((a) => a.side === "asset");
    expect(debtFreeMilestone(noDebts)).toBeNull();
  });
});
