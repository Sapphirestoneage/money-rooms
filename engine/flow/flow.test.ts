import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, userValue, type ExampleHouseholdFile, type Household } from "../model";
import { agedValues, datedValues, refreshMinutes } from "./staleness";
import { levelsPassed, nextCard, valueItems } from "./items";
import { materialInputs, materialityLines, materialityReport, plausibleRange, realHourlyWage, worthSharpening } from "./materiality";
import { smallWins, smallWinsTotal } from "./small-wins";
import { findSkyNode, skyOutline, skyTree } from "./sky";

const asOf = "2026-10-03";
const mayaHousehold = (): Household => householdFromExample(maya as ExampleHouseholdFile, asOf);

describe("materiality", () => {
  it("ranges by kind match the spec: 2, 5, 25, and 50 percent", () => {
    expect(plausibleRange("known")).toBe(0.02);
    expect(plausibleRange("lookUp")).toBe(0.05);
    expect(plausibleRange("roughly")).toBe(0.25);
    expect(plausibleRange("default")).toBe(0.5);
  });

  it("the lines: $100 trivial, 5% material by default, clamped to 1% to 20%, with the rough-results label above 5%", () => {
    expect(materialityLines().clearlyTrivialAnnual).toBe(100);
    expect(materialityLines().materialShare).toBe(0.05);
    expect(materialityLines({ materialShare: 0.15 }).roughResults).toBe(true);
    expect(materialityLines({ materialShare: 0.5 }).materialShare).toBe(0.2);
    expect(materialityLines({ materialShare: 0.001 }).materialShare).toBe(0.01);
    expect(materialityLines().roughResults).toBe(false);
  });

  it("the real hourly wage is gross income over hours", () => {
    expect(realHourlyWage(mayaHousehold())).toBeCloseTo(72000 / 2000, 6);
  });

  it("lists every rough, look-up, or defaulted input and measures each one against the plan", () => {
    const h = mayaHousehold();
    expect(materialInputs(h).map((n) => n.inputId)).toEqual(expect.arrayContaining(["income.job.grossAnnual", "spending.spend-0-accommodation.annual", "account.loan.rate"]));
  });

  it("a balance left unconfirmed for 12 months is tested at the roughly range (M3 test 4, spec section 8)", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const fresh = materialInputs(h).find((n) => n.inputId === "account.k401.balance")!;
    expect(fresh.kind).toBe("known");
    // The same balance, 16 months old: the staleness clock widens it to roughly, so the next card can weigh it as material.
    if (h.accounts.kind === "rows") for (const a of h.accounts.rows) if (a.id === "k401") a.balance = { ...a.balance, asOf: "2025-06-01" };
    const aged = materialInputs(h, "2026-10-04").find((n) => n.inputId === "account.k401.balance")!;
    expect(aged.kind).toBe("roughly");
    const r = materialityReport(h);
    expect(r.fiNumber).toBeGreaterThan(100000);
    expect(r.sensitivities.length).toBeGreaterThan(5);
    expect(r.sensitivities[0]!.dollarsAtStake).toBeGreaterThanOrEqual(r.sensitivities[1]!.dollarsAtStake);
    const spending = r.sensitivities.filter((s) => s.inputId.startsWith("spending."));
    expect(spending.some((s) => s.material)).toBe(true);
    expect(r.coverage).toBeGreaterThan(0);
    expect(r.coverage).toBeLessThan(1);
    for (const s of r.sensitivities) expect(s.monthsAtStake).toBeGreaterThanOrEqual(0);
  });

  it("raising the material line from 5% to 15% removes items from the main path", () => {
    const h = mayaHousehold();
    const at5 = worthSharpening(materialityReport(h, { materialShare: 0.05 }));
    const at15 = worthSharpening(materialityReport(h, { materialShare: 0.15 }));
    expect(at15.length).toBeLessThan(at5.length);
  });
});

describe("staleness and the Refresh card", () => {
  it("a balance is due for a check after 3 months and widens to roughly at 12; income after 12 and 24", () => {
    const h = mayaHousehold();
    const fresh = datedValues(h, asOf);
    expect(fresh.every((v) => v.nextCheckInMonths > 0)).toBe(true);
    const later = datedValues(h, "2027-02-15");
    const chk = later.find((v) => v.inputId === "account.chk.balance")!;
    expect(chk.ageMonths).toBe(4);
    expect(chk.nextCheckInMonths).toBe(-1);
    expect(chk.widenedToRoughly).toBe(false);
    expect(chk.nextCheck).toBe("2027-01");
    const job = later.find((v) => v.inputId === "income.job.grossAnnual")!;
    expect(job.nextCheckInMonths).toBe(8);
    const muchLater = datedValues(h, "2028-01-01").find((v) => v.inputId === "account.chk.balance")!;
    expect(muchLater.widenedToRoughly).toBe(true);
  });

  it("the Refresh card lists only the aged numbers, oldest first, with minutes; confirming restarts the clock", () => {
    const h = mayaHousehold();
    const aged = agedValues(h, "2027-02-15");
    expect(aged.length).toBeGreaterThan(0);
    expect(aged.every((v) => v.nextCheckInMonths <= 0)).toBe(true);
    expect(refreshMinutes(aged)).toBeGreaterThanOrEqual(1);
    aged[0]!.confirm(h, "2027-02-15");
    const again = agedValues(h, "2027-02-15");
    expect(again.find((v) => v.inputId === aged[0]!.inputId)).toBeUndefined();
    const confirmed = datedValues(h, "2027-02-15").find((v) => v.inputId === aged[0]!.inputId)!;
    expect(confirmed.asOf).toBe("2027-02-15");
    expect(confirmed.nextCheck).toBe("2027-05");
  });
});

describe("items and the next card", () => {
  it("every item carries value, effort, and why (acceptance test 6)", () => {
    const h = mayaHousehold();
    for (const i of valueItems(h, null)) {
      expect(i.effortMinutes).toBeGreaterThan(0);
      expect(i.why.length).toBeGreaterThan(10);
      expect(i.valueDollars).toBeGreaterThanOrEqual(0);
    }
  });

  it("a missing required answer is the big card, worth the whole FI number", () => {
    const h = mayaHousehold();
    delete h.self.state;
    const card = nextCard(h, null);
    expect(card.big?.id).toBe("q.state");
    expect(card.currentLevel).toBe(1);
  });

  it("with the basics in, the big card is the highest value per minute and the small cards follow it", () => {
    const h = mayaHousehold();
    const report = materialityReport(h);
    const card = nextCard(h, report);
    expect(card.big).not.toBeNull();
    const all = valueItems(h, report).filter((i) => !i.done && i.valueDollars >= report.lines.worthItPerHour * i.effortMinutes / 60 && i.valueDollars >= 100 && i.level <= card.currentLevel);
    const best = all.sort((a, b) => b.valuePerMinute - a.valuePerMinute)[0]!;
    expect(card.big!.valuePerMinute).toBeGreaterThanOrEqual(best.valuePerMinute);
    expect(card.small.length).toBeLessThanOrEqual(2);
    for (const s of card.small) expect(s.valuePerMinute).toBeLessThanOrEqual(card.big!.valuePerMinute);
  });

  it("level 1 passes once nothing material is left to sharpen; level 4 needs the drawdown inputs", () => {
    const h = mayaHousehold();
    expect(levelsPassed(h, null)).toEqual([1]);
    const report = materialityReport(h);
    const passed = levelsPassed(h, report);
    expect(passed.includes(4)).toBe(false);
  });
});

describe("small wins", () => {
  it("personalizes estimates from the household's spending and keeps a running total; promotion crosses the material line", () => {
    const h = mayaHousehold();
    const wins = smallWins(h, { "sub.audit": "done", "bank.hysa": "done", "ins.auto": "notForMe" });
    const sub = wins.find((w) => w.id === "sub.audit")!;
    expect(sub.state).toBe("done");
    expect(sub.estimate[1]).toBeGreaterThan(sub.estimate[0]);
    const total = smallWinsTotal(wins, 20000, 2000);
    expect(total.doneCount).toBe(2);
    expect(total.doneAnnual).toBeGreaterThan(0);
    expect(total.doneMonths).toBeGreaterThan(0);
    expect(smallWinsTotal(wins, 1000, 2000).promote).toBe(true);
    expect(smallWinsTotal(wins, 1e9, 2000).promote).toBe(false);
  });
});

describe("the Sky", () => {
  it("zooms from everything to an area to a row, and the outline shows the same hierarchy", () => {
    const h = mayaHousehold();
    const root = skyTree(h, materialityReport(h), "FI at 41");
    expect(root.depth).toBe(0);
    expect(root.children.map((c) => c.id)).toEqual(["you", "income", "spending", "accounts", "debts", "taxes", "goals"]);
    const accounts = findSkyNode(root, "accounts")!;
    expect(accounts.node.children.length).toBe(3);
    const row = findSkyNode(root, "account.chk")!;
    expect(row.trail.map((n) => n.id)).toEqual(["everything", "accounts", "account.chk"]);
    expect(row.node.details.length).toBeGreaterThan(1);
    const outline = skyOutline(root);
    expect(outline.length).toBe(1 + 7 + outline.filter((o) => o.depth === 2).length);
    expect(outline.filter((o) => o.depth === 2).map((o) => o.node.id)).toContain("account.chk");
  });

  it("circles carry state: fill is coverage, ring is kind, size is materiality", () => {
    const h = mayaHousehold();
    delete h.self.state;
    const root = skyTree(h, null, "No date yet");
    expect(root.kind).toBe("missing");
    expect(findSkyNode(root, "you")!.node.coverage).toBeLessThan(1);
    const withReport = skyTree(mayaHousehold(), materialityReport(mayaHousehold()), "FI at 41");
    const spendingArea = findSkyNode(withReport, "spending")!.node;
    expect(spendingArea.size).toBeGreaterThan(findSkyNode(withReport, "taxes")!.node.size);
  });
});
