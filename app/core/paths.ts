/**
 * Dot paths into a client file ("drawers.facts.income.job.grossMonthly"). Every change in the
 * Ledger names a path; the sandbox overlays by path; the registry invalidates by path.
 */

export type Path = string;

export function getPath(root: unknown, path: Path): unknown {
  let node: unknown = root;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Sets a value at a path, creating objects along the way. Returns the previous value. */
export function setPath(root: Record<string, unknown>, path: Path, value: unknown): unknown {
  const parts = path.split(".");
  let node: Record<string, unknown> = root;
  for (const part of parts.slice(0, -1)) {
    const next = node[part];
    if (next === null || typeof next !== "object") {
      node[part] = {};
    }
    node = node[part] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1]!;
  const previous = node[last];
  if (value === undefined) delete node[last];
  else node[last] = value;
  return previous;
}

/** True when `path` is `prefix` or sits under it. */
export function underPath(path: Path, prefix: Path): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

export function clone<T>(x: T): T {
  return structuredClone(x);
}
