/**
 * Spending rules for the backtests (docs/m6-spec.md sections 2.3 and 2.4):
 * guardrails (Guyton-Klinger, simplified) and the Flex FI trim. Each is a
 * factory that returns a stateful adjuster for one timeline run. Pure apart
 * from that per-run state.
 */

import type { TimelineOptions } from "../projection/timeline";

type Adjuster = NonNullable<TimelineOptions["spendingAdjuster"]>;

export interface GuardrailsSettings {
  /** The upper guardrail as a multiple of the initial withdrawal rate. */
  upper: number;
  /** The lower guardrail. */
  lower: number;
  /** The cut or raise, as a share of current spending. */
  stepShare: number;
  /** Spending never drops below this share of planned (the FAT step of the staircase, when known). */
  floorShare: number;
}

export const GUARDRAILS_DEFAULTS: GuardrailsSettings = { upper: 1.2, lower: 0.8, stepShare: 0.1, floorShare: 0.6 };

/** Guyton-Klinger, two guardrails: cut 10% above 1.2 times the initial withdrawal rate, raise 10% under 0.8 times. */
export function guardrailsAdjuster(settings: GuardrailsSettings = GUARDRAILS_DEFAULTS): () => Adjuster {
  return () => {
    let initialRate: number | null = null;
    let factor = 1;
    return (ctx) => {
      if (ctx.assetsAtStart <= 0 || ctx.plannedSpending <= 0) return factor;
      const rate = (ctx.plannedSpending * factor) / ctx.assetsAtStart;
      if (initialRate === null) {
        initialRate = ctx.plannedSpending / ctx.assetsAtStart;
        return factor;
      }
      if (rate > initialRate * settings.upper) factor = Math.max(settings.floorShare, factor * (1 - settings.stepShare));
      else if (rate < initialRate * settings.lower) factor = factor * (1 + settings.stepShare);
      return factor;
    };
  };
}

/** Flex FI: spending trimmed by a share in every retired year whose stock return was negative. */
export function flexAdjuster(trimPercent: number): () => Adjuster {
  return () => (ctx) => (ctx.stocksReturn < 0 ? 1 - trimPercent / 100 : 1);
}
