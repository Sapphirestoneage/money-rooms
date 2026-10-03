import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { accountGroups, entrySummary, firstSectionNeedingAttention } from "./entry-summary";
import { householdFromExample, type ExampleHouseholdFile } from "./examples";
import { emptyHousehold } from "./household";
import { debtFromPreset, assetFromPreset } from "./presets";
import { userValue } from "./values";

const asOf = "2026-10-03";
const mayaHousehold = () => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("entrySummary", () => {
  it("an empty household: the required sections are incomplete", () => {
    const s = entrySummary(emptyHousehold(asOf));
    expect(s.about).toMatchObject({ count: 1, missing: 2, complete: false, total: null });
    expect(s.income).toMatchObject({ count: 0, total: 0, complete: false });
    expect(s.spending.complete).toBe(false);
    expect(s.accounts.complete).toBe(false);
    expect(s.debts.complete).toBe(false);
  });

  it("Maya: counts, totals, and complete everywhere", () => {
    const s = entrySummary(mayaHousehold());
    expect(s.about).toMatchObject({ count: 3, missing: 0, complete: true });
    expect(s.income).toMatchObject({ count: 1, total: 72000, missing: 0, complete: true });
    expect(s.spending).toMatchObject({ count: 4, total: 37200, missing: 0, complete: true });
    expect(s.accounts).toMatchObject({ count: 3, total: 17700, missing: 0, complete: true });
    expect(s.debts).toMatchObject({ count: 1, total: 24000, missing: 0, complete: true });
  });

  it("roughly counts as answered; look-it-up does not", () => {
    const h = mayaHousehold();
    if (h.accounts.kind !== "rows") throw new Error("no accounts");
    h.accounts.rows[0]!.balance = userValue(3500, asOf, "roughly");
    expect(entrySummary(h).accounts).toMatchObject({ rough: 1, missing: 0, complete: true });
    h.accounts.rows[0]!.balance = userValue(0, asOf, "lookUp");
    expect(entrySummary(h).accounts).toMatchObject({ rough: 0, missing: 1, complete: false });
  });

  it("income and spending totals count only rows being paid this month", () => {
    const h = mayaHousehold();
    if (h.self.income.kind !== "rows" || h.spending.kind !== "rows") throw new Error("no rows");
    h.self.income.rows.push({ id: "later", type: "selfEmployed", grossAnnual: userValue(50000, asOf, "roughly"), start: "2027-01", end: { kind: "retirement" } });
    h.spending.rows.push({ id: "h1", category: "healthcare", annual: userValue(0, asOf), end: { kind: "date", date: "2027-06" } });
    h.spending.rows.push({ id: "h2", category: "healthcare", annual: userValue(9600, asOf), start: "2027-07" });
    h.spending.rows.push({ id: "old", category: "fun", annual: userValue(1200, asOf), end: { kind: "date", date: "2026-09" } });
    const s = entrySummary(h);
    expect(s.income).toMatchObject({ count: 2, total: 72000, rough: 1, complete: true });
    // The $0 dated row is answered, not missing.
    expect(s.spending).toMatchObject({ count: 7, total: 37200, missing: 0, complete: true });
  });

  it("a debt is missing until its rate is answered, and a promo until its rate after is", () => {
    const h = mayaHousehold();
    if (h.accounts.kind !== "rows") throw new Error("no accounts");
    const card = debtFromPreset("creditCard", "card", userValue(1000, asOf), { rate: { value: 0, asOf, source: "preset", confidence: "lookUp" }, minimumPaymentAnnual: userValue(480, asOf) }, asOf);
    h.accounts.rows.push(card);
    expect(entrySummary(h).debts).toMatchObject({ count: 2, total: 25000, missing: 1, complete: false });
    card.rate = userValue(0, asOf);
    card.promo = { rate: userValue(0, asOf), endDate: userValue("2027-05", asOf), rateAfter: { value: 0, asOf, source: "preset", confidence: "lookUp" } };
    expect(entrySummary(h).debts.complete).toBe(false);
    card.promo.rateAfter = userValue(25, asOf, "roughly");
    expect(entrySummary(h).debts).toMatchObject({ missing: 0, rough: 1, complete: true });
  });

  it("no income and no accounts are complete answers", () => {
    const h = emptyHousehold(asOf);
    h.self.income = { kind: "none", asOf };
    h.accounts = { kind: "none", asOf };
    const s = entrySummary(h);
    expect(s.income.complete).toBe(true);
    expect(s.accounts.complete).toBe(true);
    expect(s.debts.complete).toBe(true);
  });
});

describe("firstSectionNeedingAttention", () => {
  it("is the first section with a required answer missing", () => {
    expect(firstSectionNeedingAttention(emptyHousehold(asOf))).toBe("about");
    const h = mayaHousehold();
    h.spending = { kind: "unanswered" };
    expect(firstSectionNeedingAttention(h)).toBe("spending");
  });

  it("with nothing missing, is the first section with a rough value, else none", () => {
    const h = mayaHousehold();
    const s = entrySummary(h);
    const firstRough = (["about", "income", "spending", "accounts", "debts"] as const).find((id) => s[id].rough > 0) ?? null;
    expect(firstSectionNeedingAttention(h)).toBe(firstRough);
    // Make everything known.
    h.self.filingStatus = userValue("single", asOf);
    if (h.self.income.kind === "rows") for (const x of h.self.income.rows) x.grossAnnual = userValue(x.grossAnnual.value, asOf);
    if (h.spending.kind === "rows") for (const x of h.spending.rows) x.annual = userValue(x.annual.value, asOf);
    if (h.accounts.kind === "rows") for (const a of h.accounts.rows) {
      a.balance = userValue(a.balance.value ?? 0, asOf);
      if (a.side === "debt") { a.rate = userValue(a.rate.value, asOf); a.minimumPaymentAnnual = userValue(a.minimumPaymentAnnual.value, asOf); }
    }
    if (h.self.state) h.self.state = userValue(h.self.state.value, asOf);
    expect(firstSectionNeedingAttention(h)).toBeNull();
  });
});

describe("accountGroups", () => {
  it("groups accounts as cash, investing, retirement and debts as credit cards, student loans, others, with subtotals", () => {
    const h = mayaHousehold();
    if (h.accounts.kind !== "rows") throw new Error("no accounts");
    h.accounts.rows.push(
      assetFromPreset("brokerage", "b", userValue(42, asOf), asOf),
      assetFromPreset("rothIRA", "r", userValue(38000, asOf), asOf),
      debtFromPreset("creditCard", "c1", userValue(5000, asOf), { rate: userValue(17, asOf), minimumPaymentAnnual: userValue(480, asOf) }, asOf),
      debtFromPreset("businessCard", "c2", userValue(2999, asOf), { rate: userValue(25, asOf), minimumPaymentAnnual: userValue(480, asOf) }, asOf),
      debtFromPreset("auto", "car", userValue(9000, asOf), { rate: userValue(6, asOf), minimumPaymentAnnual: userValue(2400, asOf) }, asOf),
    );
    const g = accountGroups(h);
    expect(g.assets.map((x) => [x.id, x.label, x.count, x.subtotal])).toEqual([
      ["cash", "Cash", 2, 9500],
      ["investing", "Investing", 1, 42],
      ["retirement", "Retirement", 2, 46200],
    ]);
    expect(g.debts.map((x) => [x.id, x.label, x.count, x.subtotal])).toEqual([
      ["cards", "Credit cards", 2, 7999],
      ["studentLoans", "Student loans", 1, 24000],
      ["other", "Other debts", 1, 9000],
    ]);
  });

  it("leaves out empty groups", () => {
    expect(accountGroups(emptyHousehold(asOf))).toEqual({ assets: [], debts: [] });
  });
});
