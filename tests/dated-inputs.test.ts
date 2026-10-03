/**
 * Things that change on a date, checked end to end: a template is imported and
 * the whole plan is run, under the app's own defaults, from a plan date of
 * 2026-10-03 (so 2026 is a three-month first year).
 *
 * 1. A 0% card with a promo through May 2027 and 24% after accrues no interest
 *    before June 2027 and 24% a year after.
 * 2. A $50,000 self-employed income starting January 2027 adds nothing in 2026
 *    and the full income from 2027.
 * 3. Healthcare at $0 through June 2027, then $800 a month from July 2027.
 *
 * Spending is set above income on purpose, so the plan has no spare cash to pay
 * the card off early and the card balance shows its interest alone.
 */

import { describe, expect, it } from "vitest";
import { TEMPLATE_HEADER, defaultDeps, readTemplate, requireComplete, resolveAssumptions, resolveBand, runTimeline } from "../engine";

const AS_OF = "2026-10-03";
const template = [
  TEMPLATE_HEADER,
  "profile,,birth_month,2001-03,,,,",
  "profile,,state,TX,,,,",
  "income,Consulting contract,type,self_employed,,roughly,,not confirmed",
  "income,Consulting contract,gross_amount,50000,year,roughly,,",
  "income,Consulting contract,start,2027-01,,,,",
  "spending,Rent,category,accommodation,,,,",
  "spending,Rent,amount,5000,month,,,",
  "spending,Healthcare on a parent's plan,category,healthcare,,,,",
  "spending,Healthcare on a parent's plan,amount,0,month,,,",
  "spending,Healthcare on a parent's plan,end,2027-06,,,,",
  "spending,Healthcare on my own,category,healthcare,,,,",
  "spending,Healthcare on my own,amount,800,month,,,",
  "spending,Healthcare on my own,start,2027-07,,,,",
  "account,Savings,type,savings,,,,",
  "account,Savings,balance,100000,,,,",
  "debt,Store card,type,credit_card,,,,",
  "debt,Store card,balance,1000,,,,",
  "debt,Store card,rate,0,,,,",
  "debt,Store card,promo_end,2027-05,,,,",
  "debt,Store card,rate_after,24,,,,",
  "debt,Store card,min_payment,0,month,,,",
].join("\n");

describe("a plan with a promo rate, income that starts later, and spending that changes on a date", () => {
  const preview = readTemplate(template, AS_OF);
  const band = resolveBand(resolveAssumptions(preview.household.assumptions), "likely");
  const deps = defaultDeps();
  const timeline = runTimeline(requireComplete(preview.household), { band, retirementYear: 2060, tables: deps.tables, ssParams: deps.ssParams });
  const year = (y: number) => {
    const row = timeline.rows.find((r) => r.year === y);
    if (!row) throw new Error(`no row for ${y}`);
    return row;
  };

  it("the template reads cleanly", () => {
    expect(preview.fileProblems).toEqual([]);
    expect(preview.needsALook).toEqual([]);
    expect(year(2026).fraction).toBeCloseTo(0.25, 10);
  });

  it("the income adds nothing in 2026 and the full amount from 2027", () => {
    const growth = 1 + band.incomeGrowth.selfEmployed / 100;
    expect(year(2026).income.gross).toBe(0);
    expect(year(2026).income.selfEmploymentNet).toBe(0);
    expect(year(2027).income.selfEmploymentNet).toBeCloseTo(50000 * growth, 6);
    expect(year(2028).income.selfEmploymentNet).toBeCloseTo(50000 * growth ** 2, 6);
  });

  it("spending is rent alone until July 2027, then rent plus $800 a month", () => {
    expect(year(2026).spending).toBeCloseTo(60000 * 0.25, 6);
    expect(year(2027).spending).toBeCloseTo(60000 + 800 * 6, 6);
    expect(year(2028).spending).toBeCloseTo(60000 + 800 * 12, 6);
  });

  it("the card accrues no interest before June 2027 and 24% a year after", () => {
    // The engine works in today's dollars. Convert each year-end balance back to the dollars
    // of its own date, which is what a statement would show.
    const statement = (y: number) => year(y).debts * Math.pow(1 + band.inflation / 100, 0.25 + (y - 2026));
    for (const y of [2026, 2027, 2028]) {
      expect(year(y).debt.scheduled).toBe(0);
      expect(year(y).debt.extra).toBe(0);
    }
    expect(statement(2026)).toBeCloseTo(1000, 6);
    // 2027: five months at 0%, then seven months at 24%.
    expect(statement(2027)).toBeCloseTo(1000 * Math.pow(1.24, 7 / 12), 6);
    expect(statement(2028) / statement(2027)).toBeCloseTo(1.24, 8);
  });
});
