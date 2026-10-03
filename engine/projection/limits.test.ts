import { describe, expect, it } from "vitest";
import { loadTaxTables } from "../model";
import { contributionLimits } from "./limits";

const t = loadTaxTables(2026).federal;

describe("contributionLimits by age (2026)", () => {
  it("under 50: base limits", () => {
    expect(contributionLimits(25, t)).toEqual({ workplace: 24500, ira: 7500, hsa: 4400 });
  });

  it("50 to 54: workplace and IRA catch-ups", () => {
    expect(contributionLimits(50, t)).toEqual({ workplace: 32500, ira: 8600, hsa: 4400 });
  });

  it("55 to 59: HSA catch-up joins", () => {
    expect(contributionLimits(55, t)).toEqual({ workplace: 32500, ira: 8600, hsa: 5400 });
  });

  it("60 to 63: the higher workplace catch-up replaces the regular one", () => {
    expect(contributionLimits(60, t).workplace).toBe(24500 + 11250);
    expect(contributionLimits(63, t).workplace).toBe(24500 + 11250);
  });

  it("64 and up: back to the regular catch-up", () => {
    expect(contributionLimits(64, t).workplace).toBe(32500);
  });
});
