import { describe, expect, it } from "vitest";
import { EVERYTHING_ELSE, getSpendingCategory, isSpendingCategoryId, loadSpendingCategories } from "./categories";

describe("spending categories file", () => {
  const categories = loadSpendingCategories();

  it("has unique ids and valid fields", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of categories) {
      expect(["essential", "discretionary"]).toContain(c.type);
      expect(["yes", "no", "changes"]).toContain(c.continuesInRetirement);
    }
  });

  it("includes the one-total fallback category", () => {
    expect(isSpendingCategoryId(EVERYTHING_ELSE)).toBe(true);
    expect(getSpendingCategory(EVERYTHING_ELSE)).toMatchObject({ type: "discretionary", continuesInRetirement: "yes" });
  });

  it("covers the categories the example households use", () => {
    for (const id of ["accommodation", "food", "transportation", "travel", "everythingElse"]) {
      expect(isSpendingCategoryId(id)).toBe(true);
    }
    expect(isSpendingCategoryId("yachts")).toBe(false);
    expect(() => getSpendingCategory("yachts")).toThrow();
  });

  it("treats healthcare and work costs the way the dictionary says", () => {
    expect(getSpendingCategory("healthcare").continuesInRetirement).toBe("changes");
    expect(getSpendingCategory("workCosts").continuesInRetirement).toBe("no");
  });
});
