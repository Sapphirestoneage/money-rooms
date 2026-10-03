import { describe, expect, it } from "vitest";
import maya from "../../tests/households/maya.json";
import { householdFromExample, type ExampleHouseholdFile } from "./examples";
import { emptyHousehold } from "./household";
import { EXPORT_FORMAT, EXPORT_VERSION, exportFileName, exportHousehold, exportToJson, importFromJson, validateHousehold } from "./transfer";

const asOf = "2026-10-02";

describe("export", () => {
  it("wraps the household in a versioned envelope", () => {
    const h = emptyHousehold(asOf);
    const e = exportHousehold(h, asOf);
    expect(e.format).toBe(EXPORT_FORMAT);
    expect(e.version).toBe(EXPORT_VERSION);
    expect(e.exportedAt).toBe(asOf);
    expect(e.household).toBe(h);
    expect(exportFileName(asOf)).toBe("money-rooms-2026-10-02.json");
  });
});

describe("import", () => {
  it("round-trips Maya exactly", () => {
    const h = householdFromExample(maya as ExampleHouseholdFile, asOf);
    const r = importFromJson(exportToJson(h, asOf));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.household).toEqual(h);
      expect(r.exportedAt).toBe(asOf);
    }
  });

  it("accepts a bare household too", () => {
    const h = emptyHousehold(asOf);
    const r = importFromJson(JSON.stringify(h));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.exportedAt).toBeNull();
  });

  it("names the problem for bad files", () => {
    expect(importFromJson("{nope")).toEqual({ ok: false, problems: ["The file is not valid JSON."] });
    expect(importFromJson("[]").ok).toBe(false);
    const wrong = importFromJson(JSON.stringify({ format: "something-else", version: 1, household: {} }));
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.problems[0]).toMatch(/not a Money Rooms export/);
    const newer = importFromJson(JSON.stringify({ format: EXPORT_FORMAT, version: 99, household: {} }));
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.problems[0]).toMatch(/newer than this app can read/);
  });

  it("validates the household shape and lists every problem", () => {
    const problems = validateHousehold({ schemaVersion: 2, asOf: "yesterday", self: {}, spending: {}, accounts: { kind: "rows", rows: "x" } });
    expect(problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/schema version 2/),
      expect.stringMatching(/plan date/),
      expect.stringMatching(/Filing status/),
      expect.stringMatching(/Spending is missing/),
      expect.stringMatching(/accounts rows are not a list/),
      expect.stringMatching(/Assumptions/),
    ]));
    expect(validateHousehold(emptyHousehold(asOf))).toEqual([]);
  });
});
