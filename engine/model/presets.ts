/**
 * Account presets, loaded from data/account-presets.json (data dictionary 2.9, 3.6).
 * Picking a preset fills an account's fields with source "preset".
 */

import presetsJson from "../../data/account-presets.json";
import type {
  Allocation,
  Answer,
  AssetAccount,
  DebtAccount,
  IsoDate,
  Liquidity,
  TaxBucket,
  Value,
} from "./types";
import { presetValue } from "./values";

export type AccountPresetKey = keyof typeof presetsJson.presets;

export interface AssetPreset {
  key: AccountPresetKey;
  label: string;
  side: "asset";
  taxBucket: TaxBucket;
  liquidity: Liquidity;
  allocation: Allocation;
  /** Percent per year. */
  fees: number;
  notes?: string;
}

export interface DebtPreset {
  key: AccountPresetKey;
  label: string;
  side: "debt";
  interestDeductible: boolean;
  /** Percent per year, a hint for the entry screen only. */
  typicalRate?: number;
  businessDefault?: boolean;
  forgivenessEligible?: boolean;
  notes?: string;
}

export type AccountPreset = AssetPreset | DebtPreset;

export type QuickAllocationKey = keyof typeof presetsJson.quickAllocations;

const TAX_BUCKETS: readonly TaxBucket[] = ["cash", "taxable", "pretax", "roth", "hsa"];
const LIQUIDITIES: readonly Liquidity[] = ["now", "days", "penaltyBefore59Half", "restricted"];

/** The date the presets file was last updated. Used as asOf for preset-filled values. */
export const PRESETS_UPDATED: IsoDate = presetsJson._meta.updated;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function allocationFromTuple(tuple: readonly number[], context: string): Allocation {
  const [stocks, bonds, cash] = tuple;
  if (stocks === undefined || bonds === undefined || cash === undefined || tuple.length !== 3) {
    throw new Error(`${context}: allocation must have three numbers (stocks, bonds, cash)`);
  }
  if (stocks + bonds + cash !== 100) {
    throw new Error(`${context}: allocation must sum to 100, got ${stocks + bonds + cash}`);
  }
  return { stocks, bonds, cash };
}

function parsePreset(key: AccountPresetKey, raw: unknown): AccountPreset {
  const where = `account preset "${key}"`;
  if (!isRecord(raw)) throw new Error(`${where}: not an object`);
  if (typeof raw.label !== "string") throw new Error(`${where}: label must be a string`);
  const notes = typeof raw.notes === "string" ? { notes: raw.notes } : {};

  if (raw.side === "asset") {
    if (!TAX_BUCKETS.includes(raw.taxBucket as TaxBucket)) throw new Error(`${where}: bad taxBucket`);
    if (!LIQUIDITIES.includes(raw.liquidity as Liquidity)) throw new Error(`${where}: bad liquidity`);
    if (!Array.isArray(raw.allocation)) throw new Error(`${where}: allocation must be an array`);
    if (typeof raw.fees !== "number" || raw.fees < 0) throw new Error(`${where}: fees must be a number >= 0`);
    return {
      key,
      label: raw.label,
      side: "asset",
      taxBucket: raw.taxBucket as TaxBucket,
      liquidity: raw.liquidity as Liquidity,
      allocation: allocationFromTuple(raw.allocation as number[], where),
      fees: raw.fees,
      ...notes,
    };
  }

  if (raw.side === "debt") {
    if (typeof raw.interestDeductible !== "boolean") throw new Error(`${where}: interestDeductible must be boolean`);
    return {
      key,
      label: raw.label,
      side: "debt",
      interestDeductible: raw.interestDeductible,
      ...(typeof raw.typicalRate === "number" ? { typicalRate: raw.typicalRate } : {}),
      ...(typeof raw.businessDefault === "boolean" ? { businessDefault: raw.businessDefault } : {}),
      ...(typeof raw.forgivenessEligible === "boolean" ? { forgivenessEligible: raw.forgivenessEligible } : {}),
      ...notes,
    };
  }

  throw new Error(`${where}: side must be "asset" or "debt"`);
}

let cache: Readonly<Record<AccountPresetKey, AccountPreset>> | undefined;

/** All presets, validated once and cached. */
export function loadAccountPresets(): Readonly<Record<AccountPresetKey, AccountPreset>> {
  if (cache) return cache;
  const out = {} as Record<AccountPresetKey, AccountPreset>;
  for (const key of Object.keys(presetsJson.presets) as AccountPresetKey[]) {
    out[key] = parsePreset(key, presetsJson.presets[key]);
  }
  cache = Object.freeze(out);
  return cache;
}

export function getAccountPreset(key: AccountPresetKey): AccountPreset {
  const preset = loadAccountPresets()[key];
  if (!preset) throw new Error(`Unknown account preset "${key}"`);
  return preset;
}

export function isAccountPresetKey(key: string): key is AccountPresetKey {
  return Object.prototype.hasOwnProperty.call(presetsJson.presets, key);
}

/** The quick picker allocations (3.6): mostly stocks, balanced, mostly cash. */
export function loadQuickAllocations(): Readonly<Record<QuickAllocationKey, Allocation>> {
  const out = {} as Record<QuickAllocationKey, Allocation>;
  for (const key of Object.keys(presetsJson.quickAllocations) as QuickAllocationKey[]) {
    out[key] = allocationFromTuple(presetsJson.quickAllocations[key], `quick allocation "${key}"`);
  }
  return Object.freeze(out);
}

/** Builds an asset account from a preset. Every filled field carries source "preset". */
export function assetFromPreset(
  key: AccountPresetKey,
  id: string,
  balance: Answer<number>,
  asOf: IsoDate = PRESETS_UPDATED,
): AssetAccount {
  const preset = getAccountPreset(key);
  if (preset.side !== "asset") throw new Error(`Preset "${key}" is a debt, not an asset`);
  return {
    id,
    preset: key,
    side: "asset",
    name: presetValue(preset.label, asOf),
    balance,
    taxBucket: presetValue(preset.taxBucket, asOf),
    liquidity: presetValue(preset.liquidity, asOf),
    allocation: presetValue(preset.allocation, asOf),
    annualContribution: presetValue(0, asOf),
    fees: presetValue(preset.fees, asOf),
  };
}

export interface DebtTerms {
  rate: Value<number>;
  minimumPaymentAnnual: Value<number>;
  /** Defaults to the minimum. */
  actualPaymentAnnual?: Value<number>;
}

/** Builds a debt account from a preset plus the terms only the person knows. */
export function debtFromPreset(
  key: AccountPresetKey,
  id: string,
  balance: Answer<number>,
  terms: DebtTerms,
  asOf: IsoDate = PRESETS_UPDATED,
): DebtAccount {
  const preset = getAccountPreset(key);
  if (preset.side !== "debt") throw new Error(`Preset "${key}" is an asset, not a debt`);
  return {
    id,
    preset: key,
    side: "debt",
    name: presetValue(preset.label, asOf),
    balance,
    rate: terms.rate,
    minimumPaymentAnnual: terms.minimumPaymentAnnual,
    actualPaymentAnnual: terms.actualPaymentAnnual ?? terms.minimumPaymentAnnual,
    purpose: presetValue(preset.businessDefault ? "business" : "personal", asOf),
    interestDeductible: presetValue(preset.interestDeductible, asOf),
  };
}
