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
 * period. The net flow (contributions minus withdrawals) earns half the
 * period's rate: flow x rate / 2 in a full year (engine spec section 2).
 */
export function growBalance(opening: number, netFlow: number, ratePercent: number, fraction: number): number {
  const periodRate = Math.pow(1 + ratePercent / 100, fraction) - 1;
  return opening * (1 + periodRate) + netFlow * (1 + periodRate / 2);
}

/** Growth earned in the period: the end balance less what was put in or taken out. */
export function growthEarned(opening: number, netFlow: number, ratePercent: number, fraction: number): number {
  return growBalance(opening, netFlow, ratePercent, fraction) - opening - netFlow;
}
