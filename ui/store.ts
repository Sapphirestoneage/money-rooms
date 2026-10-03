/**
 * Where the household lives in the browser: local storage, one key, the whole
 * household as JSON. Stores parts only; every total is computed by the engine.
 *
 * Keeping things from visit to visit:
 * - Every change is saved as it is made.
 * - On each visit the plan date becomes today. Each value keeps its own as-of date.
 * - Older saved shapes are upgraded on load.
 * - A second key holds the snapshot taken before an import, so it can be undone.
 * - A third key holds display choices (like "per month" on an amount), which are not part of the plan.
 * - If the browser will not store anything (a private window), the store says so.
 */

import { emptyHousehold, migrateHousehold, type Household, type IsoDate } from "../engine";

export const STORAGE_KEY = "moneyRooms.household.v1";
export const SNAPSHOT_KEY = "moneyRooms.snapshotBeforeImport.v1";
export const PREFS_KEY = "moneyRooms.display.v1";

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

/** Display choices that are remembered but are not part of the plan. */
export interface DisplayPrefs {
  /** The cadence last chosen for each amount field, by field key. */
  cadence: Record<string, string>;
  /** The order of the result screen's sections, by section id (M2 spec section 9). Blank means the default order. */
  resultOrder?: string[];
  /** True once the True FI number has been revealed, so it shows as a normal row with a replay button. */
  trueFiRevealed?: boolean;
  /** The optimizer objective last chosen. */
  objective?: string;
}

export interface Store {
  load(): Household;
  /** Saves the household. Returns false if the browser refused to store it. */
  save(h: Household): boolean;
  clear(): void;
  /** True when this browser will keep what is saved (false in some private windows). */
  isPersistent(): boolean;
  /** Keeps a copy of the current household so an import can be undone. */
  saveSnapshot(h: Household, takenAt: string): void;
  loadSnapshot(): Snapshot | null;
  clearSnapshot(): void;
  loadPrefs(): DisplayPrefs;
  savePrefs(p: DisplayPrefs): void;
}

function isHousehold(x: unknown): x is Household {
  return typeof x === "object" && x !== null && (x as Household).schemaVersion === 1 && typeof (x as Household).asOf === "string";
}

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export function browserStore(storage: Storage | null, today: () => IsoDate = todayIso): Store {
  const read = (key: string): unknown => {
    try {
      const raw = storage?.getItem(key);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, value: unknown): boolean => {
    if (!storage) return false;
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      // Private mode, a full disk, or blocked storage: the session still works in memory.
      return false;
    }
  };
  const remove = (key: string) => {
    try {
      storage?.removeItem(key);
    } catch {
      // Nothing to do.
    }
  };

  // Find out once whether this browser keeps what we write.
  const probeKey = "moneyRooms.probe";
  const persistent = write(probeKey, 1) && read(probeKey) === 1;
  remove(probeKey);

  return {
    load() {
      const parsed = read(STORAGE_KEY);
      if (!isHousehold(parsed)) return emptyHousehold(today());
      const h = migrateHousehold(parsed);
      // The plan date is always today. Every stored value keeps the date it was true.
      h.asOf = today();
      return h;
    },
    save: (h) => write(STORAGE_KEY, h),
    clear: () => remove(STORAGE_KEY),
    isPersistent: () => persistent,
    saveSnapshot: (h, takenAt) => void write(SNAPSHOT_KEY, { takenAt, household: h } satisfies Snapshot),
    loadSnapshot() {
      const parsed = read(SNAPSHOT_KEY);
      if (typeof parsed !== "object" || parsed === null) return null;
      const s = parsed as Partial<Snapshot>;
      return typeof s.takenAt === "string" && isHousehold(s.household) ? { takenAt: s.takenAt, household: migrateHousehold(s.household) } : null;
    },
    clearSnapshot: () => remove(SNAPSHOT_KEY),
    loadPrefs() {
      const parsed = read(PREFS_KEY);
      const p = typeof parsed === "object" && parsed !== null ? (parsed as Partial<DisplayPrefs>) : {};
      const cadence = typeof p.cadence === "object" && p.cadence !== null ? p.cadence : {};
      const out: DisplayPrefs = { cadence: { ...cadence } };
      if (Array.isArray(p.resultOrder) && p.resultOrder.every((x) => typeof x === "string")) out.resultOrder = [...p.resultOrder];
      if (typeof p.trueFiRevealed === "boolean") out.trueFiRevealed = p.trueFiRevealed;
      if (typeof p.objective === "string") out.objective = p.objective;
      return out;
    },
    savePrefs: (p) => void write(PREFS_KEY, p),
  };
}
