/**
 * The metrics registry (ARCHITECTURE.md section 3): every metric declares its inputs and what to do
 * when one is missing. The registry is the dependency graph: when an input changes, only the metrics
 * downstream of it recompute. A metric never throws and never breaks a metric downstream of it.
 */

import type { Resolved } from "./values";

export type MissingPolicy = "wait" | "default" | "zero";

export interface InputSpec {
  /** A path into the client file, or another metric's id. */
  id: string;
  missing: MissingPolicy;
  /** The flagged default, when `missing` is "default". */
  default?: number;
}

export type MetricState = "ok" | "rough" | "estimated" | "waiting" | "notApplicable";

export interface MetricResult<T = number> {
  id: string;
  state: MetricState;
  /** The value when the state is ok, rough, or estimated; null otherwise. */
  value: T | null;
  /** Input ids (paths or metrics) still needed, when waiting. */
  needs: string[];
  /** Plain sentences: which defaults were used, which inputs were rough or counted as zero. */
  flags: string[];
  /** The metric ids and paths this result read. */
  reads: string[];
}

export interface MetricDef<T = number> {
  id: string;
  label: string;
  /** The planet that computes it (its published output namespace). */
  planet: string;
  inputs: InputSpec[];
  unit?: "dollars" | "dollarsPerMonth" | "months" | "percent" | "date" | "count" | "text";
  /** Pure: the resolved input values by id, in order. Only called when every input resolved to a number. */
  compute: (values: Record<string, number>) => T;
}

export interface InputReader {
  /** The resolved input at a path, or undefined when the path is not an input the reader knows. */
  read(path: string): Resolved<number> | undefined;
}

/** Orders the states by how much they qualify a result; the worst wins. */
const SEVERITY: Record<MetricState, number> = { ok: 0, rough: 1, estimated: 2, notApplicable: 3, waiting: 4 };

export class MetricsRegistry {
  private readonly defs = new Map<string, MetricDef<unknown>>();
  private readonly cache = new Map<string, MetricResult<unknown>>();
  /** How many times each metric's compute ran, for the recompute-only-downstream test. */
  readonly computeCount = new Map<string, number>();

  register<T>(def: MetricDef<T>): this {
    if (this.defs.has(def.id)) throw new Error(`metric ${def.id} is already registered`);
    for (const i of def.inputs) if (i.missing === "default" && typeof i.default !== "number") throw new Error(`metric ${def.id}: input ${i.id} says default but has none`);
    this.defs.set(def.id, def as MetricDef<unknown>);
    return this;
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  ids(): string[] {
    return [...this.defs.keys()];
  }

  definition(id: string): MetricDef<unknown> | undefined {
    return this.defs.get(id);
  }

  /** The metrics that read `id` (a path or a metric) directly. */
  directDependents(id: string): string[] {
    const out: string[] = [];
    for (const d of this.defs.values()) if (d.inputs.some((i) => i.id === id)) out.push(d.id);
    return out;
  }

  /** Every metric downstream of `id`, nearest first, each once. */
  dependentsOf(id: string): string[] {
    const seen = new Set<string>();
    const queue = [id];
    const out: string[] = [];
    while (queue.length) {
      const next = queue.shift()!;
      for (const d of this.directDependents(next)) {
        if (seen.has(d)) continue;
        seen.add(d);
        out.push(d);
        queue.push(d);
      }
    }
    return out;
  }

  /** Forgets the cached results downstream of a changed input or metric. Returns what was invalidated. */
  invalidate(changedId: string): string[] {
    const downstream = this.dependentsOf(changedId);
    if (this.cache.has(changedId)) downstream.unshift(changedId);
    for (const id of downstream) this.cache.delete(id);
    return downstream;
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  /** Evaluates a metric (and whatever it depends on), from the cache where a result is still good. */
  evaluate<T = number>(id: string, reader: InputReader): MetricResult<T> {
    const cached = this.cache.get(id);
    if (cached) return cached as MetricResult<T>;
    const def = this.defs.get(id);
    if (!def) return { id, state: "waiting", value: null, needs: [id], flags: [`No metric named ${id} is registered.`], reads: [] };
    const result = this.compute(def, reader, new Set([id]));
    this.cache.set(id, result);
    return result as MetricResult<T>;
  }

  /** Every registered metric, evaluated. */
  evaluateAll(reader: InputReader): Record<string, MetricResult<unknown>> {
    const out: Record<string, MetricResult<unknown>> = {};
    for (const id of this.defs.keys()) out[id] = this.evaluate(id, reader);
    return out;
  }

  private compute(def: MetricDef<unknown>, reader: InputReader, stack: Set<string>): MetricResult<unknown> {
    const values: Record<string, number> = {};
    const needs: string[] = [];
    const flags: string[] = [];
    const reads: string[] = [];
    const severity = { state: "ok" as MetricState };
    const worsen = (s: MetricState) => { if (SEVERITY[s] > SEVERITY[severity.state]) severity.state = s; };

    for (const spec of def.inputs) {
      reads.push(spec.id);
      let resolved: Resolved<number> | undefined;
      let upstreamNeeds: string[] = [];
      if (this.defs.has(spec.id)) {
        if (stack.has(spec.id)) {
          flags.push(`${def.id} and ${spec.id} depend on each other; ${spec.id} was treated as missing.`);
          resolved = { kind: "missing", status: "empty" };
        } else {
          const cached = this.cache.get(spec.id);
          const r = cached ?? this.compute(this.defs.get(spec.id)!, reader, new Set([...stack, spec.id]));
          if (!cached) this.cache.set(spec.id, r);
          if (r.state === "waiting") { resolved = { kind: "missing", status: "empty" }; upstreamNeeds = r.needs; }
          else if (r.state === "notApplicable") resolved = { kind: "notApplicable" };
          else if (typeof r.value === "number") {
            resolved = { kind: "value", value: r.value, rough: r.state === "rough", status: r.state === "rough" ? "rough" : "entered" };
            if (r.state === "estimated") worsen("estimated");
          } else resolved = { kind: "missing", status: "empty" };
        }
      } else {
        resolved = reader.read(spec.id) ?? { kind: "missing", status: "empty" };
      }

      if (resolved.kind === "value") {
        values[spec.id] = resolved.value;
        if (resolved.rough) worsen("rough");
        if (resolved.partial?.length) {
          flags.push(`${spec.id} is built from detail lines; ${resolved.partial.join(", ")} still ${resolved.partial.length === 1 ? "has" : "have"} no number.`);
          worsen("rough");
        }
        continue;
      }
      if (resolved.kind === "notApplicable") {
        if (spec.missing === "zero") {
          values[spec.id] = 0;
          flags.push(`${spec.id} does not apply, so it counts as 0.`);
        } else {
          worsen("notApplicable");
        }
        continue;
      }
      // Missing.
      switch (spec.missing) {
        case "wait":
          needs.push(...(upstreamNeeds.length ? upstreamNeeds : [spec.id]));
          worsen("waiting");
          break;
        case "default":
          values[spec.id] = spec.default!;
          flags.push(`${spec.id} is missing, so a default of ${spec.default} was used; this result is an estimate.`);
          worsen("estimated");
          break;
        case "zero":
          values[spec.id] = 0;
          flags.push(`${spec.id} is missing and counts as 0 here.`);
          break;
      }
    }

    this.computeCount.set(def.id, (this.computeCount.get(def.id) ?? 0) + 1);
    const state = severity.state;
    if (state === "waiting") return { id: def.id, state, value: null, needs: [...new Set(needs)], flags, reads };
    if (state === "notApplicable") return { id: def.id, state, value: null, needs: [], flags, reads };
    try {
      const value = def.compute(values);
      return { id: def.id, state, value, needs: [], flags, reads };
    } catch (error) {
      // A metric never throws to its callers: the failure becomes a waiting state that names itself.
      return { id: def.id, state: "waiting", value: null, needs: [def.id], flags: [...flags, `${def.id} could not be computed: ${error instanceof Error ? error.message : String(error)}`], reads };
    }
  }
}
