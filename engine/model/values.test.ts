import { describe, expect, it } from "vitest";
import {
  assumptionValue,
  computedValue,
  isAnswered,
  notForMe,
  presetValue,
  statementValue,
  userValue,
  valueOr,
} from "./values";

const asOf = "2026-10-02";

describe("value helpers", () => {
  it("userValue defaults to known", () => {
    expect(userValue(72000, asOf)).toEqual({ value: 72000, asOf, source: "user", confidence: "known" });
  });

  it("userValue accepts roughly and lookUp", () => {
    expect(userValue(500, asOf, "roughly").confidence).toBe("roughly");
    expect(userValue(500, asOf, "lookUp").confidence).toBe("lookUp");
  });

  it("each source helper sets its source", () => {
    expect(statementValue(1, asOf).source).toBe("statement");
    expect(presetValue(1, asOf).source).toBe("preset");
    expect(assumptionValue(1, asOf).source).toBe("assumptionSet");
    expect(computedValue(1, asOf).source).toBe("computed");
    expect(computedValue(1, asOf).confidence).toBe("computed");
  });

  it("notForMe has a null value and counts as answered-but-not-applicable", () => {
    const n = notForMe(asOf);
    expect(n.value).toBeNull();
    expect(n.confidence).toBe("notForMe");
    expect(isAnswered(n)).toBe(false);
    expect(isAnswered(userValue(5, asOf))).toBe(true);
  });

  it("valueOr falls back only for notForMe", () => {
    expect(valueOr(userValue(5, asOf), 0)).toBe(5);
    expect(valueOr(notForMe(asOf), 0)).toBe(0);
  });
});
