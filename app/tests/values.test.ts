import { describe, expect, it } from "vitest";
import { COMPLETE, STATUSES, composite, type Input, empty, entered, isComplete, isMissing, isStale, none, notApplicable, resolve, resolveComposite, rough, unknown, verified } from "../core";

describe("input statuses (DATA_MODEL.md section 3)", () => {
  it("has exactly the seven statuses in the brief", () => {
    expect(STATUSES).toEqual(["empty", "unknown", "rough", "entered", "verified", "none", "notApplicable"]);
  });

  it("counts rough, entered, verified, none, and not applicable as answered", () => {
    expect(COMPLETE).toEqual(["rough", "entered", "verified", "none", "notApplicable"]);
    for (const s of STATUSES) expect(isComplete({ status: s })).toBe(COMPLETE.includes(s));
    expect(isComplete(undefined)).toBe(false);
  });

  it("treats empty, unknown, and absent inputs as missing", () => {
    expect(isMissing(empty())).toBe(true);
    expect(isMissing(unknown())).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing(none())).toBe(false);
    expect(isMissing(rough(1))).toBe(false);
  });

  it("constructors carry metadata (as-of, source, precision)", () => {
    const v = verified(1200, { asOf: "2026-09-30" });
    expect(v).toEqual({ status: "verified", value: 1200, precision: "exact", source: "statement", asOf: "2026-09-30" });
    expect(rough(50).precision).toBe("rough");
    expect(entered(50, { source: "client", asOf: "2026-10-01" })).toMatchObject({ source: "client", asOf: "2026-10-01", precision: "exact" });
  });
});

describe("resolve", () => {
  it("returns 0 for none, the value for entered and verified, and marks rough values rough", () => {
    expect(resolve(none())).toEqual({ kind: "value", value: 0, rough: false, status: "none" });
    expect(resolve(entered(10))).toMatchObject({ kind: "value", value: 10, rough: false });
    expect(resolve(verified(10))).toMatchObject({ kind: "value", value: 10, rough: false });
    expect(resolve(rough(10))).toMatchObject({ kind: "value", value: 10, rough: true });
    expect(resolve(entered(10, { precision: "orderOfMagnitude" }))).toMatchObject({ rough: true });
  });

  it("reports empty and unknown as missing with their status", () => {
    expect(resolve(empty())).toEqual({ kind: "missing", status: "empty" });
    expect(resolve(unknown())).toEqual({ kind: "missing", status: "unknown" });
    expect(resolve(undefined)).toEqual({ kind: "missing", status: "empty" });
  });

  it("reports not applicable as its own kind, never as 0", () => {
    expect(resolve(notApplicable())).toEqual({ kind: "notApplicable" });
  });

  it("treats an entered status with no usable number as missing (a template placeholder)", () => {
    expect(resolve({ status: "entered", value: null as unknown as number })).toEqual({ kind: "missing", status: "empty" });
    expect(resolve({ status: "entered", value: Number.NaN })).toEqual({ kind: "missing", status: "empty" });
  });

  it("carries the as-of date through", () => {
    expect(resolve(entered(5, { asOf: "2026-01-31" }))).toMatchObject({ asOf: "2026-01-31" });
  });
});

describe("composite inputs: detail overrides the total", () => {
  const line = (id: string, input: Input<number>) => ({ id, label: id, input });

  it("uses the total when no line has a number", () => {
    const c = composite(rough(2000), [line("a", empty()), line("b", unknown())]);
    const r = resolveComposite(c);
    expect(r.from).toBe("total");
    expect(r.resolved).toMatchObject({ kind: "value", value: 2000, rough: true });
    expect(r.missingLines).toEqual([]);
  });

  it("sums the lines when any line has a number, even if the total disagrees", () => {
    const c = composite(entered(9999), [line("rent", entered(1500)), line("utilities", entered(200))]);
    const r = resolveComposite(c);
    expect(r.from).toBe("lines");
    expect(r.resolved).toMatchObject({ kind: "value", value: 1700, rough: false });
  });

  it("reports the lines that are still missing as a partial sum", () => {
    const c = composite(entered(9999), [line("rent", entered(1500)), line("insurance", unknown()), line("tax", empty())]);
    const r = resolveComposite(c);
    expect(r.missingLines).toEqual(["insurance", "tax"]);
    expect(r.resolved).toMatchObject({ kind: "value", value: 1500, partial: ["insurance", "tax"] });
  });

  it("counts a none line as 0 and leaves a not-applicable line out", () => {
    const c = composite(empty(), [line("a", entered(100)), line("b", none()), line("c", notApplicable())]);
    const r = resolveComposite(c);
    expect(r.resolved).toMatchObject({ value: 100 });
    expect(r.missingLines).toEqual([]);
  });

  it("is rough when any counted line is rough, and carries the latest as-of date", () => {
    const c = composite(empty(), [line("a", entered(100, { asOf: "2026-01-01" })), line("b", rough(50, { asOf: "2026-03-01" }))]);
    expect(resolveComposite(c).resolved).toMatchObject({ value: 150, rough: true, status: "rough", asOf: "2026-03-01" });
  });

  it("passes a not-applicable total through when there are no lines", () => {
    expect(resolveComposite(composite(notApplicable())).resolved).toEqual({ kind: "notApplicable" });
  });
});

describe("isStale", () => {
  it("is stale when the as-of date is older than the window", () => {
    expect(isStale({ asOf: "2026-01-15" }, "2026-10-05", 6)).toBe(true);
    expect(isStale({ asOf: "2026-06-15" }, "2026-10-05", 6)).toBe(false);
    expect(isStale({}, "2026-10-05", 6)).toBe(false);
  });
});
