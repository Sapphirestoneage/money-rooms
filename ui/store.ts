/**
 * Where the household lives in the browser: local storage, one key, the whole
 * household as JSON. Stores parts only; every total is computed by the engine.
 */

import { emptyHousehold, type Household, type IsoDate } from "../engine";

export const STORAGE_KEY = "moneyRooms.household.v1";

export function todayIso(): IsoDate {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface Store {
  load(): Household;
  save(h: Household): void;
  clear(): void;
}

function isHousehold(x: unknown): x is Household {
  return typeof x === "object" && x !== null && (x as Household).schemaVersion === 1 && typeof (x as Household).asOf === "string";
}

export function browserStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): Store {
  return {
    load() {
      try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isHousehold(parsed)) return parsed;
        }
      } catch {
        // Fall through to a fresh household.
      }
      return emptyHousehold(todayIso());
    },
    save(h) {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(h));
      } catch {
        // Private mode or blocked storage: the session still works in memory.
      }
    },
    clear() {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to do.
      }
    },
  };
}
