import { describe, expect, it } from "vitest";
import {
  allocationFromTuple,
  assetFromPreset,
  debtFromPreset,
  getAccountPreset,
  isAccountPresetKey,
  loadAccountPresets,
  loadQuickAllocations,
} from "./presets";
import { userValue } from "./values";

const asOf = "2026-10-02";

describe("account presets file", () => {
  const presets = loadAccountPresets();

  it("loads every preset with a label and a side", () => {
    const keys = Object.keys(presets);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const p = presets[key as keyof typeof presets];
      expect(p.label.length).toBeGreaterThan(0);
      expect(["asset", "debt"]).toContain(p.side);
    }
  });

  it("gives every asset a tax bucket, liquidity, allocation summing to 100, and fees", () => {
    for (const p of Object.values(presets)) {
      if (p.side !== "asset") continue;
      expect(p.allocation.stocks + p.allocation.bonds + p.allocation.cash).toBe(100);
      expect(p.fees).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every debt an interest-deductible flag", () => {
    for (const p of Object.values(presets)) {
      if (p.side !== "debt") continue;
      expect(typeof p.interestDeductible).toBe("boolean");
    }
  });

  it("covers the presets the example households use", () => {
    for (const key of ["checking", "savings", "trad401k", "rothIRA", "hsa", "brokerage", "studentFederal", "creditCard", "family"]) {
      expect(isAccountPresetKey(key)).toBe(true);
    }
    expect(isAccountPresetKey("yacht")).toBe(false);
  });

  it("maps tax bucket to the preset family (3.6 validation)", () => {
    expect(getAccountPreset("trad401k")).toMatchObject({ taxBucket: "pretax", liquidity: "penaltyBefore59Half" });
    expect(getAccountPreset("rothIRA")).toMatchObject({ taxBucket: "roth" });
    expect(getAccountPreset("hsa")).toMatchObject({ taxBucket: "hsa", liquidity: "restricted" });
    expect(getAccountPreset("checking")).toMatchObject({ taxBucket: "cash", liquidity: "now" });
  });

  it("offers the three quick allocations", () => {
    const quick = loadQuickAllocations();
    expect(quick.mostlyStocks).toEqual({ stocks: 90, bonds: 10, cash: 0 });
    expect(quick.balanced).toEqual({ stocks: 60, bonds: 40, cash: 0 });
    expect(quick.mostlyCash).toEqual({ stocks: 0, bonds: 0, cash: 100 });
  });

  it("rejects allocations that do not sum to 100", () => {
    expect(() => allocationFromTuple([50, 40, 0], "test")).toThrow(/sum to 100/);
    expect(() => allocationFromTuple([50, 50], "test")).toThrow(/three numbers/);
  });
});

describe("building accounts from presets (2.9)", () => {
  it("fills an asset's fields with source preset and keeps the balance as entered", () => {
    const k401 = assetFromPreset("trad401k", "k401", userValue(8200, asOf), asOf);
    expect(k401.side).toBe("asset");
    expect(k401.balance).toEqual({ value: 8200, asOf, source: "user", confidence: "known" });
    expect(k401.taxBucket).toEqual({ value: "pretax", asOf, source: "preset", confidence: "known" });
    expect(k401.allocation.value).toEqual({ stocks: 90, bonds: 10, cash: 0 });
    expect(k401.fees.value).toBe(0.2);
    expect(k401.annualContribution.value).toBe(0);
    expect(k401.name?.value).toBe("401(k) or 403(b), traditional");
  });

  it("fills a debt from the preset plus the person's terms, defaulting actual payment to the minimum", () => {
    const loan = debtFromPreset(
      "studentFederal",
      "loan",
      userValue(24000, asOf),
      { rate: userValue(5.5, asOf), minimumPaymentAnnual: userValue(3120, asOf) },
      asOf,
    );
    expect(loan.side).toBe("debt");
    expect(loan.interestDeductible).toEqual({ value: true, asOf, source: "preset", confidence: "known" });
    expect(loan.purpose.value).toBe("personal");
    expect(loan.actualPaymentAnnual.value).toBe(3120);
  });

  it("marks a business card as business by default", () => {
    const card = debtFromPreset("businessCard", "biz", userValue(1000, asOf), {
      rate: userValue(24, asOf),
      minimumPaymentAnnual: userValue(600, asOf),
    });
    expect(card.purpose.value).toBe("business");
  });

  it("refuses to build the wrong side", () => {
    expect(() => assetFromPreset("creditCard", "x", userValue(1, asOf))).toThrow(/debt/);
    expect(() =>
      debtFromPreset("checking", "x", userValue(1, asOf), { rate: userValue(0, asOf), minimumPaymentAnnual: userValue(0, asOf) }),
    ).toThrow(/asset/);
  });
});
