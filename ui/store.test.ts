import { describe, expect, it } from "vitest";
import { householdFromExample, type ExampleHouseholdFile } from "../engine";
import maya from "../tests/households/maya.json";
import { SNAPSHOT_KEY, STORAGE_KEY, browserStore } from "./store";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

describe("browser store", () => {
  it("starts with an empty household when nothing is saved", () => {
    const store = browserStore(fakeStorage());
    const h = store.load();
    expect(h.schemaVersion).toBe(1);
    expect(h.self.income).toEqual({ kind: "unanswered" });
  });

  it("round-trips a household", () => {
    const storage = fakeStorage();
    const store = browserStore(storage);
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-02");
    store.save(h);
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    expect(store.load()).toEqual(h);
    store.clear();
    expect(storage.map.has(STORAGE_KEY)).toBe(false);
  });

  it("ignores junk and works without storage at all", () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(browserStore(storage).load().schemaVersion).toBe(1);
    storage.setItem(STORAGE_KEY, JSON.stringify({ hello: 1 }));
    expect(browserStore(storage).load().schemaVersion).toBe(1);
    expect(browserStore(null).load().schemaVersion).toBe(1);
  });

  it("keeps a snapshot before import, and clears it", () => {
    const storage = fakeStorage();
    const store = browserStore(storage);
    const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-02");
    expect(store.loadSnapshot()).toBeNull();
    store.saveSnapshot(h, "2026-10-02T12:00:00Z");
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true);
    expect(store.loadSnapshot()).toEqual({ takenAt: "2026-10-02T12:00:00Z", household: h });
    store.clearSnapshot();
    expect(store.loadSnapshot()).toBeNull();
  });
});
