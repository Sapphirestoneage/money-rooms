import { describe, expect, it } from "vitest";
import { loadTaxTables, stateColumnFor, stateTable, validateBrackets } from "./tax-tables";
import { STATE_CODES } from "./types";

describe("bracket validation", () => {
  it("accepts an ascending schedule starting at zero", () => {
    expect(() => validateBrackets([{ from: 0, rate: 10 }, { from: 12400, rate: 12 }], "t")).not.toThrow();
  });

  it("rejects schedules that do not start at zero, do not ascend, or have bad rates", () => {
    expect(() => validateBrackets([{ from: 100, rate: 10 }], "t")).toThrow(/start at 0/);
    expect(() => validateBrackets([{ from: 0, rate: 10 }, { from: 0, rate: 12 }], "t")).toThrow(/ascend/);
    expect(() => validateBrackets([{ from: 0, rate: 120 }], "t")).toThrow(/percent/);
    expect(() => validateBrackets([], "t")).toThrow();
  });
});

describe("federal tables for 2026 (Rev. Proc. 2025-32 and friends)", () => {
  const { federal, year, retrieved } = loadTaxTables(2026);

  it("is the 2026 file with a retrieval date", () => {
    expect(year).toBe(2026);
    expect(retrieved).toBe("2026-10-02");
  });

  it("has seven brackets per filing status with the published thresholds", () => {
    expect(federal.ordinaryBrackets.single.map((b) => b.from)).toEqual([0, 12400, 50400, 105700, 201775, 256225, 640600]);
    expect(federal.ordinaryBrackets.marriedJoint.map((b) => b.from)).toEqual([0, 24800, 100800, 211400, 403550, 512450, 768700]);
    expect(federal.ordinaryBrackets.headOfHousehold.map((b) => b.from)).toEqual([0, 17700, 67450, 105700, 201750, 256200, 640600]);
    expect(federal.ordinaryBrackets.marriedSeparate.map((b) => b.from)).toEqual([0, 12400, 50400, 105700, 201775, 256225, 384350]);
    for (const schedule of Object.values(federal.ordinaryBrackets)) {
      expect(schedule.map((b) => b.rate)).toEqual([10, 12, 22, 24, 32, 35, 37]);
    }
  });

  it("has the published standard deductions", () => {
    expect(federal.standardDeduction).toMatchObject({ single: 16100, marriedJoint: 32200, marriedSeparate: 16100, headOfHousehold: 24150 });
  });

  it("has the 2026 FICA rates and wage base", () => {
    expect(federal.fica).toMatchObject({ socialSecurityRate: 6.2, socialSecurityWageBase: 184500, medicareRate: 1.45, additionalMedicareRate: 0.9 });
    expect(federal.fica.additionalMedicareThreshold).toEqual({ single: 200000, marriedJoint: 250000, marriedSeparate: 125000, headOfHousehold: 200000 });
  });

  it("has self-employment tax and the early withdrawal penalty", () => {
    expect(federal.selfEmployment).toMatchObject({ rate: 15.3, netEarningsFactor: 0.9235, halfDeductibleFromIncome: true, minimumNetEarnings: 400 });
    expect(federal.earlyWithdrawalPenalty).toMatchObject({ rate: 10, beforeAge: 59.5 });
  });

  it("has the 2026 contribution limits", () => {
    expect(federal.contributionLimits).toMatchObject({
      workplaceElective: 24500, workplaceCatchUp50: 8000, workplaceCatchUp60to63: 11250,
      ira: 7500, iraCatchUp50: 1100, hsaSelfOnly: 4400, hsaFamily: 8750, hsaCatchUp55: 1000,
    });
    expect(federal.contributionLimits.rothIraPhaseOut.single).toEqual([153000, 168000]);
    expect(federal.contributionLimits.rothIraPhaseOut.marriedJoint).toEqual([242000, 252000]);
  });
});

describe("state tables for 2026", () => {
  const { states } = loadTaxTables(2026);

  it("covers all 50 states and DC", () => {
    expect(Object.keys(states).sort()).toEqual([...STATE_CODES].sort());
    expect(Object.keys(states)).toHaveLength(51);
  });

  it("has nine no-tax jurisdictions, counting Washington's wage income", () => {
    const none = Object.entries(states).filter(([, s]) => s.structure === "none").map(([c]) => c).sort();
    expect(none).toEqual(["AK", "FL", "NH", "NV", "SD", "TN", "TX", "WA", "WY"]);
  });

  it("marks the three household states as officially verified and the rest as look-it-up", () => {
    for (const code of ["NY", "NJ", "TX"] as const) {
      expect(states[code].confidence).toBe("known");
      expect(states[code].source.kind).toBe("official");
      expect(states[code].verified).toBe("2026-10-02");
    }
    expect(states.CA.confidence).toBe("lookUp");
    expect(states.CA.source.kind).toBe("secondary");
    expect(states.CA.verified).toBeNull();
  });

  it("has New York's 2026 reduced lower brackets", () => {
    const ny = stateTable("NY");
    expect(ny.brackets?.single.slice(0, 5)).toEqual([
      { from: 0, rate: 3.9 }, { from: 8500, rate: 4.4 }, { from: 11700, rate: 5.15 }, { from: 13900, rate: 5.4 }, { from: 80650, rate: 5.9 },
    ]);
    expect(ny.standardDeduction).toEqual({ single: 8000, marriedJoint: 16050 });
  });

  it("has New Jersey's official schedule, including the 5.525% bracket", () => {
    const nj = stateTable("NJ");
    expect(nj.brackets?.single.map((b) => b.rate)).toEqual([1.4, 1.75, 3.5, 5.525, 6.37, 8.97, 10.75]);
    expect(nj.brackets?.marriedJoint.map((b) => b.from)).toEqual([0, 20000, 50000, 70000, 80000, 150000, 500000, 1000000]);
    expect(nj.standardDeduction).toBeNull();
  });

  it("shows exempt floors as a 0% first bracket", () => {
    expect(stateTable("OH").brackets?.single).toEqual([{ from: 0, rate: 0 }, { from: 26050, rate: 2.75 }]);
    expect(stateTable("MS").brackets?.single[0]).toEqual({ from: 0, rate: 0 });
  });

  it("maps filing statuses onto the two state columns", () => {
    expect(stateColumnFor("single")).toBe("single");
    expect(stateColumnFor("marriedSeparate")).toBe("single");
    expect(stateColumnFor("headOfHousehold")).toBe("single");
    expect(stateColumnFor("marriedJoint")).toBe("marriedJoint");
  });

  it("refuses a year that has no file", () => {
    expect(() => loadTaxTables(2027)).toThrow(/No tax tables for 2027/);
  });
});
