/**
 * The audit tie-outs (tests/README.md).
 *
 * 1. Every example household runs in every band under the app's own defaults.
 * 2. Maya is tied out against Eli's hand-calculated workpaper, under the
 *    conventions in tests/tie-out-conventions.md. Tied out 2026-10-03.
 *    A mismatch here is reported, never "fixed" by editing an expected value.
 */

import { describe, expect, it } from "vitest";
import { householdFromExample, project, type ExampleHouseholdFile, type SavingsStrategy } from "../engine";
import dev from "./households/dev.json";
import jordan from "./households/jordan.json";
import maya from "./households/maya.json";
import { CHECKPOINT_FILES, compareToCheckpoints, mayaFi, mayaTimelineAt42 } from "./tie-out/maya-tie-out";

const asOf = "2026-10-02";
const files = [maya, jordan, dev] as ExampleHouseholdFile[];

describe.each(files)("$label: the engine runs in every band", (file) => {
  const result = project(householdFromExample(file, asOf));
  it.each(["best", "likely", "worst"] as const)("%s band returns a timeline through plan-to age", (band) => {
    const b = result.bands[band];
    expect(b.timeline.rows.length).toBeGreaterThan(60);
    expect(typeof b.funded).toBe("boolean");
    if (b.funded) expect(b.fiAge).toBeGreaterThan(20);
    else expect(b.neverFundedShortfall).not.toBeNull();
  });
});

interface MayaExpected {
  byStrategy: Record<SavingsStrategy, { fiAgeLikely: number; assetsAtRetirement: number; lifetimeTaxes: number; oneYearEarlierFailsAt: number }>;
  estateAtPlanTo: { enteredOnly: number };
  takeHomeYear1: number;
  year1ExtraTraditional401k: number;
  status: string;
}

/** The tolerance stated in maya.json: FI age exact; dollars within 1%. */
const within1Percent = (actual: number, expected: number) => Math.abs(actual - expected) <= Math.abs(expected) * 0.01;

describe("Maya tie-out (hand-checked, likely band, tie-out conventions)", () => {
  const expected = (maya as unknown as { expected: MayaExpected }).expected;
  const strategies = Object.keys(expected.byStrategy) as SavingsStrategy[];

  describe.each(strategies)("%s", (strategy) => {
    const likely = mayaFi(strategy);
    const e = expected.byStrategy[strategy];

    it(`FI age is exactly ${e.fiAgeLikely}`, () => {
      expect(likely.fiAge).toBe(e.fiAgeLikely);
    });

    it(`assets at retirement within 1% of ${e.assetsAtRetirement}`, () => {
      expect(likely.timeline.assetsAtRetirement).not.toBeNull();
      expect(within1Percent(likely.timeline.assetsAtRetirement!, e.assetsAtRetirement)).toBe(true);
    });

    it(`lifetime taxes within 1% of ${e.lifetimeTaxes}`, () => {
      expect(within1Percent(likely.timeline.lifetimeTaxes, e.lifetimeTaxes)).toBe(true);
    });

    it(`retiring one year earlier first falls short at ${e.oneYearEarlierFailsAt}`, () => {
      expect(likely.oneYearEarlier?.age).toBe(e.oneYearEarlierFailsAt);
    });
  });

  it(`estate at plan-to age (entered only) within 1% of ${expected.estateAtPlanTo.enteredOnly}`, () => {
    expect(within1Percent(mayaFi("enteredOnly").timeline.estate, expected.estateAtPlanTo.enteredOnly)).toBe(true);
  });

  it(`take-home in year 1 within $10 of ${expected.takeHomeYear1}`, () => {
    const year1 = mayaTimelineAt42("enteredOnly").rows[0]!;
    expect(Math.abs(year1.takeHome - expected.takeHomeYear1)).toBeLessThanOrEqual(10);
  });

  it(`extra traditional 401(k) in year 1 (max tax savings now) within 1% of ${expected.year1ExtraTraditional401k}`, () => {
    const year1 = mayaTimelineAt42("maxTaxSavingsNow").rows[0]!;
    const extra = year1.deductions.workplacePretax - 2880;
    expect(within1Percent(extra, expected.year1ExtraTraditional401k)).toBe(true);
  });

  describe.each(CHECKPOINT_FILES)("checkpoint rows: $file ($strategy, retire at 42)", ({ file, strategy }) => {
    const { checked, differences } = compareToCheckpoints(file, mayaTimelineAt42(strategy));

    it("checks every cell of every checkpoint row", () => {
      expect(checked).toBe(20 * 29);
    });

    it("matches the workpaper in every column: flows within $10, balances within 0.5%", () => {
      expect(differences.map((d) => `${d.year} ${d.column}: workpaper ${d.expected}, engine ${Math.round(d.actual)}`)).toEqual([]);
    });
  });
});
