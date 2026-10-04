/**
 * The Debt freedom room (docs/packs/debt-freedom.md; module manifest data/modules/debt-freedom.json;
 * decision A7). Everything the room shows comes from here: the three payoff methods with their
 * debt-free dates and each debt's own month, what $100 more a month buys, the promo-end warnings,
 * and the debt-free milestone. Pure: it reads the household and the payoff engine, nothing else.
 */

import type { Household, YearMonth } from "../model";
import { addMonths, yearMonthOf } from "../model";
import { comparePayoffMethods, payoffDebts, payoffOrder, simulate, type PayoffComparison, type PayoffDebt, type PayoffMethod, type PayoffPlan } from "../whatifs/payoff";

export const PAYOFF_METHOD_LABEL: Record<PayoffMethod, string> = {
  avalanche: "Avalanche (highest rate first)",
  snowball: "Snowball (smallest balance first)",
  peaceFirst: "Peace-first (fewest stress-months)",
};

export interface DebtFreedomMethod {
  method: PayoffMethod;
  label: string;
  /** The month the last debt is gone, or null when the budget never gets there. */
  debtFreeMonth: YearMonth | null;
  monthsToDebtFree: number;
  totalInterest: number;
  stressMonths: number;
  /** Each debt in payoff order with its own month. */
  order: { id: string; label: string; paidOff: YearMonth | null }[];
}

export interface HundredMore {
  method: PayoffMethod;
  /** Months the schedule shortens with $100 more a month. */
  monthsSaved: number;
  /** Interest saved with $100 more a month. */
  interestSaved: number;
}

export interface PromoWarning {
  debtId: string;
  label: string;
  promoRatePercent: number;
  rateAfterPercent: number;
  /** The last month of the promo rate. */
  endsAt: YearMonth;
  monthsLeft: number;
  /** The balance left when the promo ends if only the minimum is paid until then. */
  balanceAtEndAtMinimum: number;
  /** Whether each method clears the debt before the rate changes. */
  paidOffBeforeEnd: Record<PayoffMethod, boolean>;
  sentence: string;
}

export interface DebtFreedomView {
  debts: PayoffDebt[];
  budgetMonthly: number;
  extraMonthly: number;
  comparison: PayoffComparison;
  methods: DebtFreedomMethod[];
  /** Extra interest the peace-first order costs over the avalanche. */
  priceOfPeace: number;
  /** Stress-months the peace-first order saves against the avalanche. */
  peaceGained: number;
  hundredMore: HundredMore[];
  promoWarnings: PromoWarning[];
  /** Every sentence the room shows, for the wording scan. */
  sentences: string[];
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The calendar month for a simulation month (1 = the as-of month). */
export function simulationMonthToDate(asOf: string, month: number): YearMonth | null {
  return Number.isFinite(month) && month >= 1 ? addMonths(yearMonthOf(asOf), month - 1) : null;
}

function methodView(h: Household, debts: readonly PayoffDebt[], plan: PayoffPlan): DebtFreedomMethod {
  return {
    method: plan.method,
    label: PAYOFF_METHOD_LABEL[plan.method],
    debtFreeMonth: simulationMonthToDate(h.asOf, plan.monthsToDebtFree),
    monthsToDebtFree: plan.monthsToDebtFree,
    totalInterest: plan.totalInterest,
    stressMonths: plan.stressMonths,
    order: plan.order.map((id) => ({ id, label: debts.find((d) => d.id === id)?.label ?? id, paidOff: simulationMonthToDate(h.asOf, plan.paidOffMonth[id] ?? Infinity) })),
  };
}

/** The balance left when a promo ends if only the minimum is paid, at the promo rate, month by month. */
export function balanceAtPromoEnd(debt: PayoffDebt): number {
  if (!debt.promo) return debt.balance;
  let b = debt.balance;
  for (let m = 1; m <= debt.promo.monthsRemaining && b > 0.005; m++) {
    const i = (b * debt.promo.ratePercent) / 100 / 12;
    b = Math.max(0, b + i - Math.min(b + i, debt.minimumMonthly));
  }
  return b;
}

export interface DebtFreedomOptions {
  /** Dollars a month on top of the minimums. */
  extraMonthly?: number;
  /** A promo ending within this many months is warned about. */
  promoWarningMonths?: number;
}

/** The whole room for a household. */
export function debtFreedomView(h: Household, options: DebtFreedomOptions = {}): DebtFreedomView {
  const extraMonthly = Math.max(0, options.extraMonthly ?? 0);
  const warnWithin = options.promoWarningMonths ?? 12;
  const debts = payoffDebts(h);
  const comparison = comparePayoffMethods(h, extraMonthly);
  const methods = comparison.plans.map((p) => methodView(h, debts, p));
  // What $100 more buys, per method: the same order at a budget $100 higher.
  const hundredMore: HundredMore[] = comparison.plans.map((p) => {
    const more = simulate(debts, payoffOrder(debts, p.method, comparison.budgetMonthly + 100), comparison.budgetMonthly + 100);
    return { method: p.method, monthsSaved: Number.isFinite(p.monthsToDebtFree) && Number.isFinite(more.monthsToDebtFree) ? Math.max(0, p.monthsToDebtFree - more.monthsToDebtFree) : 0, interestSaved: Math.max(0, p.totalInterest - more.totalInterest) };
  });
  const promoWarnings: PromoWarning[] = debts
    .filter((d) => d.promo && d.promo.monthsRemaining <= warnWithin)
    .map((d) => {
      const promo = d.promo!;
      const endsAt = simulationMonthToDate(h.asOf, promo.monthsRemaining)!;
      const balanceAtEnd = balanceAtPromoEnd(d);
      const paidOffBeforeEnd = Object.fromEntries(comparison.plans.map((p) => [p.method, (p.paidOffMonth[d.id] ?? Infinity) <= promo.monthsRemaining])) as Record<PayoffMethod, boolean>;
      const clears = comparison.plans.filter((p) => paidOffBeforeEnd[p.method]).map((p) => PAYOFF_METHOD_LABEL[p.method].split(" (")[0]!);
      const sentence =
        `${d.label}'s ${promo.ratePercent}% rate ends ${endsAt}, ${promo.monthsRemaining} ${promo.monthsRemaining === 1 ? "month" : "months"} from now, and ${d.ratePercent}% applies after that. At the minimum payment alone, ${money(balanceAtEnd)} would still be owed when the rate changes.` +
        (clears.length === comparison.plans.length ? " Every method here clears it before then." : clears.length ? ` The ${clears.join(" and ")} ${clears.length === 1 ? "order clears" : "orders clear"} it before then.` : " None of the orders here clears it before then.");
      return { debtId: d.id, label: d.label, promoRatePercent: promo.ratePercent, rateAfterPercent: d.ratePercent, endsAt, monthsLeft: promo.monthsRemaining, balanceAtEndAtMinimum: balanceAtEnd, paidOffBeforeEnd, sentence };
    });
  const avalanche = methods.find((m) => m.method === "avalanche");
  const sentences: string[] = [
    ...methods.map((m) => (m.debtFreeMonth ? `${m.label}: debt free ${m.debtFreeMonth}, ${money(m.totalInterest)} of interest, ${Math.round(m.stressMonths)} stress-months.` : `${m.label}: the budget never clears every debt.`)),
    ...(debts.length > 1 ? [`The price of peace: the peace-first order costs ${money(comparison.priceOfPeace)} more in interest than the avalanche and saves ${Math.round(comparison.peaceGained)} stress-months.`] : []),
    ...hundredMore.filter((x) => x.method === "avalanche").map((x) => `With $100 more a month, the avalanche is debt free ${x.monthsSaved} ${x.monthsSaved === 1 ? "month" : "months"} sooner and pays ${money(x.interestSaved)} less interest.`),
    ...promoWarnings.map((w) => w.sentence),
  ];
  void avalanche;
  return { debts, budgetMonthly: comparison.budgetMonthly, extraMonthly, comparison, methods, priceOfPeace: comparison.priceOfPeace, peaceGained: comparison.peaceGained, hundredMore, promoWarnings, sentences };
}

export interface DebtFreeMilestone {
  id: "debtFree";
  label: string;
  /** The avalanche order at today's payments: the earliest date the current payments reach with no change of habit. */
  month: YearMonth | null;
  age: number | null;
  movedBy: string;
}

/** The debt-free date as a milestone for the Levels screen (pack section 6): the avalanche order at today's payments. */
export function debtFreeMilestone(h: Household): DebtFreeMilestone | null {
  const debts = payoffDebts(h);
  if (!debts.length) return null;
  const view = debtFreedomView(h);
  const avalanche = view.methods.find((m) => m.method === "avalanche")!;
  const birth = h.self.birthDate?.value;
  let age: number | null = null;
  if (avalanche.debtFreeMonth && birth) {
    const [by, bm] = birth.split("-").map(Number) as [number, number];
    const [y, m] = avalanche.debtFreeMonth.split("-").map(Number) as [number, number];
    age = y - by - (m < bm ? 1 : 0);
  }
  return { id: "debtFree", label: "Debt free", month: avalanche.debtFreeMonth, age, movedBy: "The payments on each debt and the extra that goes to the highest rate first." };
}
