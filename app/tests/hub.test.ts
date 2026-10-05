import { describe, expect, it } from "vitest";
import { Hub, type Published } from "../core";

const ok = (id: string, value: number): Published => ({ id, state: "ok", value, needs: [], flags: [], reads: [] });
const waiting = (id: string): Published => ({ id, state: "waiting", value: null, needs: ["x"], flags: [], reads: [] });

describe("the Sun as a hub (ARCHITECTURE.md rule 1)", () => {
  it("planets publish under their own name and anyone reads the published outputs", () => {
    const hub = new Hub();
    hub.publish("income", { monthlyGross: ok("income.monthlyGross", 6000), monthlyTakeHome: waiting("income.monthlyTakeHome") });
    expect(hub.read("income", "monthlyGross")?.value).toBe(6000);
    expect(hub.value("income", "monthlyGross")).toBe(6000);
    expect(hub.value("income", "monthlyTakeHome")).toBeNull();
    expect(hub.value("income", "nothingHere")).toBeNull();
    expect(hub.value("taxes", "anything")).toBeNull();
    expect(Object.keys(hub.all())).toEqual(["income"]);
  });

  it("a republish replaces the planet's earlier outputs", () => {
    const hub = new Hub();
    hub.publish("debt", { totalDebt: ok("debt.totalDebt", 5000), monthlyDebtService: ok("debt.monthlyDebtService", 200) });
    hub.publish("debt", { totalDebt: ok("debt.totalDebt", 4000) });
    expect(hub.value("debt", "totalDebt")).toBe(4000);
    expect(hub.read("debt", "monthlyDebtService")).toBeUndefined();
  });

  it("refuses a planet publishing another planet's metric", () => {
    const hub = new Hub();
    expect(() => hub.publish("spending", { totalDebt: ok("debt.totalDebt", 1) })).toThrow(/spending cannot publish totalDebt from metric debt\.totalDebt/);
    expect(() => hub.publish("spending", { monthlyBaseline: ok("spending.monthlyBaseline", 1) })).not.toThrow();
    expect(() => hub.publish("spending", { monthlyBaseline: ok("monthlyBaseline", 1) })).not.toThrow();
  });

  it("tells listeners what was published, and listeners can leave", () => {
    const hub = new Hub();
    const seen: string[] = [];
    const off = hub.onPublish((planet, key) => seen.push(`${planet}.${key}`));
    hub.publish("safetyNet", { runway: ok("safetyNet.runway", 4) });
    off();
    hub.publish("safetyNet", { runway: ok("safetyNet.runway", 5) });
    expect(seen).toEqual(["safetyNet.runway"]);
  });
});

describe("the namespace check is strict", () => {
  it("does not accept an id that merely ends with the key", () => {
    const hub = new Hub();
    expect(() => hub.publish("spending", { baseline: ok("debt.baseline", 1) })).toThrow(/spending cannot publish baseline/);
    expect(() => hub.publish("spending", { baseline: ok("spending.monthly.baseline", 1) })).toThrow(/spending cannot publish baseline/);
    expect(() => hub.publish("spending", { "monthly.baseline": ok("spending.monthly.baseline", 1) })).not.toThrow();
  });
});
