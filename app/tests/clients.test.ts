import { describe, expect, it } from "vitest";
import { ClientManager, SNAPSHOT_CAP, applyChange, entered, memoryStorage, newClientFile, serialize, type ClientFile } from "../core";

function setup(day = "2026-10-05") {
  const storage = memoryStorage();
  const clock = { day };
  const manager = new ClientManager(storage, () => clock.day);
  return { storage, clock, manager };
}

describe("the client picker (DATA_MODEL.md section 6)", () => {
  it("creates, opens, lists, and closes clients, with one open at a time", () => {
    const { manager } = setup();
    expect(manager.current()).toBeNull();
    expect(manager.list()).toEqual([]);
    const a = manager.create("Household A", "a");
    expect(manager.current()?.client.id).toBe("a");
    expect(a.client.label).toBe("Household A");
    manager.create("Household B", "b");
    expect(manager.current()?.client.id).toBe("b");
    expect(manager.list().map((c) => c.id)).toEqual(["a", "b"]);
    manager.open("a");
    expect(manager.current()?.client.id).toBe("a");
    manager.close();
    expect(manager.current()).toBeNull();
    expect(manager.list()).toHaveLength(2);
  });

  it("refuses a blank label and a duplicate id, and an unknown client", () => {
    const { manager } = setup();
    expect(() => manager.create("   ")).toThrow(/needs a label/);
    manager.create("A", "a");
    expect(() => manager.create("Again", "a")).toThrow(/already exists/);
    expect(() => manager.open("zzz")).toThrow(/No client with id zzz/);
  });

  it("remembers the open client across a reload of the console", () => {
    const { storage, manager } = setup();
    manager.create("A", "a");
    const again = new ClientManager(storage, () => "2026-10-06");
    expect(again.current()?.client.id).toBe("a");
  });

  it("deletes a client's working copy and forgets it in the picker", () => {
    const { manager } = setup();
    manager.create("A", "a");
    manager.create("B", "b");
    manager.delete("b");
    expect(manager.current()).toBeNull();
    expect(manager.list().map((c) => c.id)).toEqual(["a"]);
  });

  it("saves changes to the open client and refuses an update that swaps clients", () => {
    const { storage, manager } = setup();
    manager.create("A", "a");
    manager.update((f) => applyChange(f, { path: "household.state", to: entered("NY"), by: "coach", why: "intake", at: "2026-10-05" }).file);
    expect(manager.current()?.household.state).toEqual(entered("NY"));
    expect((JSON.parse(storage.map.get("mr1.client.a")!) as ClientFile).household.state).toEqual(entered("NY"));
    expect(() => manager.update(() => newClientFile("Other", "2026-10-05", "zz"))).toThrow(/cannot change which client is open/);
    manager.close();
    expect(() => manager.update((f) => f)).toThrow(/No client is open/);
  });
});

describe("snapshots", () => {
  it("takes a snapshot at the start of every session (create and open)", () => {
    const { manager, clock } = setup();
    manager.create("A", "a");
    expect(manager.snapshots().map((s) => s.reason)).toEqual(["sessionStart"]);
    manager.close();
    clock.day = "2026-10-06";
    manager.open("a");
    expect(manager.snapshots().map((s) => [s.reason, s.takenAt])).toEqual([["sessionStart", "2026-10-06"], ["sessionStart", "2026-10-05"]]);
  });

  it("a snapshot is the file as it stood, without the snapshot list inside it", () => {
    const { manager } = setup();
    manager.create("A", "a");
    manager.update((f) => applyChange(f, { path: "household.state", to: entered("NY"), by: "coach", why: "intake", at: "2026-10-05" }).file);
    const snap = manager.snapshot("manual")!;
    expect(snap.file.household.state).toEqual(entered("NY"));
    expect("snapshots" in snap.file).toBe(false);
    expect(manager.snapshots()[0]).toEqual(snap);
  });

  it("keeps at most the newest snapshots", () => {
    const { manager } = setup();
    manager.create("A", "a");
    for (let i = 0; i < SNAPSHOT_CAP + 5; i++) manager.snapshot("manual");
    expect(manager.current()?.snapshots).toHaveLength(SNAPSHOT_CAP);
    expect(manager.snapshot("manual")).not.toBeNull();
    manager.close();
    expect(manager.snapshot("manual")).toBeNull();
  });
});

describe("export and import", () => {
  it("exports the open client as a *.client.json file with the schema version inside", () => {
    const { manager } = setup();
    manager.create("Household A", "a");
    expect(manager.exportFileName()).toBe("household-a.2026-10-05.client.json");
    const text = manager.exportJson();
    const parsed = JSON.parse(text) as ClientFile;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.client.id).toBe("a");
    expect(parsed.snapshots).toHaveLength(1);
    manager.close();
    expect(() => manager.exportJson()).toThrow(/No client is open/);
  });

  it("imports a file for a new client and opens it", () => {
    const { manager } = setup();
    const other = newClientFile("From a folder", "2026-09-01", "f1");
    const result = manager.importJson(serialize(other));
    expect(result.replaced).toBe(false);
    expect(result.migrated).toEqual([]);
    expect(manager.current()?.client.id).toBe("f1");
    expect(manager.list().map((c) => c.id)).toEqual(["f1"]);
  });

  it("snapshots the open client before an import, and the import can be undone", () => {
    const { manager } = setup();
    manager.create("A", "a");
    manager.update((f) => applyChange(f, { path: "household.state", to: entered("NY"), by: "coach", why: "intake", at: "2026-10-05" }).file);
    const exported = manager.exportJson();
    manager.update((f) => applyChange(f, { path: "household.state", to: entered("NJ"), by: "coach", why: "moved", at: "2026-10-06" }).file);

    const result = manager.importJson(exported);
    expect(result.replaced).toBe(true);
    expect(manager.current()?.household.state).toEqual(entered("NY"));
    expect(manager.snapshots()[0]?.reason).toBe("beforeImport");
    expect(manager.snapshots()[0]?.file.household.state).toEqual(entered("NJ"));

    const restored = manager.undoLastImport();
    expect(restored?.household.state).toEqual(entered("NJ"));
    expect(manager.current()?.household.state).toEqual(entered("NJ"));
    expect(manager.snapshots().map((s) => s.reason)).not.toContain("beforeImport");
    expect(manager.undoLastImport()).toBeNull();
  });

  it("importing another client's file closes the open one, keeping its before-import snapshot", () => {
    const { manager } = setup();
    manager.create("A", "a");
    const b = newClientFile("B", "2026-09-01", "b");
    const result = manager.importJson(serialize(b));
    expect(result.replaced).toBe(false);
    expect(manager.current()?.client.id).toBe("b");
    expect(manager.undoLastImport()).toBeNull();
    manager.open("a");
    expect(manager.snapshots().map((s) => s.reason)).toEqual(["sessionStart", "beforeImport", "sessionStart"]);
  });

  it("migrates an older file on import and reports the steps", () => {
    const { manager } = setup();
    const f = newClientFile("Old", "2026-01-01", "old");
    const { schemaVersion: _v, app: _a, ledger: _l, snapshots: _s, ...rest } = f;
    void _v; void _a; void _l; void _s;
    const result = manager.importJson(JSON.stringify(rest));
    expect(result.migrated).toEqual([0]);
    expect(manager.current()?.schemaVersion).toBe(1);
    expect(ClientManager.peek(JSON.stringify(rest))).toEqual({ label: "Old", id: "old", schemaVersionBefore: 0 });
  });

  it("refuses a bad file and changes nothing", () => {
    const { manager } = setup();
    manager.create("A", "a");
    expect(() => manager.importJson("{oops")).toThrow(/not valid JSON/);
    expect(() => manager.importJson(JSON.stringify({ schemaVersion: 99, app: "money-rooms-v1" }))).toThrow(/newer Money Rooms/);
    expect(manager.current()?.client.id).toBe("a");
    expect(manager.snapshots().map((s) => s.reason)).toEqual(["sessionStart"]);
  });
});
