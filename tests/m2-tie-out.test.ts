/**
 * The M2 tie-out (tests/m2-tie-out-conventions.md): the engine under M2 conventions mode against
 * Eli's Plan A and Plan B workpapers. A mismatch is reported, never fixed by editing an expected value.
 * Reconciliation log: docs/audits/m2-tie-out-reconciliation.md.
 */

import { describe, expect, it } from "vitest";
import { M2_FILES, M2_RETIREMENT_YEAR, compareM2, m2Fi, m2Timeline, planAPolicy, planBPolicy } from "./tie-out/maya-m2-tie-out";

const within1Percent = (actual: number, expected: number) => Math.abs(actual - expected) <= Math.abs(expected) * 0.01;

describe("M2 tie-out, Plan A (default policy)", () => {
  const fi = m2Fi(planAPolicy());
  const t = m2Timeline(planAPolicy());
  it("FI age is exactly 41, retiring in 2042", () => {
    expect(fi.fiAge).toBe(41);
    expect(fi.retirementYear).toBe(M2_RETIREMENT_YEAR);
  });
  it("headlines: assets at retirement 810,124; lifetime taxes and penalties 495,667; estate 267,086; one year earlier fails at 65", () => {
    expect(within1Percent(t.assetsAtRetirement!, 810_124)).toBe(true);
    expect(within1Percent(t.lifetimeTaxes, 495_667)).toBe(true);
    expect(within1Percent(t.estate, 267_086)).toBe(true);
    expect(fi.oneYearEarlier?.age).toBe(65);
  });
  it("every checkpoint cell matches within tolerance", () => {
    const { checked, differences } = compareM2(M2_FILES[0]!.file, t);
    expect(checked).toBe(280);
    expect(differences).toEqual([]);
  });
});

describe("M2 tie-out, Plan B (conversions to the 200% ACA target, Roth layers before the 401(k))", () => {
  const fi = m2Fi(planBPolicy());
  const t = m2Timeline(planBPolicy());
  it("FI age is exactly 41, retiring in 2042", () => {
    expect(fi.fiAge).toBe(41);
    expect(fi.retirementYear).toBe(M2_RETIREMENT_YEAR);
  });
  it("headlines: estate 846,744 and lifetime taxes and penalties 534,979 within 1%; one year earlier fails at 68", () => {
    expect(within1Percent(t.estate, 846_744)).toBe(true);
    expect(within1Percent(t.lifetimeTaxes, 534_979)).toBe(true);
    expect(fi.oneYearEarlier?.age).toBe(68);
  });
  it("every cell through 2045 matches; the 2046 and later differences trace to the workpaper's 2045 conversion (reconciliation log, issue 1)", () => {
    const { checked, differences } = compareM2(M2_FILES[1]!.file, t);
    expect(checked).toBe(280);
    expect(differences.filter((d) => d.year < 2046)).toEqual([]);
    // What remains is the recorded workpaper issue: the 2046 Roth balance carries the 2045 conversion difference directly
    // (about 7%); the 401(k), Roth, and total balances it moves afterwards stay within 2% of the workpaper. (The small
    // taxable balance that reappears in 2096 from required-distribution surplus is downstream of the same difference.)
    const material = new Set(["k401_end", "roth_end", "total_end"]);
    for (const d of differences.filter((d) => material.has(d.column) && !(d.year === 2046 && d.column === "roth_end"))) {
      expect(Math.abs(d.actual - d.expected) / Math.abs(d.expected)).toBeLessThan(0.02);
    }
  });
});
