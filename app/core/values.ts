/**
 * Every input has a status and every number carries metadata (DATA_MODEL.md section 3).
 * A summary-or-detail number is a Composite: a total and detail lines; detail wins.
 */

export type IsoDate = string;

export type Status = "empty" | "unknown" | "rough" | "entered" | "verified" | "none" | "notApplicable";
export type Source = "client" | "coach" | "statement" | "estimate" | "default";
export type Precision = "exact" | "rounded" | "rough" | "orderOfMagnitude";

export interface Meta {
  /** The date the number was true. */
  asOf?: IsoDate;
  source?: Source;
  precision?: Precision;
  note?: string;
}

export interface Input<T = number> extends Meta {
  status: Status;
  value?: T;
}

export const STATUSES: readonly Status[] = ["empty", "unknown", "rough", "entered", "verified", "none", "notApplicable"];
/** Statuses that count as answered: a metric can run on them. */
export const COMPLETE: readonly Status[] = ["rough", "entered", "verified", "none", "notApplicable"];

export const empty = <T = number>(meta: Meta = {}): Input<T> => ({ status: "empty", ...meta });
export const unknown = <T = number>(meta: Meta = {}): Input<T> => ({ status: "unknown", ...meta });
export const rough = <T = number>(value: T, meta: Meta = {}): Input<T> => ({ status: "rough", value, precision: "rough", ...meta });
export const entered = <T = number>(value: T, meta: Meta = {}): Input<T> => ({ status: "entered", value, precision: "exact", ...meta });
export const verified = <T = number>(value: T, meta: Meta = {}): Input<T> => ({ status: "verified", value, precision: "exact", source: "statement", ...meta });
export const none = <T = number>(meta: Meta = {}): Input<T> => ({ status: "none", ...meta });
export const notApplicable = <T = number>(meta: Meta = {}): Input<T> => ({ status: "notApplicable", ...meta });

export function isComplete(i: Input<unknown> | undefined): boolean {
  return i !== undefined && COMPLETE.includes(i.status);
}

export function isMissing(i: Input<unknown> | undefined): boolean {
  return i === undefined || i.status === "empty" || i.status === "unknown";
}

/** What a metric sees when it reads an input. */
export type Resolved<T = number> =
  | { kind: "value"; value: T; rough: boolean; status: Status; asOf?: IsoDate; partial?: string[] }
  | { kind: "missing"; status: "empty" | "unknown" }
  | { kind: "notApplicable" };

/** Resolves a numeric input: `none` is 0, `rough` is a value marked rough, `empty` and `unknown` are missing. */
export function resolve(i: Input<number> | undefined): Resolved<number> {
  if (i === undefined) return { kind: "missing", status: "empty" };
  switch (i.status) {
    case "empty":
    case "unknown":
      return { kind: "missing", status: i.status };
    case "notApplicable":
      return { kind: "notApplicable" };
    case "none":
      return { kind: "value", value: 0, rough: false, status: "none", ...(i.asOf ? { asOf: i.asOf } : {}) };
    case "rough":
    case "entered":
    case "verified": {
      const v = typeof i.value === "number" && Number.isFinite(i.value) ? i.value : null;
      if (v === null) return { kind: "missing", status: "empty" };
      return { kind: "value", value: v, rough: i.status === "rough" || i.precision === "rough" || i.precision === "orderOfMagnitude", status: i.status, ...(i.asOf ? { asOf: i.asOf } : {}) };
    }
  }
}

/** A number that can be a single total or built from detail lines (DATA_MODEL.md section 3). */
export interface Line {
  id: string;
  label: string;
  input: Input<number>;
}

export interface Composite {
  total: Input<number>;
  lines: Line[];
}

export const composite = (total: Input<number> = empty(), lines: Line[] = []): Composite => ({ total, lines });

export interface ResolvedComposite {
  resolved: Resolved<number>;
  /** Where the value came from. */
  from: "lines" | "total";
  /** Line ids still empty or unknown when the lines were used. */
  missingLines: string[];
}

/**
 * Detail overrides the total: when any line is complete, the value is the sum of the complete lines
 * (a `none` line is 0; a `notApplicable` line is left out) and the missing lines are reported so a
 * metric can apply its missing policy. When no line is complete, the total is used.
 */
export function resolveComposite(c: Composite): ResolvedComposite {
  const counted = c.lines.filter((l) => isComplete(l.input) && l.input.status !== "notApplicable");
  if (counted.length > 0) {
    let sum = 0;
    let anyRough = false;
    let latest: IsoDate | undefined;
    for (const l of counted) {
      const r = resolve(l.input);
      if (r.kind !== "value") continue;
      sum += r.value;
      anyRough = anyRough || r.rough;
      if (r.asOf && (!latest || r.asOf > latest)) latest = r.asOf;
    }
    const missingLines = c.lines.filter((l) => isMissing(l.input)).map((l) => l.id);
    return { resolved: { kind: "value", value: sum, rough: anyRough, status: anyRough ? "rough" : "entered", ...(latest ? { asOf: latest } : {}), ...(missingLines.length ? { partial: missingLines } : {}) }, from: "lines", missingLines };
  }
  return { resolved: resolve(c.total), from: "total", missingLines: [] };
}

/** True for a value whose as-of date is older than `months` before `today`. */
export function isStale(i: Meta, today: IsoDate, months: number): boolean {
  if (!i.asOf) return false;
  const a = new Date(`${i.asOf.slice(0, 10)}T00:00:00Z`);
  const t = new Date(`${today.slice(0, 10)}T00:00:00Z`);
  t.setUTCMonth(t.getUTCMonth() - months);
  return a.getTime() < t.getTime();
}
