/**
 * The messy-financials modules on Rosa (answers batch, Part 3): hard season (decision A15), family loans
 * (A12), and the registry's view of the six new manifests. tests/rosa.test.ts holds the hand-checked numbers.
 */

import { describe, expect, it } from "vitest";
import rosa from "../households/rosa.json";
import { activeModules, familyLoans, hardSeasonSuggestion, hardSeasonView, householdFromExample, loadModules, ruleOfFive, stabilityItems, userValue, type ExampleHouseholdFile } from "../../engine";

const asOf = "2026-10-04";
const h = () => householdFromExample(rosa as ExampleHouseholdFile, asOf);

describe("hard season", () => {
  it("is suggested for Rosa because the family loan weighs 5 of 5, and never turned on by the engine", () => {
    const s = hardSeasonSuggestion(h(), { runShocks: false });
    expect(s.suggested).toBe(true);
    expect(s.reasons.some((r) => r.includes("5 of 5"))).toBe(true);
    expect(hardSeasonView(h()).on).toBe(false);
  });

  it("puts pausing or reducing the family loan payment first, never a spending cut", () => {
    const items = stabilityItems(h());
    expect(items[0]!.id).toBe("loan.family.pause");
    expect(items[0]!.label).toContain("Reduce");
    expect(items[0]!.monthly).toBe(1000);
    expect(items.some((i) => /cut|spend less|trim/i.test(i.label))).toBe(false);
    expect(items.map((i) => i.id)).toContain("runway");
  });

  it("while on, the view says the nudges are paused and lists stability first", () => {
    const on = h();
    on.hardSeason = userValue(true, asOf);
    const v = hardSeasonView(on);
    expect(v.on).toBe(true);
    expect(v.sentences[0]).toContain("paused");
    expect(v.items[0]!.id).toBe("loan.family.pause");
  });
});

describe("family loans", () => {
  it("names the gift exclusion per lender ($19,000 x 2 a year, about 7 years for $230,000), the below-market flag above $100,000 at 0%, and the flexible payment", () => {
    const [loan] = familyLoans(h());
    expect(loan).toBeDefined();
    expect(loan!.lenders).toBe(2);
    expect(loan!.forgivableAYear).toBe(38000);
    expect(loan!.yearsToForgiveAll).toBe(7);
    expect(loan!.belowMarket).toBe(true);
    expect(loan!.flexibility).toBe("flexible");
    expect(loan!.flags.some((f) => f.includes("$38,000 a year"))).toBe(true);
    expect(loan!.flags.some((f) => f.includes("lender's tax"))).toBe(true);
    expect(loan!.flags.some((f) => f.includes("Rule of 5"))).toBe(true);
  });

  it("a flexible payment stays out of the Rule of 5 target (decision A11); a fixed one counts", () => {
    const flexible = ruleOfFive(h()).monthlySpending;
    const fixed = h();
    if (fixed.accounts.kind === "rows") for (const a of fixed.accounts.rows) if (a.side === "debt") a.paymentFlexibility = userValue("fixed", asOf);
    expect(ruleOfFive(fixed).monthlySpending - flexible).toBeCloseTo(1000, 6);
  });
});

describe("the six new manifests", () => {
  it("are all beta, and five of them are active for Rosa with the beta switch on (safety needs nothing; lump-sum needs an account)", () => {
    const ids = ["dependents", "home", "family-loans", "lump-sum", "hard-season", "safety"];
    for (const id of ids) expect(loadModules().find((m) => m.id === id)?.flag).toBe("beta");
    const active = activeModules(h(), { beta: true }).map((m) => m.id);
    for (const id of ids) expect(active, id).toContain(id);
    const off = activeModules(h(), { beta: false }).map((m) => m.id);
    for (const id of ids) expect(off).not.toContain(id);
  });
});
