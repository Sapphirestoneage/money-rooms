import { describe, expect, it } from "vitest";
import { loadLifePhases, userValue, type SpendingRow } from "../model";
import { phaseForAge, spendingForYear } from "./spending";

const asOf = "2026-10-02";
const phases = loadLifePhases();

// Maya's spending
const rows: SpendingRow[] = [
  { id: "r1", category: "accommodation", annual: userValue(19200, asOf) },
  { id: "r2", category: "food", annual: userValue(6000, asOf) },
  { id: "r3", category: "transportation", annual: userValue(2400, asOf) },
  { id: "r4", category: "everythingElse", annual: userValue(9600, asOf) },
];

const ctx = (year: number, age: number) => ({ year, t: year - 2026, age, retirementYear: 2043 });

describe("phaseForAge", () => {
  it("picks go-go through 74, slow-go 75 to 84, no-go from 85", () => {
    expect(phaseForAge(42, phases)?.id).toBe("goGo");
    expect(phaseForAge(74, phases)?.id).toBe("goGo");
    expect(phaseForAge(75, phases)?.id).toBe("slowGo");
    expect(phaseForAge(84, phases)?.id).toBe("slowGo");
    expect(phaseForAge(85, phases)?.id).toBe("noGo");
    expect(phaseForAge(95, phases)?.id).toBe("noGo");
  });
});

describe("spendingForYear", () => {
  it("working years sum the entered categories", () => {
    const y = spendingForYear(rows, ctx(2026, 25), false, phases);
    expect(y.total).toBe(37200);
    expect(y.phaseId).toBeNull();
  });

  it("go-go retirement keeps everything that continues, at 100%", () => {
    const y = spendingForYear(rows, ctx(2043, 42), true, phases);
    expect(y.total).toBe(37200);
    expect(y.phaseId).toBe("goGo");
  });

  it("slow-go and no-go scale discretionary categories only", () => {
    const slow = spendingForYear(rows, ctx(2076, 75), true, phases);
    expect(slow.total).toBeCloseTo(19200 + 6000 + 2400 + 9600 * 0.85, 6);
    const no = spendingForYear(rows, ctx(2086, 85), true, phases);
    expect(no.total).toBeCloseTo(19200 + 6000 + 2400 + 9600 * 0.7, 6);
  });

  it("drops categories that stop in retirement and uses the retirement amount for ones that change", () => {
    const extra: SpendingRow[] = [
      { id: "w", category: "workCosts", annual: userValue(1200, asOf) },
      { id: "t", category: "transportation", annual: userValue(2400, asOf), retirementAnnual: userValue(1200, asOf) },
    ];
    const working = spendingForYear(extra, ctx(2030, 29), false, phases);
    expect(working.total).toBe(3600);
    const retired = spendingForYear(extra, ctx(2050, 49), true, phases);
    expect(retired.total).toBe(1200);
  });

  it("honors a row-level override of the category default", () => {
    const r: SpendingRow[] = [{ id: "e", category: "education", annual: userValue(5000, asOf), continuesInRetirement: userValue("yes", asOf) }];
    expect(spendingForYear(r, ctx(2050, 49), true, phases).total).toBe(5000);
  });

  it("stops a row at its end rule", () => {
    const r: SpendingRow[] = [{ id: "d", category: "fun", annual: userValue(1000, asOf), end: { kind: "age", age: 30 } }];
    expect(spendingForYear(r, ctx(2030, 29), false, phases).total).toBe(1000);
    expect(spendingForYear(r, ctx(2031, 30), false, phases).total).toBe(0);
  });
});

describe("spending that changes on a date", () => {
  // Healthcare: $0 through June 2027, then $800 a month from July 2027.
  const dated: SpendingRow[] = [
    { id: "h1", category: "healthcare", annual: userValue(0, asOf), end: { kind: "date", date: "2027-06" } },
    { id: "h2", category: "healthcare", annual: userValue(9600, asOf), start: "2027-07" },
  ];

  it("sums every row active in the year, by the months each one counts", () => {
    expect(spendingForYear(dated, ctx(2026, 25), false, phases).total).toBe(0);
    expect(spendingForYear(dated, ctx(2027, 26), false, phases).total).toBeCloseTo(4800, 8);
    expect(spendingForYear(dated, ctx(2028, 27), false, phases).total).toBeCloseTo(9600, 8);
  });

  it("adds dated rows to the rows with no dates", () => {
    expect(spendingForYear([...rows, ...dated], ctx(2027, 26), false, phases).total).toBeCloseTo(37200 + 4800, 8);
  });

  it("a row that ends at an age stops counting that year", () => {
    const untilThirty: SpendingRow[] = [{ id: "e", category: "education", annual: userValue(1200, asOf), end: { kind: "age", age: 30 } }];
    expect(spendingForYear(untilThirty, ctx(2030, 29), false, phases).total).toBe(1200);
    expect(spendingForYear(untilThirty, ctx(2031, 30), false, phases).total).toBe(0);
  });
});
