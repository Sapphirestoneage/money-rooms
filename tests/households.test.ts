/**
 * The audit tie-outs (tests/README.md). Each example household is loaded,
 * projected in all three bands, and compared with its hand-checked expected
 * values where they are filled in. A mismatch is reported, never "fixed" here.
 *
 * Maya's tie-out is OPEN as of 2026-10-02: the engine and the spreadsheet
 * disagree on method (see tests/tie-out/README.md). Those checks are marked
 * `it.fails`, which means "known to fail until resolved". When one of them
 * starts passing, vitest will report it, and the mark must be removed.
 */

import { describe, expect, it } from "vitest";
import { householdFromExample, project, userValue, type ExampleHouseholdFile, type SavingsStrategy } from "../engine";
import dev from "./households/dev.json";
import jordan from "./households/jordan.json";
import maya from "./households/maya.json";

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
  takeHomeYear1: number;
  year1ExtraTraditional401k: number;
  status: string;
}

const within1Percent = (actual: number, expected: number) => Math.abs(actual - expected) <= Math.abs(expected) * 0.01;

/** Known open mismatch: expected to fail until the method differences are resolved. */
const open = it.fails;

describe("Maya tie-out (hand-checked, likely band) [OPEN, see tests/tie-out/README.md]", () => {
  const expected = (maya as unknown as { expected: MayaExpected }).expected;
  const strategies = Object.keys(expected.byStrategy) as SavingsStrategy[];

  describe.each(strategies)("%s", (strategy) => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    h.savingsStrategy = userValue(strategy, asOf);
    const likely = project(h).bands.likely;
    const e = expected.byStrategy[strategy];

    open(`FI age is exactly ${e.fiAgeLikely} (engine: ${likely.fiAge})`, () => {
      expect(likely.fiAge).toBe(e.fiAgeLikely);
    });

    open(`assets at retirement within 1% of ${e.assetsAtRetirement} (engine: ${Math.round(likely.timeline.assetsAtRetirement ?? 0)})`, () => {
      expect(likely.timeline.assetsAtRetirement).not.toBeNull();
      expect(within1Percent(likely.timeline.assetsAtRetirement!, e.assetsAtRetirement)).toBe(true);
    });

    open(`lifetime taxes within 1% of ${e.lifetimeTaxes} (engine: ${Math.round(likely.timeline.lifetimeTaxes)})`, () => {
      expect(within1Percent(likely.timeline.lifetimeTaxes, e.lifetimeTaxes)).toBe(true);
    });

    open(`retiring one year earlier first falls short at ${e.oneYearEarlierFailsAt} (engine: ${likely.oneYearEarlier?.age})`, () => {
      expect(likely.oneYearEarlier?.age).toBe(e.oneYearEarlierFailsAt);
    });
  });

  const enteredOnlyRows = project(householdFromExample(maya as ExampleHouseholdFile, asOf)).bands.likely.timeline.rows;
  const year0 = enteredOnlyRows[0]!;

  it(`take-home in year 1 within 1% of ${expected.takeHomeYear1} (engine 2026 annualized: ${Math.round(year0.takeHome / year0.fraction)})`, () => {
    expect(within1Percent(year0.takeHome / year0.fraction, expected.takeHomeYear1)).toBe(true);
  });

  const maxTax = householdFromExample(maya as ExampleHouseholdFile, asOf);
  maxTax.savingsStrategy = userValue("maxTaxSavingsNow", asOf);
  const maxTaxYear0 = project(maxTax).bands.likely.timeline.rows[0]!;
  const extra = maxTaxYear0.deductions.workplacePretax / maxTaxYear0.fraction - 2880;

  open(`extra traditional 401(k) in year 1 (max tax savings now) within 1% of ${expected.year1ExtraTraditional401k} (engine 2026 annualized: ${Math.round(extra)})`, () => {
    expect(within1Percent(extra, expected.year1ExtraTraditional401k)).toBe(true);
  });
});
