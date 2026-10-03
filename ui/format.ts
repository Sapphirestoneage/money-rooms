/**
 * Number and word formatting per docs/style-guide.md section 3.
 * Formatting only. No math: the engine provides every number.
 */

import type { Confidence } from "../engine";

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Dollars, whole, with a sign and commas. */
export function dollars(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${whole.format(Math.abs(n))}`;
}

/** Dollars for summaries: abbreviate above $1 million. */
export function dollarsShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${n < 0 ? "-" : ""}$${oneDecimal.format(Math.abs(n) / 1_000_000)}M`;
  return dollars(n);
}

/** Prefix rough numbers with "about". */
export function dollarsWithConfidence(n: number, confidence: Confidence): string {
  return confidence === "roughly" ? `About ${dollars(n)}` : dollars(n);
}

/** Rates with at most one decimal. */
export function percent(n: number): string {
  return `${oneDecimal.format(n)}%`;
}

export function age(n: number): string {
  return `Age ${Math.floor(n)}`;
}

export type CadenceLabel = "hour" | "week" | "paycheck" | "month" | "year";

export function withCadence(formatted: string, cadence: CadenceLabel): string {
  return `${formatted} / ${cadence}`;
}

/** The kind badge labels (design system, section 5). */
export const KIND_LABEL: Record<Confidence, string> = {
  known: "Known",
  lookUp: "Look it up",
  roughly: "Roughly",
  computed: "Computed",
  notForMe: "Not for me",
};

/** Plain explanation of each kind, in the style guide's order: what, why it matters, where it comes from. */
export const KIND_EXPLANATION: Record<Confidence, string> = {
  known: "A number you are sure of. It carries full weight in your plan.",
  lookUp: "A number you can find, like a balance on a statement. Until then the plan uses your placeholder.",
  roughly: "A placeholder you can sharpen later. Your plan uses it as is, and shows it in the attention color.",
  computed: "Worked out by the engine from your other numbers. Tap it to see which ones.",
  notForMe: "Doesn't apply to you. It counts as answered.",
};

/** Parses money typed as "4120", "4,120", "$4,120", or "4.1k". Returns null if it isn't a number. */
export function parseMoney(text: string): number | null {
  const cleaned = text.trim().replace(/[$,\s]/g, "").toLowerCase();
  if (cleaned === "") return null;
  const match = /^(-?\d*\.?\d+)(k|m)?$/.exec(cleaned);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const unit = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  return base * unit;
}

export function yearWord(n: number): string {
  return n === 1 ? "1 year" : `${n} years`;
}

export function monthWord(n: number): string {
  return n === 1 ? "1 month" : `${n} months`;
}

/** A number as it should sit in an amount field: commas, and cents only when there are any. */
export function amountForInput(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
