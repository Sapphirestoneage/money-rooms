import { describe, expect, it } from "vitest";
import dev from "../../tests/households/dev.json";
import maya from "../../tests/households/maya.json";
import { householdFromExample, parseEndRule, type ExampleHouseholdFile } from "./examples";
import { missingLevelOneAnswers } from "./household";

const asOf = "2026-10-02";

describe("parseEndRule", () => {
  it("reads the three forms", () => {
    expect(parseEndRule(undefined)).toEqual({ kind: "retirement" });
    expect(parseEndRule("retirement")).toEqual({ kind: "retirement" });
    expect(parseEndRule("age:30")).toEqual({ kind: "age", age: 30 });
    expect(parseEndRule("2030-06")).toEqual({ kind: "date", date: "2030-06" });
    expect(() => parseEndRule("someday")).toThrow();
  });
});

describe("householdFromExample", () => {
  it("loads Maya with every required answer present", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    expect(missingLevelOneAnswers(h)).toEqual([]);
    expect(h.self.birthDate?.value).toBe("2001-03");
    expect(h.self.state?.value).toBe("NY");
    if (h.self.income.kind !== "rows") throw new Error("expected income rows");
    const job = h.self.income.rows[0]!;
    expect(job.grossAnnual).toMatchObject({ value: 72000, confidence: "known" });
    expect(job.end).toEqual({ kind: "retirement" });
    expect(job.employerMatch?.capPercentOfPay.value).toBe(4);
    expect(job.preTaxDeductions?.[0]).toMatchObject({ type: "401k" });
    if (h.accounts.kind !== "rows") throw new Error("expected account rows");
    const loan = h.accounts.rows.find((a) => a.id === "loan")!;
    expect(loan.side).toBe("debt");
    if (loan.side === "debt") {
      expect(loan.rate.value).toBe(5.5);
      expect(loan.minimumPaymentAnnual.value).toBe(3120);
      expect(loan.actualPaymentAnnual.value).toBe(3120);
    }
    expect(h.savingsStrategy.value).toBe("enteredOnly");
  });

  it("loads Dev's self-employment, gig end age, and stress ratings", () => {
    const h = householdFromExample(dev as ExampleHouseholdFile, asOf);
    if (h.self.income.kind !== "rows") throw new Error("expected income rows");
    expect(h.self.income.rows[0]?.businessExpensesAnnual?.value).toBe(4000);
    expect(h.self.income.rows[1]?.end).toEqual({ kind: "age", age: 30 });
    if (h.accounts.kind !== "rows") throw new Error("expected account rows");
    const mom = h.accounts.rows.find((a) => a.id === "mom")!;
    expect(mom.stress?.value).toBe(5);
  });
});
