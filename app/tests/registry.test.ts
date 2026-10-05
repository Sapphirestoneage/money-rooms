import { describe, expect, it } from "vitest";
import { MetricsRegistry, type InputReader, type Resolved } from "../core";
import { composite, empty, entered, newClientFile, notApplicable, readerFor, rough, unknown } from "../core";

/** A reader over a plain map of resolved inputs, for the registry tests. */
function mapReader(map: Record<string, Resolved<number>>): InputReader {
  return { read: (path) => map[path] };
}

const value = (v: number, isRough = false): Resolved<number> => ({ kind: "value", value: v, rough: isRough, status: isRough ? "rough" : "entered" });
const missing: Resolved<number> = { kind: "missing", status: "empty" };
const na: Resolved<number> = { kind: "notApplicable" };

function registry(): MetricsRegistry {
  return new MetricsRegistry()
    .register({ id: "income.gross", label: "Gross income", planet: "income", inputs: [{ id: "p.gross", missing: "wait" }], compute: (v) => v["p.gross"]! })
    .register({ id: "spending.baseline", label: "Baseline spending", planet: "spending", inputs: [{ id: "p.rent", missing: "wait" }, { id: "p.food", missing: "default", default: 600 }, { id: "p.therapy", missing: "zero" }], compute: (v) => v["p.rent"]! + v["p.food"]! + v["p.therapy"]! })
    .register({ id: "sun.surplus", label: "Monthly surplus", planet: "sun", inputs: [{ id: "income.gross", missing: "wait" }, { id: "spending.baseline", missing: "wait" }], compute: (v) => v["income.gross"]! - v["spending.baseline"]! })
    .register({ id: "safetyNet.runway", label: "Runway", planet: "safetyNet", inputs: [{ id: "p.cash", missing: "wait" }, { id: "spending.baseline", missing: "wait" }], compute: (v) => v["p.cash"]! / v["spending.baseline"]! });
}

describe("metric declarations", () => {
  it("every metric declares its inputs and a missing policy, and a default policy needs a default", () => {
    const r = new MetricsRegistry();
    expect(() => r.register({ id: "x", label: "x", planet: "sun", inputs: [{ id: "a", missing: "default" }], compute: () => 0 })).toThrow(/default/);
    expect(() => r.register({ id: "y", label: "y", planet: "sun", inputs: [], compute: () => 0 })).not.toThrow();
    expect(() => r.register({ id: "y", label: "y", planet: "sun", inputs: [], compute: () => 0 })).toThrow(/already/);
    expect(r.definition("y")?.inputs).toEqual([]);
  });
});

describe("missing policies (ARCHITECTURE.md section 3)", () => {
  it("wait: the metric reports what it needs and does not compute", () => {
    const r = registry();
    const out = r.evaluate("income.gross", mapReader({}));
    expect(out).toMatchObject({ state: "waiting", value: null, needs: ["p.gross"] });
  });

  it("default: the metric computes with the flagged default and is marked an estimate", () => {
    const r = registry();
    const out = r.evaluate("spending.baseline", mapReader({ "p.rent": value(1500), "p.therapy": value(0) }));
    expect(out.state).toBe("estimated");
    expect(out.value).toBe(2100);
    expect(out.flags.join(" ")).toMatch(/p\.food is missing, so a default of 600 was used/);
  });

  it("zero: the metric computes with 0 and says so, and the result is otherwise ok", () => {
    const r = registry();
    const out = r.evaluate("spending.baseline", mapReader({ "p.rent": value(1500), "p.food": value(500) }));
    expect(out.state).toBe("ok");
    expect(out.value).toBe(2000);
    expect(out.flags.join(" ")).toMatch(/p\.therapy is missing and counts as 0/);
  });

  it("a rough input makes the result rough, and the worst state wins", () => {
    // A registry caches by metric id, so each reading uses a fresh registry here.
    const out = registry().evaluate("spending.baseline", mapReader({ "p.rent": value(1500, true), "p.food": value(500), "p.therapy": value(0) }));
    expect(out).toMatchObject({ state: "rough", value: 2000 });
    const out2 = registry().evaluate("spending.baseline", mapReader({ "p.rent": value(1500, true), "p.therapy": value(0) }));
    expect(out2.state).toBe("estimated"); // estimated is worse than rough
  });

  it("a not-applicable input counts as 0 only under the zero policy; otherwise the metric is not applicable", () => {
    const r = registry();
    expect(r.evaluate("spending.baseline", mapReader({ "p.rent": value(1500), "p.food": value(500), "p.therapy": na }))).toMatchObject({ state: "ok", value: 2000 });
    expect(r.evaluate("income.gross", mapReader({ "p.gross": na }))).toMatchObject({ state: "notApplicable", value: null, needs: [] });
  });
});

describe("a metric never errors and never breaks a metric downstream", () => {
  it("a throwing compute becomes a waiting result that names itself", () => {
    const r = new MetricsRegistry()
      .register({ id: "bad", label: "bad", planet: "sun", inputs: [], compute: () => { throw new Error("boom"); } })
      .register({ id: "after", label: "after", planet: "sun", inputs: [{ id: "bad", missing: "zero" }], compute: (v) => v["bad"]! + 1 });
    const bad = r.evaluate("bad", mapReader({}));
    expect(bad).toMatchObject({ state: "waiting", value: null, needs: ["bad"] });
    expect(bad.flags.join(" ")).toMatch(/could not be computed: boom/);
    expect(r.evaluate("after", mapReader({}))).toMatchObject({ state: "ok", value: 1 });
  });

  it("a waiting upstream metric passes its needs downstream instead of an error", () => {
    const r = registry();
    const out = r.evaluate("sun.surplus", mapReader({ "p.rent": value(1500), "p.food": value(500), "p.therapy": value(0) }));
    expect(out.state).toBe("waiting");
    expect(out.needs).toEqual(["p.gross"]);
  });

  it("an unknown metric id is a waiting result, not an exception", () => {
    expect(registry().evaluate("nope", mapReader({}))).toMatchObject({ state: "waiting", needs: ["nope"] });
  });

  it("a dependency cycle is reported and treated as missing, never a stack overflow", () => {
    const r = new MetricsRegistry()
      .register({ id: "a", label: "a", planet: "sun", inputs: [{ id: "b", missing: "zero" }], compute: (v) => v["b"]! + 1 })
      .register({ id: "b", label: "b", planet: "sun", inputs: [{ id: "a", missing: "zero" }], compute: (v) => v["a"]! + 1 });
    const out = r.evaluate("a", mapReader({}));
    expect(out).toMatchObject({ state: "ok", value: 2 });
    // The cycle was cut inside b (it saw a already on the stack), and b's result says so.
    expect(r.evaluate("b", mapReader({})).flags.join(" ")).toMatch(/depend on each other/);
  });
});

describe("the registry is the dependency graph", () => {
  it("knows what is downstream of a path and of a metric", () => {
    const r = registry();
    expect(r.directDependents("p.rent")).toEqual(["spending.baseline"]);
    expect(r.dependentsOf("p.rent")).toEqual(["spending.baseline", "sun.surplus", "safetyNet.runway"]);
    expect(r.dependentsOf("p.gross")).toEqual(["income.gross", "sun.surplus"]);
    expect(r.dependentsOf("p.cash")).toEqual(["safetyNet.runway"]);
  });

  it("recomputes only the metrics downstream of a changed input", () => {
    const r = registry();
    const inputs: Record<string, Resolved<number>> = { "p.gross": value(6000), "p.rent": value(1500), "p.food": value(500), "p.therapy": value(0), "p.cash": value(10000) };
    const reader = mapReader(inputs);
    r.evaluateAll(reader);
    expect(r.evaluate("sun.surplus", reader).value).toBe(4000);
    expect(r.evaluate("safetyNet.runway", reader).value).toBe(5);
    const counts = () => Object.fromEntries(r.computeCount);
    expect(counts()).toEqual({ "income.gross": 1, "spending.baseline": 1, "sun.surplus": 1, "safetyNet.runway": 1 });

    inputs["p.gross"] = value(7000);
    expect(r.invalidate("p.gross")).toEqual(["income.gross", "sun.surplus"]);
    r.evaluateAll(reader);
    expect(r.evaluate("sun.surplus", reader).value).toBe(5000);
    expect(counts()).toEqual({ "income.gross": 2, "spending.baseline": 1, "sun.surplus": 2, "safetyNet.runway": 1 });

    inputs["p.cash"] = value(20000);
    r.invalidate("p.cash");
    r.evaluateAll(reader);
    expect(r.evaluate("safetyNet.runway", reader).value).toBe(10);
    expect(counts()).toEqual({ "income.gross": 2, "spending.baseline": 1, "sun.surplus": 2, "safetyNet.runway": 2 });
  });

  it("records what each result read", () => {
    const r = registry();
    expect(r.evaluate("sun.surplus", mapReader({})).reads).toEqual(["income.gross", "spending.baseline"]);
  });
});

describe("reading inputs from a client file", () => {
  it("resolves Inputs and Composites at a path, and nothing else", () => {
    const file = newClientFile("Test", "2026-10-05", "t1");
    file.drawers.facts.income["job"] = { id: "job", personId: "self", label: "Job", type: entered("salary"), grossMonthly: entered(6000, { asOf: "2026-09-30" }), takeHomeMonthly: unknown(), stability: entered("steady") };
    file.drawers.facts.spending["accommodation"] = { category: "accommodation", monthly: composite(rough(2000), [{ id: "rent", label: "Rent", input: entered(1800) }, { id: "utilities", label: "Utilities", input: empty() }]) };
    file.drawers.facts.spending["therapy"] = { category: "therapy", monthly: composite(notApplicable()) };
    const reader = readerFor(() => file);
    expect(reader.read("drawers.facts.income.job.grossMonthly")).toMatchObject({ kind: "value", value: 6000, asOf: "2026-09-30" });
    expect(reader.read("drawers.facts.income.job.takeHomeMonthly")).toEqual({ kind: "missing", status: "unknown" });
    expect(reader.read("drawers.facts.spending.accommodation.monthly")).toMatchObject({ kind: "value", value: 1800, partial: ["utilities"] });
    expect(reader.read("drawers.facts.spending.therapy.monthly")).toEqual({ kind: "notApplicable" });
    expect(reader.read("drawers.facts.income.job.label")).toBeUndefined();
    expect(reader.read("drawers.facts.income.nobody.grossMonthly")).toBeUndefined();

    const r = new MetricsRegistry().register({ id: "spending.accommodation", label: "Accommodation", planet: "spending", inputs: [{ id: "drawers.facts.spending.accommodation.monthly", missing: "wait" }], compute: (v) => v["drawers.facts.spending.accommodation.monthly"]! });
    const out = r.evaluate("spending.accommodation", reader);
    expect(out).toMatchObject({ state: "rough", value: 1800 });
    expect(out.flags.join(" ")).toMatch(/utilities still has no number/);
  });
});
