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
  it("headlines (workpaper revised 2026-10-04): assets at retirement 810,124; lifetime taxes and penalties 495,177; estate 269,878; one year earlier fails at 65", () => {
    expect(within1Percent(t.assetsAtRetirement!, 810_124)).toBe(true);
    expect(within1Percent(t.lifetimeTaxes, 495_177)).toBe(true);
    expect(within1Percent(t.estate, 269_878)).toBe(true);
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
  it("headlines (workpaper revised 2026-10-04): estate 870,524 and lifetime taxes and penalties 528,351 within 1%; one year earlier fails at 68", () => {
    expect(within1Percent(t.estate, 870_524)).toBe(true);
    expect(within1Percent(t.lifetimeTaxes, 528_351)).toBe(true);
    expect(fi.oneYearEarlier?.age).toBe(68);
  });
  it("every checkpoint cell matches within tolerance, except the one recorded workpaper cell (2045 penalty; reconciliation log issue 4)", () => {
    const { checked, differences } = compareM2(M2_FILES[1]!.file, t);
    expect(checked).toBe(300);
    // The workpaper's 2045 penalty ($3,354) covers only the unseasoned conversions; its own taxes cell ($7,853) and its 2046 row
    // penalize the 401(k) draw too, as conventions 5 and 6 say. The engine's $4,712 is 10% of $33,544 plus $13,574.
    expect(differences.map((d) => `${d.year} ${d.column}`)).toEqual(["2045 penalty"]);
    expect(differences[0]!.actual).toBeCloseTo(4712, 0);
  });
});
