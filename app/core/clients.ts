/**
 * Client files (DATA_MODEL.md section 6): one client open at a time, one JSON file per client in a
 * folder the coach chooses, a working copy in the browser's storage, a snapshot before every import
 * and at the start of each session, and undo of the last import. Storage is an adapter so tests run
 * on a Map and the console runs on localStorage.
 */

import type { ClientFile, ClientMeta, Snapshot } from "./model";
import { clone } from "./paths";
import { migrate, newClientFile, parse, serialize } from "./schema";
import type { IsoDate } from "./values";

export interface ClientStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStorage(): ClientStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v), remove: (k) => void map.delete(k) };
}

export function browserStorage(ls: Storage): ClientStorage {
  return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), remove: (k) => ls.removeItem(k) };
}

const INDEX_KEY = "mr1.clients";
const OPEN_KEY = "mr1.open";
const fileKey = (id: string) => `mr1.client.${id}`;

export const SNAPSHOT_CAP = 20;

export interface IndexEntry extends ClientMeta {
  updatedAt: IsoDate;
}

export interface ImportResult {
  file: ClientFile;
  /** Schema versions the file passed through on the way in. */
  migrated: number[];
  /** True when the import replaced an open client (a snapshot was taken first). */
  replaced: boolean;
}

export class ClientManager {
  private openFile: ClientFile | null = null;

  constructor(private readonly storage: ClientStorage, private readonly today: () => IsoDate) {
    const openId = storage.get(OPEN_KEY);
    if (openId) {
      const text = storage.get(fileKey(openId));
      if (text) {
        try {
          this.openFile = parse(text).file;
        } catch {
          this.openFile = null;
          storage.remove(OPEN_KEY);
        }
      }
    }
  }

  // ---- the picker --------------------------------------------------------------

  list(): IndexEntry[] {
    const text = this.storage.get(INDEX_KEY);
    if (!text) return [];
    try {
      const parsed = JSON.parse(text) as unknown;
      return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
    } catch {
      return [];
    }
  }

  current(): ClientFile | null {
    return this.openFile;
  }

  /** Creates a client, saves it, and opens it (closing any open client first). */
  create(label: string, id?: string): ClientFile {
    const name = label.trim();
    if (!name) throw new Error("A client needs a label (a nickname, never a legal name).");
    const file = newClientFile(name, this.today(), id);
    if (this.list().some((c) => c.id === file.client.id)) throw new Error(`A client with id ${file.client.id} already exists.`);
    this.persist(file);
    return this.open(file.client.id);
  }

  /** Opens a client; one is open at a time, so any open client is closed (and saved) first. Takes the session snapshot. */
  open(id: string): ClientFile {
    if (this.openFile && this.openFile.client.id !== id) this.close();
    const text = this.storage.get(fileKey(id));
    if (!text) throw new Error(`No client with id ${id}.`);
    const { file } = parse(text);
    this.openFile = file;
    this.storage.set(OPEN_KEY, id);
    this.snapshot("sessionStart");
    return this.openFile;
  }

  close(): void {
    if (!this.openFile) return;
    this.persist(this.openFile);
    this.openFile = null;
    this.storage.remove(OPEN_KEY);
  }

  delete(id: string): void {
    if (this.openFile?.client.id === id) {
      this.openFile = null;
      this.storage.remove(OPEN_KEY);
    }
    this.storage.remove(fileKey(id));
    this.writeIndex(this.list().filter((c) => c.id !== id));
  }

  // ---- changes to the open client ------------------------------------------------

  /** Replaces the open client's file with the result of `fn` and saves it. */
  update(fn: (file: ClientFile) => ClientFile): ClientFile {
    if (!this.openFile) throw new Error("No client is open.");
    const next = fn(this.openFile);
    if (next.client.id !== this.openFile.client.id) throw new Error("An update cannot change which client is open.");
    this.openFile = next;
    this.persist(next);
    return next;
  }

  /** Keeps a copy of the open client as it stands, newest last, capped. */
  snapshot(reason: Snapshot["reason"]): Snapshot | null {
    if (!this.openFile) return null;
    const { snapshots: _dropped, ...rest } = this.openFile;
    void _dropped;
    const snap: Snapshot = { takenAt: this.today(), reason, file: clone(rest) };
    const next: ClientFile = { ...this.openFile, snapshots: [...this.openFile.snapshots, snap].slice(-SNAPSHOT_CAP) };
    this.openFile = next;
    this.persist(next);
    return snap;
  }

  // ---- export and import --------------------------------------------------------

  /** The open client as JSON, snapshots included, for the coach's folder. */
  exportJson(): string {
    if (!this.openFile) throw new Error("No client is open.");
    return serialize(this.openFile);
  }

  exportFileName(): string {
    if (!this.openFile) throw new Error("No client is open.");
    const slug = this.openFile.client.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
    return `${slug}.${this.today()}.client.json`;
  }

  /**
   * Imports a file from the coach's folder. The open client, if any, is snapshotted first. A file for the
   * open client replaces it; a file for another client is added (or replaces that client's working copy)
   * and opened. The snapshot taken before the import rides on the imported file so the import can be undone.
   */
  importJson(text: string): ImportResult {
    const { file: incoming, steps } = parse(text);
    let before: Snapshot | null = null;
    let replaced = false;
    if (this.openFile) {
      before = this.snapshot("beforeImport");
      replaced = this.openFile.client.id === incoming.client.id;
    }
    const file: ClientFile = { ...incoming, snapshots: [...incoming.snapshots, ...(before && replaced ? [before] : [])].slice(-SNAPSHOT_CAP) };
    if (this.openFile && !replaced) this.close();
    this.persist(file);
    this.openFile = file;
    this.storage.set(OPEN_KEY, file.client.id);
    return { file, migrated: steps, replaced };
  }

  /** Restores the open client to the snapshot taken just before its last import. Null when there is none. */
  undoLastImport(): ClientFile | null {
    if (!this.openFile) return null;
    const idx = [...this.openFile.snapshots].map((s) => s.reason).lastIndexOf("beforeImport");
    if (idx < 0) return null;
    const snap = this.openFile.snapshots[idx]!;
    const restored: ClientFile = { ...clone(snap.file), snapshots: this.openFile.snapshots.filter((_, i) => i !== idx) };
    this.openFile = restored;
    this.persist(restored);
    return restored;
  }

  /** The snapshots of the open client, newest first. */
  snapshots(): Snapshot[] {
    return this.openFile ? [...this.openFile.snapshots].reverse() : [];
  }

  /** Reads a file without opening it (for a preview before import). */
  static peek(text: string): { label: string; id: string; schemaVersionBefore: number } {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const { file } = migrate(raw);
    return { label: file.client.label, id: file.client.id, schemaVersionBefore: typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0 };
  }

  // ---- storage -------------------------------------------------------------------

  private persist(file: ClientFile): void {
    this.storage.set(fileKey(file.client.id), serialize(file));
    const index = this.list().filter((c) => c.id !== file.client.id);
    index.push({ ...file.client, updatedAt: file.updatedAt });
    index.sort((a, b) => a.label.localeCompare(b.label));
    this.writeIndex(index);
  }

  private writeIndex(index: IndexEntry[]): void {
    this.storage.set(INDEX_KEY, JSON.stringify(index));
  }
}
