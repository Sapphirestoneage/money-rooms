/**
 * Family loans done right (dictionary 9.16, decision A12; module data/modules/family-loans.json, beta):
 * what a loan from family carries that a bank loan does not. Pure.
 */

import type { DebtAccount, Household } from "../model";
import { RuleLedger } from "../model";

export interface FamilyLoanView {
  accountId: string;
  label: string;
  balance: number;
  paymentMonthly: number;
  flexibility: "fixed" | "flexible" | "pausable";
  forgiveness: "unknown" | "none" | "possible";
  lenders: number;
  stress: number | null;
  /** Dollars a year the lenders together could forgive with no gift tax filing. */
  forgivableAYear: number;
  /** Years to forgive the whole balance at that pace. */
  yearsToForgiveAll: number;
  belowMarket: boolean;
  flags: string[];
  sentences: string[];
}

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export function familyLoans(h: Household, ledger = new RuleLedger()): FamilyLoanView[] {
  if (h.accounts.kind !== "rows") return [];
  const gift = ledger.get<{ perDoneePerDonor: number }>("fed.giftExclusion.2026");
  const bml = ledger.getUnverified<{ netInvestmentIncomeLimitAggregate: number }>("fed.belowMarketLoans");
  return h.accounts.rows
    .filter((a): a is DebtAccount => a.side === "debt" && a.preset === "family")
    .map((a) => {
      const balance = a.balance.value ?? 0;
      const lenders = Math.max(1, a.lenders?.value ?? 1);
      const flexibility = a.paymentFlexibility?.value ?? "fixed";
      const forgiveness = a.possibleForgiveness?.value ?? "unknown";
      const forgivableAYear = gift.perDoneePerDonor * lenders;
      const yearsToForgiveAll = forgivableAYear > 0 ? Math.ceil(balance / forgivableAYear) : Infinity;
      const belowMarket = a.rate.value === 0 && balance > bml.value.netInvestmentIncomeLimitAggregate;
      const flags: string[] = [];
      if (forgiveness !== "none") flags.push(`${lenders === 1 ? "The lender" : `Each of the ${lenders} lenders`} can forgive up to ${money(gift.perDoneePerDonor)} a year as a gift with no gift tax filing: ${money(forgivableAYear)} a year together, the whole ${money(balance)} in about ${yearsToForgiveAll} years at that pace. Forgiveness of a loan is not income to you.`);
      if (belowMarket) flags.push(`At 0% on more than ${money(bml.value.netInvestmentIncomeLimitAggregate)}, the tax law may count forgone interest as the lender's income (rule fed.belowMarketLoans${bml.verified ? "" : ", not yet confirmed at its source"}). That is the lender's tax, not yours; it is here so nobody is surprised.`);
      if (flexibility !== "fixed") flags.push(`The payment is ${flexibility}: it is left out of the Rule of 5 target and comes first on the stability list in a hard season.`);
      const label = a.name?.value ?? "Family loan";
      const sentences = [`${label}: ${money(balance)} at ${a.rate.value}%, ${money(a.actualPaymentAnnual.value / 12)} a month, payment ${flexibility}, forgiveness ${forgiveness}, stress ${a.stress?.value ?? "not rated"} of 5.`, ...flags];
      return { accountId: a.id, label, balance, paymentMonthly: a.actualPaymentAnnual.value / 12, flexibility, forgiveness, lenders, stress: a.stress?.value ?? null, forgivableAYear, yearsToForgiveAll, belowMarket, flags, sentences };
    });
}
