/**
 * Federal tax at M2 depth (engine spec section 5, M2 spec section 4 B).
 * Everything M1 does, plus: long-term capital gains stacked on ordinary income,
 * the taxable part of Social Security (IRC 86), the senior deduction while it
 * exists, net investment income tax, and Roth conversions as ordinary income.
 * Every rate and threshold comes from the rules registry through the ledger.
 */

import type { FederalTables, FilingStatus } from "../model";
import type { RuleLedger } from "../model";
import { marginalRateFromBrackets, taxFromBrackets } from "./brackets";
import { payrollTaxesForPerson } from "./federal";

export interface FederalTaxM2Input {
  year: number;
  /** Age at the end of the year. */
  age: number;
  filingStatus: FilingStatus;
  wages: number;
  pretaxPayrollDeductions: number;
  selfEmploymentNet: number;
  /** Pretax account withdrawals and other ordinary income (unemployment, "other" streams). */
  otherOrdinaryIncome: number;
  /** Roth conversions this year: ordinary income, never penalized. */
  rothConversions: number;
  /** Gross Social Security benefit received this year. */
  socialSecurity: number;
  /** Realized long-term gains (sales and harvests) this year. */
  longTermGains: number;
  /** Dollars that owe the 10% additional tax: early pretax withdrawals without an exception, and the taxable part of early conversion or earnings withdrawals from Roth. */
  penalized: number;
  /** A deductible traditional IRA contribution this year (above the line). */
  iraDeduction: number;
  /** Households of two: the partner's age and earned income, for per-person payroll caps and the 65-plus pieces. Blank for one person. */
  partnerAge?: number;
  partnerWages?: number;
  partnerSelfEmploymentNet?: number;
  /** Dependents (dictionary 9.14): qualifying children under 17 at year end, for the child tax credit. */
  qualifyingChildren?: number;
  /** Children under 13 at year end, and the care spent on them this year, for the dependent care credit. */
  careChildren?: number;
  careExpenses?: number;
}

export interface FederalTaxM2Result {
  agi: number;
  /** AGI plus the untaxed part of Social Security: what the ACA uses. */
  magiAca: number;
  /** AGI (plus tax-exempt interest, none modeled): what IRMAA uses. */
  magiIrmaa: number;
  taxableSocialSecurity: number;
  seniorDeduction: number;
  standardDeduction: number;
  /** The section 199A deduction on self-employment income. */
  qbiDeduction: number;
  childTaxCredit: number;
  dependentCareCredit: number;
  /** Nonrefundable credits applied against the income tax (never below zero). */
  credits: number;
  /** True when a credit came from a rule not yet confirmed at its source. */
  creditsUnverified: boolean;
  taxableIncome: number;
  ordinaryTaxableIncome: number;
  ordinaryTax: number;
  capitalGainsTax: number;
  niit: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  selfEmploymentTax: number;
  penalty: number;
  total: number;
  /** Percent on the next dollar of ordinary income (federal only). */
  marginalRate: number;
  /** Dollars of ordinary income that could still be added before any of it is taxed: the deductions not yet used up by ordinary income (gains stack on top and lose 0% room instead). */
  ordinaryRoom: number;
  /** Dollars of long-term gains that would still fall in the 0% bracket. */
  zeroPercentGainRoom: number;
}

interface SsThresholds {
  single: [number, number];
  headOfHousehold: [number, number];
  marriedJoint: [number, number];
  marriedSeparateLivedTogether: [number, number];
  inclusion: [number, number];
  maxTaxablePct: number;
}

/** The taxable part of Social Security benefits (IRC 86), from provisional income. */
export function taxableSocialSecurity(benefit: number, otherIncome: number, filingStatus: FilingStatus, t: SsThresholds): number {
  if (!(benefit > 0)) return 0;
  const [base, adjusted] =
    filingStatus === "marriedJoint" ? t.marriedJoint : filingStatus === "marriedSeparate" ? t.marriedSeparateLivedTogether : filingStatus === "headOfHousehold" ? t.headOfHousehold : t.single;
  const provisional = otherIncome + benefit / 2;
  const [lower, upper] = t.inclusion.map((p) => p / 100) as [number, number];
  if (provisional <= base) return 0;
  if (provisional <= adjusted) return Math.min(lower * (provisional - base), lower * benefit);
  const tier1 = Math.min(lower * (adjusted - base), lower * benefit);
  const tier2 = upper * (provisional - adjusted);
  return Math.min(tier1 + tier2, (t.maxTaxablePct / 100) * benefit);
}

interface SeniorDeductionRule {
  perPerson: number;
  phaseOutStartMagi: { single: number; marriedJoint: number };
  phaseOutRate: number;
}

/** The senior deduction for one person 65 or over, phased out above the MAGI threshold. Zero in years the rule does not apply. */
export function seniorDeduction(age: number, magi: number, filingStatus: FilingStatus, r: SeniorDeductionRule | null): number {
  if (!r || age < 65) return 0;
  const threshold = filingStatus === "marriedJoint" ? r.phaseOutStartMagi.marriedJoint : r.phaseOutStartMagi.single;
  return Math.max(0, r.perPerson - r.phaseOutRate * Math.max(0, magi - threshold));
}

type Schedule = readonly { from: number; rate: number }[];

/** Tax on long-term gains stacked on top of ordinary taxable income, through the 0%, 15%, and 20% brackets. */
export function capitalGainsTax(ordinaryTaxableIncome: number, gains: number, schedule: Schedule): number {
  if (!(gains > 0)) return 0;
  // Gains fill the brackets above where ordinary income stops.
  return taxFromBrackets(ordinaryTaxableIncome + gains, schedule) - taxFromBrackets(ordinaryTaxableIncome, schedule);
}

export function computeFederalTaxM2(input: FederalTaxM2Input, t: FederalTables, ledger: RuleLedger): FederalTaxM2Result {
  const { filingStatus, year } = input;
  const fica = t.fica;
  const wages = input.wages + (input.partnerWages ?? 0);
  const selfEmploymentNet = input.selfEmploymentNet + (input.partnerSelfEmploymentNet ?? 0);

  // Payroll taxes, capped per person.
  const own = payrollTaxesForPerson(input.wages, input.selfEmploymentNet, t);
  const partner = input.partnerWages !== undefined || input.partnerSelfEmploymentNet !== undefined ? payrollTaxesForPerson(input.partnerWages ?? 0, input.partnerSelfEmploymentNet ?? 0, t) : null;
  const socialSecurityTax = own.socialSecurityTax + (partner?.socialSecurityTax ?? 0);
  const medicareTax = own.medicareTax + (partner?.medicareTax ?? 0);
  const se = { tax: own.se.tax + (partner?.se.tax ?? 0), base: own.se.base + (partner?.se.base ?? 0) };
  const earned = wages + se.base;
  const additionalMedicareTax = (Math.max(0, earned - fica.additionalMedicareThreshold[filingStatus]) * fica.additionalMedicareRate) / 100;
  const halfSe = t.selfEmployment.halfDeductibleFromIncome ? se.tax / 2 : 0;

  // Ordinary income before Social Security.
  const ordinaryBeforeSs =
    Math.max(0, wages - input.pretaxPayrollDeductions) + selfEmploymentNet - halfSe + input.otherOrdinaryIncome + input.rothConversions - input.iraDeduction;
  const otherForSs = ordinaryBeforeSs + input.longTermGains;
  const ssThresholds = ledger.get<SsThresholds>("ss.taxationThresholds");
  const taxableSs = taxableSocialSecurity(input.socialSecurity, otherForSs, filingStatus, ssThresholds);

  const agi = ordinaryBeforeSs + input.longTermGains + taxableSs;
  const magiAca = agi + (input.socialSecurity - taxableSs);
  const magiIrmaa = agi;

  // Deductions: the standard deduction (plus the extra for 65+), and the senior deduction while it exists.
  const std = ledger.get<Record<FilingStatus, number> & { additionalAgedOrBlind: number; additionalAgedOrBlindUnmarried: number }>("fed.standardDeduction.2026");
  const unmarried = filingStatus === "single" || filingStatus === "headOfHousehold";
  const agedOne = (age: number | undefined) => (age !== undefined && age >= 65 ? (unmarried ? std.additionalAgedOrBlindUnmarried : std.additionalAgedOrBlind) : 0);
  const aged = agedOne(input.age) + (filingStatus === "marriedJoint" ? agedOne(input.partnerAge) : 0);
  const standardDeduction = std[filingStatus] + aged;
  const seniorRule = ledger.getIfApplies<SeniorDeductionRule>("fed.seniorDeduction", year);
  const senior = seniorDeduction(input.age, agi, filingStatus, seniorRule) + (filingStatus === "marriedJoint" && input.partnerAge !== undefined ? seniorDeduction(input.partnerAge, agi, filingStatus, seniorRule) : 0);
  const deductions = standardDeduction + senior;

  // Section 199A: 20% of qualified business income (net of the deductible half of self-employment tax), capped at 20% of taxable income less net capital gain.
  let qbiDeduction = 0;
  if (selfEmploymentNet > 0) {
    const qbiRule = ledger.get<{ percent: number; qbiLessDeductibleHalfSeTax: boolean }>("fed.qbiDeduction.2026");
    const qbi = Math.max(0, selfEmploymentNet - (qbiRule.qbiLessDeductibleHalfSeTax ? halfSe : 0));
    const taxableBeforeQbi = Math.max(0, agi - deductions);
    qbiDeduction = Math.min((qbiRule.percent / 100) * qbi, (qbiRule.percent / 100) * Math.max(0, taxableBeforeQbi - input.longTermGains));
  }

  const taxableIncome = Math.max(0, agi - deductions - qbiDeduction);
  // Gains are taxed last, so ordinary taxable income is what is left after deductions come off the gains first.
  const gainsInTaxable = Math.min(input.longTermGains, taxableIncome);
  const ordinaryTaxableIncome = taxableIncome - gainsInTaxable;

  const ordinarySchedule = ledger.get<Record<FilingStatus, Schedule>>("fed.brackets.2026")[filingStatus];
  const gainsSchedule = ledger.get<Record<FilingStatus, Schedule>>("fed.ltcgBrackets.2026")[filingStatus];
  const ordinaryTax = taxFromBrackets(ordinaryTaxableIncome, ordinarySchedule);
  const gainsTax = capitalGainsTax(ordinaryTaxableIncome, gainsInTaxable, gainsSchedule);

  // Credits for dependents (dictionary 9.14): the child tax credit and the dependent care credit, nonrefundable here.
  let childTaxCredit = 0;
  let dependentCareCredit = 0;
  let creditsUnverified = false;
  const children = input.qualifyingChildren ?? 0;
  if (children > 0) {
    const r = ledger.get<{ perChild: number; phaseOutStartMagi: Record<FilingStatus, number>; phaseOutPer1000: number }>("fed.childTaxCredit.2026");
    const over = Math.max(0, agi - r.phaseOutStartMagi[filingStatus]);
    childTaxCredit = Math.max(0, r.perChild * children - Math.ceil(over / 1000) * r.phaseOutPer1000);
  }
  const careChildren = input.careChildren ?? 0;
  const careExpenses = input.careExpenses ?? 0;
  if (careChildren > 0 && careExpenses > 0) {
    const got = ledger.getUnverified<{ expenseCap: { one: number; twoOrMore: number }; maxPercent: number; minPercent: number; phaseDown: { agiAbove: number; agiAboveJoint?: number; per: number; points: number; floorPercent: number }[] }>("fed.dependentCareCredit.2026");
    creditsUnverified = creditsUnverified || !got.verified;
    const r = got.value;
    const capped = Math.min(careExpenses, careChildren >= 2 ? r.expenseCap.twoOrMore : r.expenseCap.one, Math.max(0, wages + selfEmploymentNet));
    let pct = r.maxPercent;
    for (const step of r.phaseDown) {
      const above = filingStatus === "marriedJoint" && step.agiAboveJoint !== undefined ? step.agiAboveJoint : step.agiAbove;
      if (agi > above) pct = Math.max(step.floorPercent, Math.min(pct, r.maxPercent) - Math.ceil((agi - above) / step.per) * step.points);
      else break;
    }
    pct = Math.max(r.minPercent, pct);
    dependentCareCredit = (capped * pct) / 100;
  }
  const credits = Math.min(childTaxCredit + dependentCareCredit, ordinaryTax + gainsTax);

  const niitRule = ledger.get<{ rate: number; magiAbove: Record<FilingStatus, number> }>("fed.niit");
  const niit = niitRule.rate * Math.max(0, Math.min(input.longTermGains, magiIrmaa - niitRule.magiAbove[filingStatus]));

  const penalty = (Math.max(0, input.penalized) * t.earlyWithdrawalPenalty.rate) / 100;
  const total = ordinaryTax + gainsTax - credits + niit + socialSecurityTax + medicareTax + additionalMedicareTax + se.tax + penalty;

  const zeroTop = gainsSchedule.find((b) => b.rate > 0)?.from ?? 0;
  return {
    agi,
    magiAca,
    magiIrmaa,
    taxableSocialSecurity: taxableSs,
    seniorDeduction: senior,
    standardDeduction,
    qbiDeduction,
    childTaxCredit,
    dependentCareCredit,
    credits,
    creditsUnverified,
    taxableIncome,
    ordinaryTaxableIncome,
    ordinaryTax,
    capitalGainsTax: gainsTax,
    niit,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    selfEmploymentTax: se.tax,
    penalty,
    total,
    marginalRate: ordinaryTaxableIncome > 0 ? marginalRateFromBrackets(ordinaryTaxableIncome, ordinarySchedule) : 0,
    ordinaryRoom: Math.max(0, deductions - (agi - input.longTermGains)),
    zeroPercentGainRoom: Math.max(0, zeroTop - taxableIncome),
  };
}

/** The top of a federal ordinary bracket by its rate (10, 12, 22...), as taxable income. */
export function bracketTop(ratePercent: number, filingStatus: FilingStatus, ledger: RuleLedger): number {
  const schedule = ledger.get<Record<FilingStatus, Schedule>>("fed.brackets.2026")[filingStatus];
  const i = schedule.findIndex((b) => b.rate === ratePercent);
  if (i < 0) throw new Error(`No ${ratePercent}% federal bracket`);
  return schedule[i + 1]?.from ?? Infinity;
}
