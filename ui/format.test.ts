import { describe, expect, it } from "vitest";
import { age, amountForInput, dollars, dollarsShort, dollarsWithConfidence, parseMoney, percent, withCadence } from "./format";

describe("style guide number formats", () => {
  it("dollars: whole, with commas", () => {
    expect(dollars(4120)).toBe("$4,120");
    expect(dollars(4120.6)).toBe("$4,121");
    expect(dollars(-350)).toBe("-$350");
  });

  it("abbreviates above a million in summaries", () => {
    expect(dollarsShort(1_234_000)).toBe("$1.2M");
    expect(dollarsShort(999_999)).toBe("$999,999");
  });

  it("prefixes rough numbers with about", () => {
    expect(dollarsWithConfidence(3000, "roughly")).toBe("About $3,000");
    expect(dollarsWithConfidence(3000, "known")).toBe("$3,000");
  });

  it("rates have one decimal at most, ages are whole, cadence is always shown", () => {
    expect(percent(6.5)).toBe("6.5%");
    expect(percent(6)).toBe("6%");
    expect(age(41.7)).toBe("Age 41");
    expect(withCadence("$4,120", "month")).toBe("$4,120 / month");
  });
});

describe("money input parsing", () => {
  it("accepts the forms the design system lists", () => {
    expect(parseMoney("4120")).toBe(4120);
    expect(parseMoney("4,120")).toBe(4120);
    expect(parseMoney("$4,120")).toBe(4120);
    expect(parseMoney("4.1k")).toBeCloseTo(4100, 9);
    expect(parseMoney("1.2m")).toBe(1_200_000);
  });

  it("rejects things that are not money", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("lots")).toBeNull();
    expect(parseMoney("4,1,20x")).toBeNull();
  });
});

describe("amounts shown in a field", () => {
  it("uses commas, and cents only when there are any", () => {
    expect(amountForInput(72000)).toBe("72,000");
    expect(amountForInput(4120.5)).toBe("4,120.50");
    expect(amountForInput(0)).toBe("0");
  });

  it("round-trips through the parser", () => {
    expect(parseMoney(amountForInput(1234567))).toBe(1234567);
    expect(parseMoney(amountForInput(4120.5))).toBe(4120.5);
  });
});
