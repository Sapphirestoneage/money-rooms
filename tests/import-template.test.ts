/**
 * The import template (docs/import-template.md).
 *
 * 1. The example template in templates/ is Maya. Importing it must give Maya's
 *    tied-out FI age, under the same tie-out settings as tests/households.test.ts.
 * 2. A row that can't be read is flagged with a plain reason and is not imported.
 * 3. Rows marked dontknow are skipped and listed.
 * 4. Exporting a household as a template and importing it gives the same household.
 * 5. Filled templates can't be committed (.gitignore).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TEMPLATE_HEADER,
  exportTemplate,
  findFiDate,
  loadLifePhases,
  spendingForYear,
  nominalRateFor,
  parseCsv,
  readTemplate,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  templateFileName,
  unconfirmedIncome,
  userValue,
  type SavingsStrategy,
} from "../engine";
import maya from "./households/maya.json";
import { TIE_OUT_AS_OF, tieOutDeps } from "./tie-out/maya-tie-out";

const root = join(import.meta.dirname, "..");
const exampleTemplate = readFileSync(join(root, "templates", "money-rooms-template.csv"), "utf8");
const file = (...rows: string[]) => [TEMPLATE_HEADER, ...rows].join("\n");

describe("the example template is Maya", () => {
  const preview = readTemplate(exampleTemplate, TIE_OUT_AS_OF);

  it("reads with nothing needing a look", () => {
    expect(preview.fileProblems).toEqual([]);
    expect(preview.needsALook).toEqual([]);
    expect(preview.counts).toEqual({ profile: 3, income: 2, spending: 4, account: 3, debt: 1, optional: 2 });
  });

  const expected = (maya as unknown as { expected: { byStrategy: Record<SavingsStrategy, { fiAgeLikely: number }> } }).expected.byStrategy;
  it.each(Object.keys(expected) as SavingsStrategy[])("FI age under %s matches Maya's tie-out (42)", (strategy) => {
    const household = readTemplate(exampleTemplate, TIE_OUT_AS_OF).household;
    household.savingsStrategy = userValue(strategy, TIE_OUT_AS_OF);
    const band = resolveBand(resolveAssumptions(household.assumptions), "likely");
    const result = findFiDate(requireComplete(household), band, tieOutDeps());
    expect(result.fiAge).toBe(expected[strategy].fiAgeLikely);
    expect(result.fiAge).toBe(42);
  });

  it("stores recurring amounts per year and keeps the kind and the as-of month", () => {
    const h = preview.household;
    if (h.spending.kind !== "rows") throw new Error("no spending");
    const rent = h.spending.rows.find((r) => r.category === "accommodation");
    expect(rent?.annual).toEqual({ value: 19200, asOf: "2026-10-01", source: "user", confidence: "roughly" });
    if (h.accounts.kind !== "rows") throw new Error("no accounts");
    const loan = h.accounts.rows.find((a) => a.side === "debt");
    expect(loan?.side === "debt" && loan.minimumPaymentAnnual.value).toBe(3120);
  });
});

describe("rows that can't be read", () => {
  const preview = readTemplate(
    file(
      "profile,,state,NY,,known,,",
      "account,Ally savings,type,savings,,known,,",
      "account,Ally savings,balance,20k,,known,,",
      "account,Checking,type,checking,,known,,",
      "account,Checking,balance,1500,,known,,",
      "spending,rent,amount,1000,month,,,",
      "spending,food,amount,400,,,,",
      "income,Job,gross_amount,50000,year,,,",
      "debt,Card,type,credit_card,,sure,,",
      "pets,,name,Rex,,,,",
    ),
    "2026-10-03",
  );

  it("flags a bad value with a plain reason", () => {
    expect(preview.needsALook).toContainEqual({ line: 4, label: "Ally savings", reason: 'balance "20k" isn\'t a number' });
  });

  it("does not import the bad value: the account exists with a blank balance marked Look it up", () => {
    if (preview.household.accounts.kind !== "rows") throw new Error("no accounts");
    const [ally, checking] = preview.household.accounts.rows;
    expect(ally?.balance).toMatchObject({ value: 0, confidence: "lookUp" });
    expect(checking?.balance).toMatchObject({ value: 1500, confidence: "known" });
  });

  it("names every other problem and still loads the rest", () => {
    const reasons = preview.needsALook.map((n) => `${n.label}: ${n.reason}`);
    expect(reasons).toContainEqual(expect.stringContaining("rent: has no category row, so this spending was left out"));
    expect(reasons).toContain("food: amount needs a cadence: week, paycheck, month, or year");
    expect(reasons).toContain("Job: has no type row, so this income was left out");
    expect(reasons).toContain('Card: kind "sure" isn\'t known, roughly, lookup, or dontknow');
    expect(reasons).toContain('name: section "pets" isn\'t one this template knows');
    expect(preview.household.self.state?.value).toBe("NY");
    expect(preview.counts).toMatchObject({ profile: 1, income: 0, spending: 0, account: 2, debt: 0 });
  });

  it("rejects a file without the template's header, and imports nothing", () => {
    const wrong = readTemplate("name,amount\nrent,1000\n", "2026-10-03");
    expect(wrong.fileProblems).toHaveLength(1);
    expect(wrong.household.accounts.kind).toBe("unanswered");
    expect(readTemplate("", "2026-10-03").fileProblems).toEqual(["The file is empty."]);
  });
});

describe("rows marked dontknow", () => {
  it("are skipped and listed to look up later", () => {
    const preview = readTemplate(exampleTemplate, TIE_OUT_AS_OF);
    expect(preview.toLookUp.map((n) => `${n.label}: ${n.reason}`)).toEqual(["Tutoring side gig: gross amount", "Health insurance after 26: amount"]);
    // The spending row with no known amount is left out, with nothing flagged.
    if (preview.household.spending.kind !== "rows") throw new Error("no spending");
    expect(preview.household.spending.rows.some((r) => r.category === "healthcare")).toBe(false);
    expect(preview.needsALook).toEqual([]);
    if (preview.household.self.income.kind !== "rows") throw new Error("no income");
    const gig = preview.household.self.income.rows.find((s) => s.label === "Tutoring side gig");
    expect(gig?.grossAnnual).toMatchObject({ value: 0, confidence: "lookUp" });
  });

  it("are skipped even when a value was typed", () => {
    const preview = readTemplate(file("profile,,state,TX,,dontknow,,", "account,Savings,type,savings,,,,", "account,Savings,balance,9999,,dontknow,,"), "2026-10-03");
    expect(preview.household.self.state).toBeUndefined();
    expect(preview.toLookUp.map((n) => n.label)).toEqual(["state", "Savings"]);
    if (preview.household.accounts.kind !== "rows") throw new Error("no accounts");
    expect(preview.household.accounts.rows[0]?.balance.value).toBe(0);
  });
});

describe("export as template", () => {
  it("round-trips: export then import gives the same household", () => {
    const first = readTemplate(exampleTemplate, "2026-10-03").household;
    const second = readTemplate(exportTemplate(first), "2026-10-03");
    expect(second.needsALook).toEqual([]);
    expect(second.household).toEqual(first);
    // And a second trip changes nothing either.
    expect(exportTemplate(second.household)).toBe(exportTemplate(first));
  });

  it("round-trips names with commas and quotes", () => {
    const first = readTemplate(file('account,"Savings, the ""big"" one",type,savings,,,,', 'account,"Savings, the ""big"" one",balance,100,,,,'), "2026-10-03").household;
    expect(readTemplate(exportTemplate(first), "2026-10-03").household).toEqual(first);
  });

  it("writes a file name that .gitignore covers", () => {
    expect(templateFileName("2026-10-03")).toBe("my-money-rooms-2026-10-03.csv");
  });
});

describe("reading CSV", () => {
  it("handles quotes, commas inside quotes, a byte order mark, and Windows line endings", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("privacy", () => {
  const ignore = readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/);
  it.each(["*-filled.csv", "my-*.csv", "household-*.csv", "private/"])(".gitignore blocks %s", (pattern) => {
    expect(ignore).toContain(pattern);
  });

  it("the committed template and prompt hold only the invented example", () => {
    expect(exampleTemplate).toContain("Example rows: replace with your own");
    expect(readFileSync(join(root, "templates", "ai-fill-prompt.txt"), "utf8")).toContain("Never invent a number");
  });
});

describe("debt promo rates", () => {
  const card = ["debt,Store card,type,credit_card,,,,", "debt,Store card,balance,1000,,,,", "debt,Store card,rate,0,,,,"];

  it("imports rate, promo_end, and rate_after as a promo, and exports them back", () => {
    const preview = readTemplate(file(...card, "debt,Store card,promo_end,2027-05,,,,", "debt,Store card,rate_after,24,,,,"), "2026-10-03");
    expect(preview.needsALook).toEqual([]);
    if (preview.household.accounts.kind !== "rows") throw new Error("no accounts");
    const debt = preview.household.accounts.rows[0];
    if (debt?.side !== "debt") throw new Error("no debt");
    expect(debt.promo?.rate.value).toBe(0);
    expect(debt.promo?.endDate.value).toBe("2027-05");
    expect(debt.promo?.rateAfter.value).toBe(24);
    expect(nominalRateFor(debt, 2026, 10)).toBe(0);
    expect(nominalRateFor(debt, 2028)).toBe(24);
    expect(readTemplate(exportTemplate(preview.household), "2026-10-03").household).toEqual(preview.household);
  });

  it("flags a 0% rate with no promo_end, and still imports the debt", () => {
    const preview = readTemplate(file(...card), "2026-10-03");
    expect(preview.needsALook).toHaveLength(1);
    expect(preview.needsALook[0]).toMatchObject({ line: 4, label: "Store card" });
    expect(preview.needsALook[0]?.reason).toContain("the rate is 0 with no promo_end");
    expect(preview.counts.debt).toBe(1);
  });

  it("flags a promo with a row missing, and leaves the promo out", () => {
    const preview = readTemplate(file("debt,Loan,type,personal,,,,", "debt,Loan,balance,1000,,,,", "debt,Loan,rate,3,,,,", "debt,Loan,promo_end,2027-05,,,,"), "2026-10-03");
    expect(preview.needsALook.map((n) => n.reason)).toEqual(["a promo needs three rows: rate (the promo rate), promo_end, and rate_after. The promo was left out"]);
    if (preview.household.accounts.kind !== "rows") throw new Error("no accounts");
    const debt = preview.household.accounts.rows[0];
    expect(debt?.side === "debt" && debt.promo).toBeUndefined();
  });
});

describe("spending that changes on a date", () => {
  const preview = readTemplate(
    file(
      "spending,Healthcare on a parent's plan,category,healthcare,,,,",
      "spending,Healthcare on a parent's plan,amount,0,month,known,,",
      "spending,Healthcare on a parent's plan,end,2027-06,,,,",
      "spending,Healthcare on my own,category,healthcare,,,,",
      "spending,Healthcare on my own,amount,800,month,roughly,,",
      "spending,Healthcare on my own,start,2027-07,,,,",
      "spending,Tuition,category,education,,,,",
      "spending,Tuition,amount,1200,year,,,",
      "spending,Tuition,end,age:30,,,,",
      "spending,food,amount,400,month,,,",
    ),
    "2026-10-03",
  );

  it("imports several rows in one category, each with its own name and dates", () => {
    expect(preview.needsALook).toEqual([]);
    expect(preview.counts.spending).toBe(4);
    if (preview.household.spending.kind !== "rows") throw new Error("no spending");
    const [before, after, tuition, food] = preview.household.spending.rows;
    expect(before).toMatchObject({ category: "healthcare", label: "Healthcare on a parent's plan", end: { kind: "date", date: "2027-06" } });
    expect(before?.annual.value).toBe(0);
    expect(after).toMatchObject({ category: "healthcare", label: "Healthcare on my own", start: "2027-07" });
    expect(after?.annual.value).toBe(9600);
    expect(tuition?.end).toEqual({ kind: "age", age: 30 });
    // A file made before the category field existed: the item is the category id.
    expect(food).toMatchObject({ id: "cat-food", category: "food" });
    expect(food?.label).toBeUndefined();
  });

  it("the engine adds up the rows active in each year", () => {
    if (preview.household.spending.kind !== "rows") throw new Error("no spending");
    const healthcare = preview.household.spending.rows.filter((r) => r.category === "healthcare");
    const year = (y: number) => spendingForYear(healthcare, { year: y, t: y - 2026, age: y - 2001, retirementYear: 2060 }, false, loadLifePhases()).total;
    expect(year(2026)).toBe(0);
    expect(year(2027)).toBeCloseTo(4800, 8);
    expect(year(2028)).toBeCloseTo(9600, 8);
  });

  it("round-trips through export", () => {
    expect(readTemplate(exportTemplate(preview.household), "2026-10-03").household).toEqual(preview.household);
  });
});

describe("income that is expected but not confirmed", () => {
  const preview = readTemplate(
    file(
      "income,Consulting contract,type,self_employed,,roughly,,not confirmed",
      "income,Consulting contract,gross_amount,50000,year,roughly,,Not confirmed: waiting on the signed agreement",
      "income,Consulting contract,start,2027-01,,roughly,,",
      "income,Day job,type,salary,,known,,not confirmed",
      "income,Day job,gross_amount,60000,year,known,,",
    ),
    "2026-10-03",
  );

  it("imports normally and is marked not confirmed", () => {
    expect(preview.needsALook).toEqual([]);
    if (preview.household.self.income.kind !== "rows") throw new Error("no income");
    const [contract, job] = preview.household.self.income.rows;
    expect(contract).toMatchObject({ type: "selfEmployed", start: "2027-01", notConfirmed: true });
    expect(contract?.grossAnnual).toMatchObject({ value: 50000, confidence: "roughly" });
    // The note only counts on a row marked roughly.
    expect(job?.notConfirmed).toBeUndefined();
  });

  it("is named for the result screen", () => {
    expect(unconfirmedIncome(preview.household)).toEqual(["Consulting contract"]);
    expect(unconfirmedIncome(readTemplate(exampleTemplate, TIE_OUT_AS_OF).household)).toEqual([]);
  });

  it("round-trips through export", () => {
    const again = readTemplate(exportTemplate(preview.household), "2026-10-03");
    expect(again.household).toEqual(preview.household);
  });
});
