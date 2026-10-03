import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { assetFromPreset, emptyHousehold, householdFromExample, userValue, type ExampleHouseholdFile, type Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, runFor } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { RETURN_SERIES, SERIES_SOURCE, backtest, returnsFromStart, sturdyFiYear } from "./backtest";
import { flexAdjuster, guardrailsAdjuster } from "./rules";

const asOf = "2026-10-03";
const mayaHousehold = (): Household => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("the return series and a start year's returns (acceptance tests 1, 6, 7)", () => {
  it("the series runs from 1928 and carries its source; results are flagged while it is unverified", () => {
    expect(RETURN_SERIES[0]!.year).toBe(1928);
    expect(RETURN_SERIES.length).toBeGreaterThan(90);
    expect(SERIES_SOURCE.url).toMatch(/^https:\/\//);
    expect(SERIES_SOURCE.unverified).toBe(true);
  });

  it("a start year uses that year's real stock return: a one-stock-account retiree grows by it less fees in the first full year", () => {
    const h = emptyHousehold(asOf);
    h.self.birthDate = userValue("1960-01", asOf);
    h.self.state = userValue("TX", asOf);
    h.self.income = { kind: "none", asOf };
    h.spending = { kind: "rows", rows: [{ id: "s", category: "everythingElse", annual: userValue(1000, asOf) }] };
    const brk = assetFromPreset("brokerage", "brk", userValue(1_000_000, asOf), asOf);
    brk.allocation = userValue({ stocks: 100, bonds: 0, cash: 0 }, asOf);
    brk.fees = userValue(0, asOf);
    h.accounts = { kind: "rows", rows: [brk] };
    const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
    const start = 1995;
    const { byYear, filledYears } = returnsFromStart(start, 2026, 2056, band);
    expect(filledYears).toBe(1);
    expect(byYear[2027]!.stocks).toBe(RETURN_SERIES.find((r) => r.year === 1996)!.stocks);
    const t = runFor(requireComplete(h), band, { ...defaultDeps(), returnsByYear: byYear }, 2026);
    const y1 = t.rows[1]!;
    const opening = t.rows[0]!.balances["brk"]!;
    const flow = -(y1.withdrawals["brk"] ?? 0);
    const r = RETURN_SERIES.find((x) => x.year === 1996)!.stocks / 100;
    expect(y1.balances["brk"]).toBeCloseTo(opening * (1 + r) + flow * (1 + r / 2), 0);
  });

  it("starts that run out of history are filled with the band and counted (test 7)", () => {
    const h = mayaHousehold();
    const fi = findFiDate(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps());
    const b = backtest(h, fi.retirementYear!, { minHistoryYears: 30 });
    expect(b.startsFilled).toBeGreaterThan(0);
    expect(b.flags.some((f) => f.includes("ran out of history"))).toBe(true);
    expect(b.flags.some((f) => f.includes("not been verified"))).toBe(true);
  });
});

describe("success rate, worst starts, and the sturdy FI date (tests 2 and 3)", () => {
  const h = mayaHousehold();
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const fi = findFiDate(requireComplete(h), band, defaultDeps());

  it("the success rate is the share of starts with no shortfall, and worst starts are ordered by the age the shortfall began", () => {
    const b = backtest(h, fi.retirementYear!, { minHistoryYears: 40 });
    expect(b.starts.length).toBeGreaterThan(40);
    expect(b.successRate).toBeCloseTo(b.starts.filter((s) => s.funded).length / b.starts.length, 9);
    for (let i = 1; i < b.worstStarts.length; i++) expect(b.worstStarts[i]!.shortfallAge!).toBeGreaterThanOrEqual(b.worstStarts[i - 1]!.shortfallAge!);
    expect(b.series.source).toMatch(/Damodaran/);
  });

  it("the sturdy FI date is never earlier than the deterministic one", () => {
    const s = sturdyFiYear(h, fi.retirementYear!, 90, { minHistoryYears: 40 });
    expect(s.year === null || s.year >= fi.retirementYear!).toBe(true);
    if (s.year !== null) expect(s.successRate!).toBeGreaterThanOrEqual(0.9);
  });
});

describe("guardrails and Flex FI (tests 4 and 5)", () => {
  it("guardrails cut 10% above 1.2 times the initial rate, raise 10% under 0.8 times, and never cut below the floor", () => {
    const make = guardrailsAdjuster();
    const adj = make();
    const base = { year: 2040, age: 60, assetsAtRetirement: 1_000_000, plannedSpending: 40000, stocksReturn: 5 };
    expect(adj({ ...base, assetsAtStart: 1_000_000 })).toBe(1);
    expect(adj({ ...base, assetsAtStart: 1_000_000 })).toBe(1);
    expect(adj({ ...base, assetsAtStart: 800_000 })).toBeCloseTo(0.9, 9);
    expect(adj({ ...base, assetsAtStart: 1_600_000 })).toBeCloseTo(0.99, 9);
    const again = make();
    again({ ...base, assetsAtStart: 1_000_000 });
    let f = 1;
    for (let i = 0; i < 10; i++) f = again({ ...base, assetsAtStart: 100_000 });
    expect(f).toBeCloseTo(0.6, 9);
  });

  it("the flex trim applies only in years the stock return was negative", () => {
    const adj = flexAdjuster(10)();
    const base = { year: 2040, age: 60, assetsAtStart: 1, assetsAtRetirement: 1, plannedSpending: 1 };
    expect(adj({ ...base, stocksReturn: -3 })).toBeCloseTo(0.9, 9);
    expect(adj({ ...base, stocksReturn: 4 })).toBe(1);
  });

  it("with the trim, the backtest never does worse than without it, and the lowest spending share is recorded", () => {
    const h = mayaHousehold();
    const fi = findFiDate(requireComplete(h), resolveBand(resolveAssumptions(h.assumptions), "likely"), defaultDeps());
    const plain = backtest(h, fi.retirementYear!, { minHistoryYears: 40 });
    const flex = backtest(h, fi.retirementYear!, { minHistoryYears: 40, spendingAdjuster: flexAdjuster(10) });
    expect(flex.successRate).toBeGreaterThanOrEqual(plain.successRate);
    expect(flex.starts.some((s) => s.lowestSpendingShare < 1)).toBe(true);
    const flexSturdy = sturdyFiYear(h, fi.retirementYear!, 90, { minHistoryYears: 40, spendingAdjuster: flexAdjuster(10) });
    const plainSturdy = sturdyFiYear(h, fi.retirementYear!, 90, { minHistoryYears: 40 });
    if (flexSturdy.year !== null && plainSturdy.year !== null) expect(flexSturdy.year).toBeLessThanOrEqual(plainSturdy.year);
  });
});
