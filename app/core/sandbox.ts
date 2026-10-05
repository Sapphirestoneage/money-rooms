/**
 * The copy-on-write sandbox (ARCHITECTURE.md section 4): a scenario reads real data live and writes
 * only its own overlay. Nothing changes reality until Promote turns chosen overlay entries into
 * Ledger entries.
 */

import { applyChange, type Change } from "./ledger";
import type { ClientFile, Scenario, ScenarioChange } from "./model";
import { getPath, underPath } from "./paths";
import type { InputReader } from "./registry";
import { resolve, resolveComposite, type Composite, type Input, type IsoDate, type Resolved } from "./values";

export class Sandbox {
  private readonly overlay = new Map<string, unknown>();

  constructor(private readonly live: () => ClientFile, readonly scenario: { id: string; label: string }) {}

  static fromScenario(live: () => ClientFile, s: Scenario): Sandbox {
    const box = new Sandbox(live, { id: s.id, label: s.label });
    for (const c of s.changes) box.set(c.path, c.value);
    return box;
  }

  /** The overlay's value if one exists at or above the path, otherwise the live value. */
  get(path: string): unknown {
    if (this.overlay.has(path)) return this.overlay.get(path);
    // A change above this path (a whole entity replaced) shadows it.
    for (const [p, v] of this.overlay) if (underPath(path, p) && path !== p) return getPath(v, path.slice(p.length + 1));
    return getPath(this.live(), path);
  }

  set(path: string, value: unknown): void {
    this.overlay.set(path, structuredClone(value));
  }

  unset(path: string): void {
    this.overlay.delete(path);
  }

  changes(): ScenarioChange[] {
    return [...this.overlay].map(([path, value]) => ({ path, value: structuredClone(value) }));
  }

  toScenario(createdAt: IsoDate): Scenario {
    return { id: this.scenario.id, label: this.scenario.label, createdAt, changes: this.changes() };
  }

  /** Turns the chosen overlay entries (all, by default) into Ledger entries on the real file. */
  promote(file: ClientFile, at: IsoDate, why: string, paths?: string[]): ClientFile {
    let next = file;
    for (const [path, value] of this.overlay) {
      if (paths && !paths.includes(path)) continue;
      const change: Change = { path, to: value, by: "promote", why: `${why} (promoted from scenario ${this.scenario.label})`, at };
      next = applyChange(next, change).file;
    }
    for (const path of paths ?? [...this.overlay.keys()]) this.overlay.delete(path);
    return next;
  }
}

/**
 * An input reader over a client file, optionally through a sandbox. A path that holds an Input
 * resolves as one; a path that holds a Composite resolves with detail over total; anything else is
 * not an input.
 */
export function readerFor(live: () => ClientFile, sandbox?: Sandbox): InputReader {
  const lookup = (path: string): unknown => (sandbox ? sandbox.get(path) : getPath(live(), path));
  return {
    read(path: string): Resolved<number> | undefined {
      const node = lookup(path);
      if (node === null || typeof node !== "object") return undefined;
      const o = node as Record<string, unknown>;
      if ("lines" in o && "total" in o) return resolveComposite(o as unknown as Composite).resolved;
      if ("status" in o) return resolve(o as unknown as Input<number>);
      return undefined;
    },
  };
}
