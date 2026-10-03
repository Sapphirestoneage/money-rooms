import { describe, expect, it } from "vitest";
import { monthlyFromAnnual, nominalFactor, toNominal } from "./display";

describe("nominal display conversion", () => {
  it("compounds inflation over the years from now", () => {
    expect(nominalFactor(3, 0)).toBe(1);
    expect(nominalFactor(3, 10)).toBeCloseTo(1.03 ** 10, 12);
    expect(toNominal(80000, 3, 20)).toBeCloseTo(80000 * 1.03 ** 20, 6);
  });

  it("gives a monthly figure for display", () => {
    expect(monthlyFromAnnual(49440)).toBe(4120);
  });
});
