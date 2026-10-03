import { describe, expect, it } from "vitest";
import { emptyHousehold, missingLevelOneAnswers } from "./household";
import { userValue } from "./values";

const asOf = "2026-10-02";

describe("empty household", () => {
  it("fills only the dictionary defaults", () => {
    const h = emptyHousehold(asOf);
    expect(h.schemaVersion).toBe(1);
    expect(h.asOf).toBe(asOf);
    expect(h.self.birthDate).toBeUndefined();
    expect(h.self.state).toBeUndefined();
    expect(h.self.filingStatus).toMatchObject({ value: "single", confidence: "roughly" });
    expect(h.self.income).toEqual({ kind: "unanswered" });
    expect(h.spending).toEqual({ kind: "unanswered" });
    expect(h.accounts).toEqual({ kind: "unanswered" });
    expect(h.assumptions).toEqual({ set: "historical", overrides: {} });
    expect(h.partner).toBeUndefined();
  });

  it("lists the five required answers as missing", () => {
    expect(missingLevelOneAnswers(emptyHousehold(asOf))).toEqual(["birthDate", "state", "income", "spending", "accounts"]);
  });

  it("accepts 'none' as a complete answer for a list", () => {
    const h = emptyHousehold(asOf);
    h.self.birthDate = userValue("2001-03", asOf);
    h.self.state = userValue("NY", asOf);
    h.self.income = { kind: "none", asOf };
    h.spending = { kind: "rows", rows: [{ id: "all", category: "everythingElse", annual: userValue(30000, asOf, "roughly") }] };
    h.accounts = { kind: "none", asOf };
    expect(missingLevelOneAnswers(h)).toEqual([]);
  });
});
