/**
 * Where the household lives in the browser: local storage, one key, the whole
 * household as JSON. Stores parts only; every total is computed by the engine.
 * A second key holds the snapshot taken before an import, so it can be undone.
 */

import { emptyHousehold, migrateHousehold, type Household, type IsoDate } from "../engine";

export const STORAGE_KEY = "moneyRooms.household.v1";
export const SNAPSHOT_KEY = "moneyRooms.snapshotBeforeImport.v1";

export function todayIso(): IsoDate {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface Snapshot {
  takenAt: string;
  household: Household;
}

export interface Store {
  load(): Household;
  save(h: Household): void;
  clear(): void;
  /** Keeps a copy of the current household so an import can be undone. */
  saveSnapshot(h: Household, takenAt: string): void;
  loadSnapshot(): Snapshot | null;
  clearSnapshot(): void;
}

function isHousehold(x: unknown): x is Household {
  return typeof x === "object" && x !== null && (x as Household).schemaVersion === 1 && typeof (x as Household).asOf === "string";
}

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export function browserStore(storage: Storage | null): Store {
  const read = (key: string): unknown => {
    try {
      const raw = storage?.getItem(key);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, value: unknown) => {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or blocked storage: the session still works in memory.
    }
  };
  const remove = (key: string) => {
    try {
      storage?.removeItem(key);
    } catch {
      // Nothing to do.
    }
  };

  return {
    load() {
      const parsed = read(STORAGE_KEY);
      return isHousehold(parsed) ? migrateHousehold(parsed) : emptyHousehold(todayIso());
    },
    save: (h) => write(STORAGE_KEY, h),
    clear: () => remove(STORAGE_KEY),
    saveSnapshot: (h, takenAt) => write(SNAPSHOT_KEY, { takenAt, household: h } satisfies Snapshot),
    loadSnapshot() {
      const parsed = read(SNAPSHOT_KEY);
      if (typeof parsed !== "object" || parsed === null) return null;
      const s = parsed as Partial<Snapshot>;
      return typeof s.takenAt === "string" && isHousehold(s.household) ? { takenAt: s.takenAt, household: migrateHousehold(s.household) } : null;
    },
    clearSnapshot: () => remove(SNAPSHOT_KEY),
  };
}
