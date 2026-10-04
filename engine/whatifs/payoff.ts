/**
 * Payoff methods (decision M2 in decisions.md, roadmap M5): avalanche, snowball,
 * and peace-first, side by side, with the price of peace. A monthly simulation
 * of the debts alone, with a fixed total monthly budget: every minimum is paid
 * and the rest goes to the method's first debt. Pure.
 */

import blocksFile from "../../data/scenario-blocks.json";
import type { DebtAccount, Household } from "../model";
import { getAccountPreset } from "../model";

export type PayoffMethod = "avalanche" | "snowball" | "peaceFirst";

export interface PayoffDebt {
  id: string;
  label: string;
  balance: number;
  ratePercent: number;
  minimumMonthly: number;
  stress: number;
}

export interface PayoffPlan {
  method: PayoffMethod;
  order: string[];
  monthsToDebtFree: number;
  totalInterest: number;
  /** Sum over debts of stress times the months each one was still owed. */
  stressMonths: number;
  /** Payoff month index for each debt (1 = the first month). */
  paidOffMonth: Record<string, number>;
}

export interface PayoffComparison {
  budgetMonthly: number;
  plans: PayoffPlan[];
  /** Extra interest the peace-first order costs over the avalanche (the price of peace). */
  priceOfPeace: number;
  /** Stress-months the peace-first order saves against the avalanche. */
  peaceGained: number;
}

export function payoffDebts(h: Household): PayoffDebt[] {
  if (h.accounts.kind !== "rows") return [];
  return h.accounts.rows
    .filter((a): a is DebtAccount => a.side === "debt" && (a.balance.value ?? 0) > 0)
    .map((a) => ({ id: a.id, label: a.name?.value ?? getAccountPreset(a.preset).label, balance: a.balance.value ?? 0, ratePercent: a.promo ? a.promo.rateAfter.value : a.rate.value, minimumMonthly: a.minimumPaymentAnnual.value / 12, stress: a.stress?.value ?? blocksFile.payoff.stressDefault }));
}

/** The order each method pays debts in. Peace-first searches every order for the fewest stress-months (debts are few). */
export function payoffOrder(debts: readonly PayoffDebt[], method: PayoffMethod, budget: number): string[] {
  if (method === "avalanche") return [...debts].sort((a, b) => b.ratePercent - a.ratePercent || a.balance - b.balance).map((d) => d.id);
  if (method === "snowball") return [...debts].sort((a, b) => a.balance - b.balance || b.ratePercent - a.ratePercent).map((d) => d.id);
  // Peace-first: try every permutation when there are six or fewer debts; otherwise stress over balance, greedy.
  if (debts.length > 6) return [...debts].sort((a, b) => b.stress / Math.max(1, b.balance) - a.stress / Math.max(1, a.balance)).map((d) => d.id);
  let best: string[] = debts.map((d) => d.id);
  let bestScore = Infinity;
  const permute = (rest: PayoffDebt[], acc: string[]) => {
    if (!rest.length) {
      const s = simulate(debts, acc, budget).stressMonths;
      if (s < bestScore - 1e-9) {
        bestScore = s;
        best = [...acc];
      }
      return;
    }
    for (let i = 0; i < rest.length; i++) permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, rest[i]!.id]);
  };
  permute([...debts], []);
  return best;
}

/** Months until debt free, interest paid, and stress-months, for an order and a monthly budget. */
export function simulate(debts: readonly PayoffDebt[], order: readonly string[], budgetMonthly: number, maxMonths = 600): Omit<PayoffPlan, "method" | "order"> {
  const balances = new Map(debts.map((d) => [d.id, d.balance]));
  const byId = new Map(debts.map((d) => [d.id, d]));
  const paidOffMonth: Record<string, number> = {};
  let interest = 0;
  let stressMonths = 0;
  let month = 0;
  while ([...balances.values()].some((b) => b > 0.005) && month < maxMonths) {
    month += 1;
    let budget = budgetMonthly;
    // Interest accrues, minimums are paid.
    for (const d of debts) {
      const b = balances.get(d.id)!;
      if (b <= 0) continue;
      stressMonths += d.stress;
      const i = (b * d.ratePercent) / 100 / 12;
      interest += i;
      const pay = Math.min(b + i, d.minimumMonthly, budget);
      balances.set(d.id, b + i - pay);
      budget -= pay;
    }
    // The rest goes to the first open debt in the order.
    for (const id of order) {
      if (budget <= 0) break;
      const b = balances.get(id)!;
      if (b <= 0) continue;
      const pay = Math.min(b, budget);
      balances.set(id, b - pay);
      budget -= pay;
    }
    for (const d of debts) if ((balances.get(d.id) ?? 0) <= 0.005 && paidOffMonth[d.id] === undefined) paidOffMonth[d.id] = month;
  }
  for (const d of byId.keys()) if (paidOffMonth[d] === undefined) paidOffMonth[d] = Infinity;
  return { monthsToDebtFree: month, totalInterest: interest, stressMonths, paidOffMonth };
}

/** The three methods side by side at a monthly budget (the current payments plus any extra). */
export function comparePayoffMethods(h: Household, extraMonthly = 0): PayoffComparison {
  const debts = payoffDebts(h);
  const budget = debts.reduce((s, d) => s + d.minimumMonthly, 0) + extraMonthly;
  const plans: PayoffPlan[] = (blocksFile.payoff.methods as PayoffMethod[]).map((method) => {
    const order = payoffOrder(debts, method, budget);
    return { method, order, ...simulate(debts, order, budget) };
  });
  const avalanche = plans.find((p) => p.method === "avalanche")!;
  const peace = plans.find((p) => p.method === "peaceFirst")!;
  return { budgetMonthly: budget, plans, priceOfPeace: debts.length ? peace.totalInterest - avalanche.totalInterest : 0, peaceGained: debts.length ? avalanche.stressMonths - peace.stressMonths : 0 };
}
