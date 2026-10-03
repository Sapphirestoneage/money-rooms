/**
 * Asset account growth (engine spec section 3, step 9): the blended real
 * return from the allocation and the class returns, minus fees, with
 * mid-period timing for the year's net flow.
 */

import type { Allocation, AssetClass } from "../model";

/** Real percent per year for an account: allocation-weighted class returns minus fees. */
export function blendedRealReturn(allocation: Allocation, returns: Record<AssetClass, number>, feesPercent: number): number {
  const weighted = (allocation.stocks * returns.stocks + allocation.bonds * returns.bonds + allocation.cash * returns.cash) / 100;
  return weighted - feesPercent;
}

/**
 * Balance at the end of a period. The opening balance grows for the whole
 * period; the net flow (contributions minus withdrawals) lands mid-period.
 */
export function growBalance(opening: number, netFlow: number, ratePercent: number, fraction: number): number {
  const r = ratePercent / 100;
  const full = Math.pow(1 + r, fraction);
  const half = Math.pow(1 + r, fraction / 2);
  return opening * full + netFlow * half;
}

/** Growth earned in the period: the end balance less what was put in or taken out. */
export function growthEarned(opening: number, netFlow: number, ratePercent: number, fraction: number): number {
  return growBalance(opening, netFlow, ratePercent, fraction) - opening - netFlow;
}
