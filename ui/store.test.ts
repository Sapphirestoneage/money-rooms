import { describe, expect, it } from "vitest";
import { householdFromExample, type ExampleHouseholdFile } from "../engine";
import maya from "../tests/households/maya.json";
import { rowId } from "./dom";
import { PREFS_KEY, SNAPSHOT_KEY, STORAGE_KEY, browserStore } from "./store";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const sameDay = () => "2026-10-02";

describe("browser store", () => {
  it("starts with an empty household when nothing is saved", () => {
    const store = browserStore(fakeStorage(), sameDay);
    const h = store.load();
    expect(h.schemaVersion).toBe(1);
    expect(h.self.income).toEqual({ kind: "unanswered" });
  });

  it("round-trips a household", () => {
    const storage = fakeStorage();
    const store = browserStore(storage, sameDay);
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-02");
    expect(store.save(h)).toBe(true);
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    expect(store.load()).toEqual(h);
    store.clear();
    expect(storage.map.has(STORAGE_KEY)).toBe(false);
  });

  it("ignores junk and works without storage at all", () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(browserStore(storage, sameDay).load().schemaVersion).toBe(1);
    storage.setItem(STORAGE_KEY, JSON.stringify({ hello: 1 }));
    expect(browserStore(storage, sameDay).load().schemaVersion).toBe(1);
    expect(browserStore(null, sameDay).load().schemaVersion).toBe(1);
  });

  it("keeps a snapshot before import, and clears it", () => {
    const storage = fakeStorage();
    const store = browserStore(storage, sameDay);
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-02");
    expect(store.loadSnapshot()).toBeNull();
    store.saveSnapshot(h, "2026-10-02T12:00:00Z");
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true);
    expect(store.loadSnapshot()).toEqual({ takenAt: "2026-10-02T12:00:00Z", household: h });
    store.clearSnapshot();
    expect(store.loadSnapshot()).toBeNull();
  });
});

describe("keeping things from visit to visit", () => {
  it("a later visit keeps every entered value and its as-of date, and moves the plan date to today", () => {
    const storage = fakeStorage();
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-02");
    browserStore(storage, sameDay).save(h);

    // The person comes back five weeks later, in a fresh page load.
    const later = browserStore(storage, () => "2026-11-09").load();
    expect(later.asOf).toBe("2026-11-09");
    expect(later.self.birthDate).toEqual(h.self.birthDate);
    expect(later.self.income).toEqual(h.self.income);
    expect(later.spending).toEqual(h.spending);
    expect(later.accounts).toEqual(h.accounts);
    if (later.accounts.kind === "rows") expect(later.accounts.rows[0]!.balance.asOf).toBe("2026-10-02");
  });

  it("says whether the browser will keep what is saved", () => {
    expect(browserStore(fakeStorage(), sameDay).isPersistent()).toBe(true);
    expect(browserStore(null, sameDay).isPersistent()).toBe(false);
    const refusing = { getItem: () => null, setItem: () => { throw new Error("blocked"); }, removeItem: () => undefined };
    const store = browserStore(refusing, sameDay);
    expect(store.isPersistent()).toBe(false);
    expect(store.save(householdFromExample(maya as ExampleHouseholdFile, "2026-10-02"))).toBe(false);
  });

  it("remembers display choices separately from the plan", () => {
    const storage = fakeStorage();
    const store = browserStore(storage, sameDay);
    expect(store.loadPrefs()).toEqual({ cadence: {} });
    store.savePrefs({ cadence: { "job|Gross pay": "month" } });
    expect(storage.map.has(PREFS_KEY)).toBe(true);
    expect(browserStore(storage, sameDay).loadPrefs()).toEqual({ cadence: { "job|Gross pay": "month" } });
  });

  it("gives new rows ids that cannot repeat on a later visit", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) ids.add(rowId("income"));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^income-[a-z0-9]+-[a-z0-9]+$/);
  });
});
