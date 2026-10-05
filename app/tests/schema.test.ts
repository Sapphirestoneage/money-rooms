import { describe, expect, it } from "vitest";
import { APP_ID, SCHEMA_VERSION, migrate, newClientFile, parse, serialize, validate } from "../core";

describe("schema version and migration (DATA_MODEL.md section 5)", () => {
  it("stamps every new file with the schema version and the app id", () => {
    const f = newClientFile("Test", "2026-10-05", "t1");
    expect(f.schemaVersion).toBe(SCHEMA_VERSION);
    expect(f.app).toBe(APP_ID);
    expect(f.client).toEqual({ id: "t1", label: "Test", createdAt: "2026-10-05", notes: "" });
    expect(f.household.people).toHaveLength(1);
    expect(f.household.people[0]!.birthDate.status).toBe("empty");
    expect(Object.keys(f.drawers).sort()).toEqual(["assumptions", "facts", "goals", "scenarios"]);
    expect(f.ledger).toEqual([]);
    expect(f.snapshots).toEqual([]);
  });

  it("stores a birth date, not an age", () => {
    const f = newClientFile("Test", "2026-10-05", "t1");
    expect("age" in f.household.people[0]!).toBe(false);
    expect("birthDate" in f.household.people[0]!).toBe(true);
  });

  it("validates a fresh file as complete and round-trips through JSON", () => {
    const f = newClientFile("Test", "2026-10-05", "t1");
    expect(validate(f as unknown as Record<string, unknown>)).toEqual([]);
    const back = parse(serialize(f));
    expect(back.file).toEqual(f);
    expect(back.steps).toEqual([]);
  });

  it("migrates a version 0 file (no version, app id, ledger, or snapshots) to version 1", () => {
    const f = newClientFile("Old", "2026-01-01", "old1");
    const { schemaVersion: _v, app: _a, ledger: _l, snapshots: _s, ...rest } = f;
    void _v; void _a; void _l; void _s;
    const result = migrate(rest);
    expect(result.steps).toEqual([0]);
    expect(result.file.schemaVersion).toBe(1);
    expect(result.file.app).toBe(APP_ID);
    expect(result.file.ledger).toEqual([]);
    expect(result.file.snapshots).toEqual([]);
    expect(result.file.drawers).toEqual(f.drawers);
  });

  it("refuses a file saved by a newer app, plainly", () => {
    const f = newClientFile("New", "2026-10-05", "n1");
    expect(() => migrate({ ...f, schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/saved by a newer Money Rooms/);
  });

  it("refuses something that is not a client file, naming what is missing", () => {
    expect(() => migrate(null)).toThrow(/not a Money Rooms client file/);
    expect(() => migrate([1, 2])).toThrow(/not a Money Rooms client file/);
    expect(() => parse("{not json")).toThrow(/not valid JSON/);
    expect(() => parse(JSON.stringify({ schemaVersion: 1, app: APP_ID }))).toThrow(/client needs an id and a label/);
    expect(() => parse(JSON.stringify({ schemaVersion: 1, app: "other" }))).toThrow(/app is other/);
  });

  it("requires a household of one or two people", () => {
    const f = newClientFile("Test", "2026-10-05", "t1");
    const three = { ...f, household: { ...f.household, people: [...f.household.people, ...f.household.people, ...f.household.people] } };
    expect(validate(three as unknown as Record<string, unknown>)).toContain("household needs one or two people");
    const two = { ...f, household: { ...f.household, people: [f.household.people[0]!, { ...f.household.people[0]!, id: "partner", role: "partner" as const }] } };
    expect(validate(two as unknown as Record<string, unknown>)).toEqual([]);
  });
});
