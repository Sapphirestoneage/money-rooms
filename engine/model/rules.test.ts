import { describe, expect, it } from "vitest";
import { RuleLedger, isVerified, loadRules, rule, ruleAppliesIn, toRef } from "./rules";

describe("the rules registry", () => {
  it("loads and validates every entry", () => {
    const rules = loadRules();
    expect(rules.size).toBeGreaterThan(15);
    for (const r of rules.values()) expect(["current", "sunsetting", "watch", "stale"]).toContain(r.status);
  });

  it("gives a verified rule with its value and source", () => {
    const r = rule<{ single: number }>("fed.standardDeduction.2026");
    expect(r.value.single).toBe(16100);
    expect(r.url).toMatch(/^https:\/\/www\.irs\.gov\//);
    expect(isVerified(r)).toBe(true);
  });

  it("refuses an unverified rule, so a feature cannot lean on an unchecked number", () => {
    const unverified = [...loadRules().values()].find((r) => r.lastVerified === null);
    expect(unverified).toBeDefined();
    expect(() => rule(unverified!.id)).toThrow(/not been verified/);
  });

  it("throws for an id that does not exist", () => {
    expect(() => rule("fed.unicorn")).toThrow(/No rule/);
  });

  it("knows when a rule applies: dated rules carry forward, sunsets end, ranges and ongoing work", () => {
    expect(ruleAppliesIn(rule("fed.brackets.2026"), 2026)).toBe(true);
    expect(ruleAppliesIn(rule("fed.brackets.2026"), 2040)).toBe(true);
    expect(ruleAppliesIn(rule("fed.brackets.2026"), 2025)).toBe(false);
    const senior = rule("fed.seniorDeduction");
    expect(ruleAppliesIn(senior, 2026)).toBe(true);
    expect(ruleAppliesIn(senior, 2028)).toBe(true);
    expect(ruleAppliesIn(senior, 2029)).toBe(false);
    expect(ruleAppliesIn(rule("fed.niit"), 2070)).toBe(true);
    expect(ruleAppliesIn(rule("access.sepp72t"), 2022)).toBe(false);
    expect(ruleAppliesIn(rule("access.sepp72t"), 2030)).toBe(true);
  });

  it("the ledger records what was read and names the tripwires", () => {
    const ledger = new RuleLedger();
    ledger.get("fed.niit");
    expect(ledger.getIfApplies("fed.seniorDeduction", 2030)).toBeNull();
    expect(ledger.getIfApplies("fed.seniorDeduction", 2027)).not.toBeNull();
    ledger.get("health.acaPtc.2026");
    const ids = ledger.refs().map((r) => r.id);
    expect(ids).toEqual(["fed.niit", "fed.seniorDeduction", "health.acaPtc.2026"]);
    expect(ledger.tripwires().map((r) => r.id)).toEqual(["fed.seniorDeduction", "health.acaPtc.2026"]);
    expect(toRef(rule("fed.niit")).lastVerified).toBe("2026-10-03");
  });
});

describe("stale rules (decision F7)", () => {
  it("lists a used rule checked more than 15 months before the plan date, and never throws", () => {
    const ledger = new RuleLedger();
    ledger.get("fed.seniorDeduction");
    const ref = ledger.refs().find((r) => r.id === "fed.seniorDeduction")!;
    expect(ref.lastVerified).not.toBeNull();
    expect(ledger.stale("2026-12-01", 15)).toEqual([]);
    expect(ledger.stale("2028-06-01", 15).map((r) => r.id)).toEqual(["fed.seniorDeduction"]);
  });

  it("ignores unverified rules (they are flagged on their own)", () => {
    const ledger = new RuleLedger();
    ledger.getUnverified("ss.spousalAndSurvivor");
    expect(ledger.stale("2040-01-01", 15)).toEqual([]);
    expect(ledger.unverified().map((r) => r.id)).toEqual(["ss.spousalAndSurvivor"]);
  });
});
