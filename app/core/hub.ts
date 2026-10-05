/**
 * The Sun as a hub (ARCHITECTURE.md section 2, rule 1): planets publish outputs here under their
 * own name and read anything published. A planet cannot publish under another planet's name.
 */

import type { Planet } from "./ledger";
import type { MetricResult } from "./registry";

export type Published = MetricResult<unknown>;

export class Hub {
  private readonly outputs = new Map<Planet, Map<string, Published>>();
  private readonly listeners = new Set<(planet: Planet, key: string) => void>();

  /** Publishes one planet's outputs, replacing what it published before. */
  publish(planet: Planet, outputs: Record<string, Published>): void {
    const map = new Map<string, Published>();
    for (const [key, value] of Object.entries(outputs)) {
      // A planet publishes its own metrics only: the result's id is the key, or "<planet>.<key>".
      const dot = value.id.indexOf(".");
      const namespace = dot >= 0 ? value.id.slice(0, dot) : planet;
      const name = dot >= 0 ? value.id.slice(dot + 1) : value.id;
      if (namespace !== planet || name !== key) throw new Error(`${planet} cannot publish ${key} from metric ${value.id}.`);
      map.set(key, value);
    }
    this.outputs.set(planet, map);
    for (const key of map.keys()) for (const l of this.listeners) l(planet, key);
  }

  read(planet: Planet, key: string): Published | undefined {
    return this.outputs.get(planet)?.get(key);
  }

  /** The value when the output is usable, else null; never throws. */
  value<T = number>(planet: Planet, key: string): T | null {
    const p = this.read(planet, key);
    return p && (p.state === "ok" || p.state === "rough" || p.state === "estimated") ? (p.value as T) : null;
  }

  all(): Record<string, Record<string, Published>> {
    const out: Record<string, Record<string, Published>> = {};
    for (const [planet, map] of this.outputs) out[planet] = Object.fromEntries(map);
    return out;
  }

  onPublish(listener: (planet: Planet, key: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
