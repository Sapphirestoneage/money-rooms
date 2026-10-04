/**
 * The lump-sum decision card (module data/modules/lump-sum.json, beta; decision A13): where a large
 * amount could come from, side by side. Each source is stacked on this year's return as the household
 * is set up today: a family loan (no tax, the lender's gift rules), the taxable brokerage (gains at the
 * capital gains rates, state tax), or a retirement account (ordinary income, the 10% additional tax
 * before 59 and a half, state tax). Pure; reads the household, the tax tables, and the rules registry.
 */

import type { Household, StateCode } from "../model";
import { RuleLedger, isWorkplaceContribution, loadTaxTables, parseYearMonth, resolveAssumptions, yearMonthOf } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { computeFederalTaxM2, type FederalTaxM2Input } from "../tax/federal-m2";
import { computeStateTax, type StateAdjustments } from "../tax/state";

export type LumpSumSourceKind = "familyLoan" | "brokerage" | "retirement";

export interface LumpSumSource {
  kind: LumpSumSourceKind;
  accountId: string | null;
  label: string;
  /** What leaves the account (or is borrowed). */
  gross: number;
  /** Ordinary income tax at the bracket rates, stacked on this year's return. */
  federalTax: number;
  /** Credits lost because the extra income phased them down (the dependent care credit above $75,000). */
  creditsLost: number;
  penalty: number;
  stateTax: number;
  net: number;
  /** The stress rating the person gave the loan, or null for a sale or withdrawal. */
  stress: number | null;
  /** FI age with this source used for the amount (the others untouched), or null when never funded. */
  fiAge: number | null;
  flags: string[];
}

export interface LumpSumComparison {
  amountNeeded: number;
  year: number;
  sources: LumpSumSource[];
  /** Every taxable source together: net raised and what taxes and penalties took. */
  allTaxableNet: number;
  lostToTaxesAndPenalties: number;
  sentences: string[];
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** This year's return as the household is set up: the inputs the lump-sum stacks on. */
function baseReturn(h: Household, year: number): { input: FederalTaxM2Input; workplaceDeferrals: number; halfSeShare: boolean; state: StateCode } {
  const hh = requireComplete(h);
  const age = year - parseYearMonth(hh.birthDate).year;
  let wages = 0;
  let seNet = 0;
  let deferrals = 0;
  let otherPretax = 0;
  for (const s of hh.income) {
    if (s.end.kind === "date" && parseYearMonth(s.end.date).year < year) continue;
    const gross = s.grossAnnual.value;
    if (s.type === "salary" || s.type === "hourly") {
      wages += gross;
      for (const d of s.preTaxDeductions ?? []) {
        if (isWorkplaceContribution(d)) deferrals += (gross * d.percentOfPay.value) / 100;
        else otherPretax += d.annual.value;
      }
    } else if (s.type === "selfEmployed" || s.type === "sideGig") seNet += Math.max(0, gross - (s.businessExpensesAnnual?.value ?? 0));
  }
  const under = (a: number) => hh.dependents.filter((d) => d.livesWithYou.value && year - parseYearMonth(d.birthDate.value).year < a).length;
  const care = hh.spending.filter((r) => r.category === "childcare").reduce((s, r) => s + r.annual.value, 0);
  const input: FederalTaxM2Input = {
    year,
    age,
    filingStatus: hh.filingStatus === "headOfHousehold" && under(19) === 0 ? "single" : hh.filingStatus,
    wages,
    pretaxPayrollDeductions: deferrals + otherPretax,
    selfEmploymentNet: seNet,
    otherOrdinaryIncome: 0,
    rothConversions: 0,
    socialSecurity: 0,
    longTermGains: 0,
    penalized: 0,
    iraDeduction: 0,
    qualifyingChildren: under(17),
    careChildren: under(13),
    careExpenses: care,
  };
  return { input, workplaceDeferrals: deferrals, halfSeShare: true, state: hh.state };
}

function stateAdjustments(h: Household, ledger: RuleLedger, workplaceDeferrals: number, halfSe: number, earnedBase: number): StateAdjustments {
  const hh = requireComplete(h);
  if (hh.state === "PA") {
    const r = ledger.getUnverified<{ retirementDeferralsTaxable: boolean; halfSelfEmploymentTaxDeductible: boolean; localEarnedIncomeTax: { defaultPercent: number } }>("state.PA.compensation").value;
    return { addBack: (r.retirementDeferralsTaxable ? workplaceDeferrals : 0) + (r.halfSelfEmploymentTaxDeductible ? 0 : halfSe), localTaxPercent: hh.localTaxPercent ?? r.localEarnedIncomeTax.defaultPercent, localBase: earnedBase };
  }
  return { addBack: 0, localTaxPercent: hh.localTaxPercent ?? 0, localBase: earnedBase };
}

/** FI age in the likely band for a household with one change applied. */
function fiAgeWith(h: Household, change: (c: Household) => void): number | null {
  const c = structuredClone(h);
  change(c);
  try {
    return findFiDate(requireComplete(c), resolveBand(resolveAssumptions(c.assumptions), "likely"), defaultDeps()).fiAge;
  } catch {
    return null;
  }
}

/**
 * Where `amountNeeded` could come from. Each taxable source is costed as if its whole balance (or the
 * amount, when smaller) came out this year on top of the return as entered; a family loan already on
 * the books is shown as the amount borrowed with no tax.
 */
export function lumpSumComparison(h: Household, amountNeeded: number, options: { year?: number; liquidateAll?: boolean } = {}): LumpSumComparison {
  const year = options.year ?? parseYearMonth(yearMonthOf(h.asOf)).year;
  const ledger = new RuleLedger();
  const tables = loadTaxTables(2026);
  const base = baseReturn(h, year);
  const fedBase = computeFederalTaxM2(base.input, tables.federal, ledger);
  const earned = base.input.wages + base.input.selfEmploymentNet;
  const stBase = computeStateTax(fedBase.agi, base.state, base.input.filingStatus, tables, stateAdjustments(h, ledger, base.workplaceDeferrals, fedBase.selfEmploymentTax / 2, earned));
  const sources: LumpSumSource[] = [];
  const accounts = h.accounts.kind === "rows" ? h.accounts.rows : [];
  const giftRule = ledger.get<{ perDoneePerDonor: number }>("fed.giftExclusion.2026");
  const belowMarket = ledger.getUnverified<{ netInvestmentIncomeLimitAggregate: number }>("fed.belowMarketLoans");

  for (const a of accounts) {
    if (a.side === "debt" && a.preset === "family") {
      const gross = Math.min(amountNeeded, options.liquidateAll ? a.balance.value ?? 0 : amountNeeded);
      const flags: string[] = [];
      const lenders = a.lenders?.value ?? 1;
      flags.push(`Forgiveness, if it ever comes, is a gift from the lender: up to ${money(giftRule.perDoneePerDonor)} a year from each of ${lenders} ${lenders === 1 ? "lender" : "lenders"} with no gift tax filing (rule fed.giftExclusion.2026).`);
      if ((a.balance.value ?? 0) > belowMarket.value.netInvestmentIncomeLimitAggregate && a.rate.value === 0) flags.push(`Above ${money(belowMarket.value.netInvestmentIncomeLimitAggregate)} at 0%, the tax law may treat forgone interest as the lender's income (rule fed.belowMarketLoans${belowMarket.verified ? "" : ", not yet confirmed at its source"}). It is the lender's tax, not yours.`);
      sources.push({ kind: "familyLoan", accountId: a.id, label: a.name?.value ?? "Family loan", gross, federalTax: 0, creditsLost: 0, penalty: 0, stateTax: 0, net: gross, stress: a.stress?.value ?? null, fiAge: fiAgeWith(h, () => undefined), flags });
      continue;
    }
    if (a.side !== "asset" || (a.balance.value ?? 0) <= 0) continue;
    const balance = a.balance.value ?? 0;
    if (a.taxBucket.value === "taxable") {
      const gross = options.liquidateAll ? balance : Math.min(balance, amountNeeded);
      const basis = a.costBasis?.value ?? 0.7 * balance;
      const gains = Math.max(0, gross - basis * (gross / balance));
      const fed = computeFederalTaxM2({ ...base.input, longTermGains: gains }, tables.federal, ledger);
      const st = computeStateTax(fed.agi, base.state, base.input.filingStatus, tables, stateAdjustments(h, ledger, base.workplaceDeferrals, fed.selfEmploymentTax / 2, earned));
      const federalTax = fed.ordinaryTax + fed.capitalGainsTax + fed.niit - (fedBase.ordinaryTax + fedBase.capitalGainsTax + fedBase.niit);
      const creditsLost = fedBase.credits - fed.credits;
      const stateTax = st.tax - stBase.tax;
      const net = gross - federalTax - creditsLost - stateTax;
      const flags = gains > 0 && fed.capitalGainsTax === 0 ? [`The ${money(gains)} of gains falls in the 0% bracket this year.`] : [];
      sources.push({ kind: "brokerage", accountId: a.id, label: a.name?.value ?? "Brokerage", gross, federalTax, creditsLost, penalty: 0, stateTax, net, stress: null, fiAge: fiAgeWith(h, (c) => { if (c.accounts.kind === "rows") { const x = c.accounts.rows.find((r) => r.id === a.id); if (x && x.side === "asset") x.balance = { ...x.balance, value: balance - gross }; } }), flags });
    } else if (a.taxBucket.value === "pretax") {
      const gross = options.liquidateAll ? balance : Math.min(balance, amountNeeded);
      const early = base.input.age < 59.5;
      const fed = computeFederalTaxM2({ ...base.input, otherOrdinaryIncome: gross, penalized: early ? gross : 0 }, tables.federal, ledger);
      const st = computeStateTax(fed.agi, base.state, base.input.filingStatus, tables, stateAdjustments(h, ledger, base.workplaceDeferrals, fed.selfEmploymentTax / 2, earned));
      const federalTax = fed.ordinaryTax + fed.capitalGainsTax + fed.niit - (fedBase.ordinaryTax + fedBase.capitalGainsTax + fedBase.niit);
      const creditsLost = fedBase.credits - fed.credits;
      const stateTax = st.tax - stBase.tax;
      const net = gross - federalTax - creditsLost - fed.penalty - stateTax;
      sources.push({ kind: "retirement", accountId: a.id, label: a.name?.value ?? "Retirement account", gross, federalTax, creditsLost, penalty: fed.penalty, stateTax, net, stress: null, fiAge: fiAgeWith(h, (c) => { if (c.accounts.kind === "rows") { const x = c.accounts.rows.find((r) => r.id === a.id); if (x && x.side === "asset") x.balance = { ...x.balance, value: balance - gross }; } }), flags: early ? ["Before 59 and a half, the 10% additional tax applies on top of the income tax."] : [] });
    }
  }
  const taxable = sources.filter((s) => s.kind !== "familyLoan");
  const allTaxableNet = taxable.reduce((s, x) => s + x.net, 0);
  const allTaxableGross = taxable.reduce((s, x) => s + x.gross, 0);
  const lostToTaxesAndPenalties = allTaxableGross - allTaxableNet;
  const sentences = [
    ...sources.map((s) => (s.kind === "familyLoan" ? `${s.label}: ${money(s.gross)} borrowed, no tax, stress ${s.stress ?? "not rated"} of 5.` : `${s.label}: ${money(s.gross)} out, ${money(s.federalTax + s.creditsLost + s.penalty + s.stateTax)} to taxes${s.penalty > 0 ? " and the penalty" : ""}, ${money(s.net)} in hand${s.fiAge !== null ? `, FI at ${s.fiAge}` : ""}.`)),
    ...(taxable.length ? [`Every taxable source together raises ${money(allTaxableNet)} of the ${money(amountNeeded)} needed, with ${money(lostToTaxesAndPenalties)} lost to taxes and penalties.`] : []),
  ];
  return { amountNeeded, year, sources, allTaxableNet, lostToTaxesAndPenalties, sentences };
}
