/**
 * Spending categories, loaded from data/spending-categories.json (data dictionary 3.5).
 */

import categoriesJson from "../../data/spending-categories.json";
import type { ContinuesInRetirement } from "./types";

export type SpendingCategoryType = "essential" | "discretionary";

export interface SpendingCategory {
  id: string;
  label: string;
  type: SpendingCategoryType;
  continuesInRetirement: ContinuesInRetirement;
  /** Which DRAFTT letter this feeds in the later lens. Null if none. */
  draftt: string | null;
  notes?: string;
}

/** The category used when only a spending total is given (3.5, one-total entry). */
export const EVERYTHING_ELSE = "everythingElse";

const TYPES: readonly SpendingCategoryType[] = ["essential", "discretionary"];
const CONTINUES: readonly ContinuesInRetirement[] = ["yes", "no", "changes"];

function parseCategory(raw: unknown, index: number): SpendingCategory {
  const where = `spending category #${index}`;
  if (typeof raw !== "object" || raw === null) throw new Error(`${where}: not an object`);
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "") throw new Error(`${where}: id must be a string`);
  if (typeof r.label !== "string") throw new Error(`${where} (${r.id}): label must be a string`);
  if (!TYPES.includes(r.type as SpendingCategoryType)) throw new Error(`${where} (${r.id}): bad type`);
  if (!CONTINUES.includes(r.continuesInRetirement as ContinuesInRetirement)) {
    throw new Error(`${where} (${r.id}): bad continuesInRetirement`);
  }
  if (r.draftt !== null && typeof r.draftt !== "string") throw new Error(`${where} (${r.id}): bad draftt`);
  return {
    id: r.id,
    label: r.label,
    type: r.type as SpendingCategoryType,
    continuesInRetirement: r.continuesInRetirement as ContinuesInRetirement,
    draftt: r.draftt as string | null,
    ...(typeof r.notes === "string" ? { notes: r.notes } : {}),
  };
}

let cache: readonly SpendingCategory[] | undefined;

/** All categories in file order, validated once and cached. */
export function loadSpendingCategories(): readonly SpendingCategory[] {
  if (cache) return cache;
  const seen = new Set<string>();
  const out = categoriesJson.categories.map((raw, i) => {
    const category = parseCategory(raw, i);
    if (seen.has(category.id)) throw new Error(`Duplicate spending category id "${category.id}"`);
    seen.add(category.id);
    return category;
  });
  if (!seen.has(EVERYTHING_ELSE)) throw new Error(`Spending categories must include "${EVERYTHING_ELSE}"`);
  cache = Object.freeze(out);
  return cache;
}

export function getSpendingCategory(id: string): SpendingCategory {
  const category = loadSpendingCategories().find((c) => c.id === id);
  if (!category) throw new Error(`Unknown spending category "${id}"`);
  return category;
}

export function isSpendingCategoryId(id: string): boolean {
  return loadSpendingCategories().some((c) => c.id === id);
}
