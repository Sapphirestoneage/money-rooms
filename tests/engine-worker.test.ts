import { describe, expect, it } from "vitest";
import maya from "./households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "../engine";
import { runEngineJob, type EngineMessage } from "../ui/workers/engine.worker";

const h = () => householdFromExample(maya as ExampleHouseholdFile, "2026-10-03");

describe("the engine worker's jobs (decisions S2 and A3)", () => {
  it("projects the three bands, reports the stage first, and the result survives structured cloning", () => {
    const got: EngineMessage[] = [];
    runEngineJob({ id: 7, kind: "project", household: h() }, (m) => got.push(m));
    expect(got[0]).toEqual({ id: 7, stage: "projecting" });
    const done = got.at(-1)!;
    if (!("done" in done) || done.kind !== "project") throw new Error("no projection came back");
    expect(typeof done.projection.bands.likely.fiAge).toBe("number");
    expect(Object.keys(done.projection.bands).sort()).toEqual(["best", "likely", "worst"]);
    // postMessage needs plain data: no functions, no class instances.
    expect(() => structuredClone(done)).not.toThrow();
  });

  it("runs the backtests and sturdy dates, reporting each stage in order", () => {
    const got: EngineMessage[] = [];
    runEngineJob({ id: 8, kind: "backtests", household: h(), thresholdPercent: 90, trimPercent: 10, minHistoryYears: 30 }, (m) => got.push(m));
    const stages = got.filter((m) => "stage" in m).map((m) => ("stage" in m ? m.stage : ""));
    expect(stages).toEqual(["fiDate", "backtest", "guardrails", "flex", "sturdy", "flexSturdy"]);
    const done = got.at(-1)!;
    if (!("done" in done) || done.kind !== "backtests") throw new Error("no backtests came back");
    expect(done.fiYear).not.toBeNull();
    expect(done.plain!.starts.length).toBeGreaterThan(50);
    expect(done.plain!.successRate).toBeGreaterThanOrEqual(0);
    expect(done.sturdy).not.toBeNull();
    expect(() => structuredClone(done)).not.toThrow();
  });

  it("reports an error instead of throwing when the household cannot run", () => {
    const got: EngineMessage[] = [];
    const broken = h();
    broken.self = undefined as never;
    runEngineJob({ id: 9, kind: "project", household: broken }, (m) => got.push(m));
    const last = got.at(-1)!;
    expect("error" in last).toBe(true);
  });
});
