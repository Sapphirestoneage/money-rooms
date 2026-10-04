/**
 * Federal tax for the M1 tax set (engine spec section 5): ordinary income
 * brackets and standard deduction, FICA, self-employment tax, and the 10%
 * early withdrawal penalty. Every rate and threshold comes from the tax tables.
 */

import type { FederalTables, FilingStatus } from "../model";
import { marginalRateFromBrackets, taxFromBrackets } from "./brackets";

export interface FederalTaxInput {
  filingStatus: FilingStatus;
  /** W-2 wages before any pre-tax deductions. */
  wages: number;
  /** 401(k), 403(b), HSA, and health premiums taken through payroll. Reduce income tax, not FICA (M1 convention). */
  pretaxPayrollDeductions: number;
  /** Self-employment income after business expenses. */
  selfEmploymentNet: number;
  /** Other ordinary income: withdrawals from pretax accounts, and later taxable Social Security. */
  otherOrdinaryIncome: number;
  /** Dollars withdrawn early that owe the 10% penalty. */
  earlyWithdrawals: number;
  /** Households of two: the partner's wages and net self-employment, so payroll taxes are capped per person. Blank for one person. */
  partnerWages?: number;
  partnerSelfEmploymentNet?: number;
}

export interface FederalTaxResult {
  agi: number;
  taxableIncome: number;
  incomeTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  selfEmploymentTax: number;
  penalty: number;
  /** Everything above, added up. */
  total: number;
  /** Percent on the next dollar of ordinary income. */
  marginalRate: number;
}

export function computeSelfEmploymentTax(
  selfEmploymentNet: number,
  wages: number,
  t: FederalTables,
): { tax: number; base: number } {
  const se = t.selfEmployment;
  if (!(selfEmploymentNet >= se.minimumNetEarnings)) return { tax: 0, base: 0 };
  const base = selfEmploymentNet * se.netEarningsFactor;
  const roomUnderWageBase = Math.max(0, t.fica.socialSecurityWageBase - wages);
  const socialSecurity = (Math.min(base, roomUnderWageBase) * se.socialSecurityPortion) / 100;
  const medicare = (base * se.medicarePortion) / 100;
  return { tax: socialSecurity + medicare, base };
}

/** Payroll taxes for one person: FICA on wages and self-employment tax, each capped at that person's wage base. */
export function payrollTaxesForPerson(wages: number, selfEmploymentNet: number, t: FederalTables): { socialSecurityTax: number; medicareTax: number; se: { tax: number; base: number } } {
  const fica = t.fica;
  return {
    socialSecurityTax: (Math.min(wages, fica.socialSecurityWageBase) * fica.socialSecurityRate) / 100,
    medicareTax: (wages * fica.medicareRate) / 100,
    se: computeSelfEmploymentTax(selfEmploymentNet, wages, t),
  };
}

export function computeFederalTax(input: FederalTaxInput, t: FederalTables): FederalTaxResult {
  const { filingStatus } = input;
  const fica = t.fica;
  const wages = input.wages + (input.partnerWages ?? 0);

  // FICA on wages (employee share), capped per person. M1 applies it to full wages.
  const own = payrollTaxesForPerson(input.wages, input.selfEmploymentNet, t);
  const partner = input.partnerWages !== undefined || input.partnerSelfEmploymentNet !== undefined ? payrollTaxesForPerson(input.partnerWages ?? 0, input.partnerSelfEmploymentNet ?? 0, t) : null;
  const socialSecurityTax = own.socialSecurityTax + (partner?.socialSecurityTax ?? 0);
  const medicareTax = own.medicareTax + (partner?.medicareTax ?? 0);
  const se = { tax: own.se.tax + (partner?.se.tax ?? 0), base: own.se.base + (partner?.se.base ?? 0) };
  const selfEmploymentNet = input.selfEmploymentNet + (input.partnerSelfEmploymentNet ?? 0);

  // Additional Medicare tax on combined earned income above the threshold.
  const earned = wages + se.base;
  const threshold = fica.additionalMedicareThreshold[filingStatus];
  const additionalMedicareTax = (Math.max(0, earned - threshold) * fica.additionalMedicareRate) / 100;

  // Adjusted gross income.
  const halfSe = t.selfEmployment.halfDeductibleFromIncome ? se.tax / 2 : 0;
  const agi =
    Math.max(0, wages - input.pretaxPayrollDeductions) +
    selfEmploymentNet -
    halfSe +
    input.otherOrdinaryIncome;

  const taxableIncome = Math.max(0, agi - t.standardDeduction[filingStatus]);
  const schedule = t.ordinaryBrackets[filingStatus];
  const incomeTax = taxFromBrackets(taxableIncome, schedule);
  const marginalRate = taxableIncome > 0 ? marginalRateFromBrackets(taxableIncome, schedule) : 0;

  const penalty = (Math.max(0, input.earlyWithdrawals) * t.earlyWithdrawalPenalty.rate) / 100;

  const total = incomeTax + socialSecurityTax + medicareTax + additionalMedicareTax + se.tax + penalty;

  return {
    agi,
    taxableIncome,
    incomeTax,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    selfEmploymentTax: se.tax,
    penalty,
    total,
    marginalRate,
  };
}
