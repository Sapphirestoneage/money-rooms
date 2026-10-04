/**
 * The year-by-year timeline (engine spec sections 2 and 3). One household, one
 * band, one retirement year in; one row per year out. Pure: no screens, no storage.
 *
 * Every flow is computed on an annual basis and then multiplied by the year's
 * fraction (1, or the stub fraction in year 0 per decision E8). Growth uses the
 * fraction as the exponent, and flows land mid-period.
 */

import engineDefaults from "../../data/engine-defaults.json";
import type {
  Account,
  AccountOwner,
  AssetAccount,
  DebtAccount,
  Dependent,
  DrawdownInputs,
  FilingStatus,
  Home,
  Household,
  IncomeStream,
  RuleRef,
  SavingsStrategy,
  SocialSecurityParams,
  SpendingRow,
  StateCode,
  TaxBucket,
  TaxTables,
  WorkplacePlan,
  YearMonth,
} from "../model";
import { RuleLedger, amountFromPercentOfPay, getAccountPreset, homeReserveAnnual, isAnswered, isWorkplaceContribution, parseYearMonth, stubFraction } from "../model";
import {
  annualBenefit,
  averageIndexedMonthlyEarnings,
  claimingFactor,
  estimateEarningsRecord,
  primaryInsuranceAmount,
  spousalFactor,
  survivorFactor,
  type SpousalReductionSchedule,
  type SurvivorReductionSchedule,
} from "../social-security/benefit";
import { computeFederalTax, type FederalTaxResult } from "../tax/federal";
import { bracketTop, computeFederalTaxM2, type FederalTaxM2Result } from "../tax/federal-m2";
import { computeStateTax, type StateAdjustments, type StateTaxResult } from "../tax/state";
import { drawRoth, governmental457bPenaltyFree, requiredMinimumDistribution, ruleOf55Applies, seppMaxRate, seppPayment, seppYearsRequired, type RothLayer } from "./drawdown";
import { acaPremiumCredit, healthcareLine, lookbackYears, magiForPctFpl, type HealthcareLine } from "./healthcare";
import { defaultPolicy, type DrawdownPolicy, type YearLock } from "./policy";
import { blendedRealReturn, growBalance } from "./accounts";
import type { BandNumbers } from "./bands";
import { debtYear, nominalRateFor } from "./debts";
import { incomeForYear, type YearContext, type YearIncome } from "./income";
import { contributionLimits } from "./limits";
import { spendingForYear } from "./spending";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** A household with every required level-one answer present. */
export interface CompleteHousehold {
  asOf: string;
  birthDate: YearMonth;
  state: StateCode;
  filingStatus: FilingStatus;
  hsaEligible: boolean;
  income: readonly IncomeStream[];
  spending: readonly SpendingRow[];
  accounts: readonly Account[];
  savingsStrategy: SavingsStrategy;
  socialSecurity: Household["self"]["socialSecurity"];
  /** M2: workplace plans (dictionary 9.2). */
  plans: readonly WorkplacePlan[];
  /** M2: the level-two drawdown inputs (spec section 7). */
  drawdown: DrawdownInputs;
  /** Households of two (docs/household-two-spec.md): the partner's own fields. Blank for one person. */
  partner?: CompletePartner;
  /** Dictionary 9.14: dependent children. */
  dependents: readonly Dependent[];
  /** Dictionary 9.15: the home, kept out of the FI number; its upkeep reserve is spending. */
  home?: Home;
  /** Dictionary 9.15: local earned income tax, percent. Blank means the state's default. */
  localTaxPercent?: number;
}

/** The partner's person-level answers. The state and filing status are the household's, read from self. */
export interface CompletePartner {
  birthDate: YearMonth;
  income: readonly IncomeStream[];
  hsaEligible: boolean;
  socialSecurity: Household["self"]["socialSecurity"];
}

/** Narrows a household, or throws naming what is still unanswered (data dictionary section 8). */
export function requireComplete(h: Household): CompleteHousehold {
  const missing: string[] = [];
  if (!h.self.birthDate) missing.push("birth date");
  if (!h.self.state) missing.push("state");
  if (h.self.income.kind === "unanswered") missing.push("income");
  if (h.spending.kind === "unanswered") missing.push("spending");
  if (h.accounts.kind === "unanswered") missing.push("accounts");
  if (h.partner && !h.partner.birthDate) missing.push("your partner's birth date");
  if (missing.length) throw new Error(`The household still needs: ${missing.join(", ")}`);
  const partner: CompletePartner | undefined = h.partner
    ? {
        birthDate: h.partner.birthDate!.value,
        income: h.partner.income.kind === "rows" ? h.partner.income.rows : [],
        hsaEligible: h.partner.hsaEligible.value,
        socialSecurity: h.partner.socialSecurity,
      }
    : undefined;
  return {
    asOf: h.asOf,
    birthDate: h.self.birthDate!.value,
    state: h.self.state!.value,
    filingStatus: h.self.filingStatus.value,
    hsaEligible: h.self.hsaEligible.value,
    income: h.self.income.kind === "rows" ? h.self.income.rows : [],
    spending: h.spending.kind === "rows" ? h.spending.rows : [],
    accounts: h.accounts.kind === "rows" ? h.accounts.rows : [],
    savingsStrategy: h.savingsStrategy.value,
    socialSecurity: h.self.socialSecurity,
    plans: h.plans ?? [],
    drawdown: h.drawdown ?? {},
    ...(partner ? { partner } : {}),
    dependents: h.dependents ?? [],
    ...(h.home ? { home: h.home } : {}),
    ...(h.self.localTaxPercent ? { localTaxPercent: h.self.localTaxPercent.value } : {}),
  };
}

/**
 * Which rule set the year loop follows. "m1" is the walking skeleton's method, kept exactly
 * as tied out against Maya's workpaper (tests/tie-out-conventions.md). "m2" is the full depth
 * of docs/m2-spec.md. The app uses m2; the tie-out and the M1 unit tests use m1.
 */
export type EngineConventions = "m1" | "m2";

export interface TimelineOptions {
  band: BandNumbers;
  /** The first calendar year with no work income. Use Infinity to never retire. */
  retirementYear: number;
  tables: TaxTables;
  ssParams: SocialSecurityParams;
  /** Test-only settings for hand tie-outs. The app never sets these. */
  testSettings?: TieOutSettings;
  /** Defaults to m1, so every M1 test and the tie-out run unchanged. The app passes m2. */
  conventions?: EngineConventions;
  /** M2 only: the drawdown policy. Defaults to the conventional order with no strategies. */
  policy?: DrawdownPolicy;
  /** Stress test: rules treated as gone (sunsetting ones that end early). */
  disabledRules?: readonly string[];
  /** Spending scaled by this factor every year (1 = as entered). The "most spending" objective searches it. */
  spendingScale?: number;
  /** M6: real returns by calendar year (percent) that replace the band's returns where given. */
  returnsByYear?: Readonly<Record<number, { stocks: number; bonds: number; cash: number }>>;
  /** M6: a spending rule for retired years. Returns the factor to apply to that year's spending (1 = as planned). May keep state across years. */
  spendingAdjuster?: (ctx: { year: number; age: number; assetsAtStart: number; assetsAtRetirement: number | null; plannedSpending: number; stocksReturn: number }) => number;
}

/**
 * Settings a tie-out can impose so the engine runs under a workpaper's stated
 * conventions. They replace inputs only. No engine rule changes.
 */
export interface TieOutSettings {
  /** A fixed annual benefit from an age, instead of the computed estimate. Not scaled by the policy band. */
  socialSecurityOverride?: { annual: number; fromAge: number };
  /** A healthcare line added to retirement spending: one amount before 65, one from 65. */
  retirementHealthcare?: { before65: number; from65: number };
  /**
   * The M2 tie-out conventions (tests/m2-tie-out-conventions.md), test-only: health care before 65 is the stated
   * benchmark less the ACA credit on this year's MAGI (no out-of-pocket, no Medicaid), a flat amount from 65; the
   * cash reserve counts the M1 placeholder; the Roth IRA step is used instead of the deductible IRA.
   */
  m2TieOut?: { acaBenchmarkBefore65: number; from65: number; reserveHealthcarePlaceholder: { before65: number; from65: number } };
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export interface TaxLine {
  federalIncome: number;
  fica: number;
  selfEmployment: number;
  penalty: number;
  state: number;
  /** Local earned income tax (dictionary 9.15). Zero outside the states that levy one. */
  local: number;
  total: number;
}

export interface YearRow {
  year: number;
  t: number;
  fraction: number;
  age: number;
  retired: boolean;
  phaseId: string | null;
  /** Prorated flows for the year. */
  income: { wages: number; selfEmploymentNet: number; otherTaxable: number; nonTaxable: number; gross: number };
  deductions: { workplacePretax: number; workplaceRoth: number; hsa: number; premiumsAndOther: number };
  employerMatch: number;
  taxes: TaxLine;
  /** Cash in after deductions and taxes, before spending and debt payments. */
  takeHome: number;
  spending: number;
  socialSecurity: number;
  debt: { scheduled: number; extra: number; interest: number; principal: number };
  /** Take-home plus Social Security minus spending minus scheduled debt payments. */
  gap: number;
  contributions: Record<string, number>;
  withdrawals: Record<string, number>;
  /** The part of the cash withdrawals that came out of the emergency reserve itself (drawn last). */
  fromReserve: number;
  /** Each savings waterfall step that took money this year (prorated), in order. */
  waterfall: WaterfallStep[];
  shortfall: number;
  balances: Record<string, number>;
  assets: number;
  debts: number;
  netWorth: number;
  flags: string[];
  /** M2 only (undefined under m1 conventions). */
  m2?: YearRowM2;
  /** Households of two: the partner's side of the year. */
  partner?: { age: number; alive: boolean; income: number; socialSecurity: number };
}

/** The M2 detail behind a year: what the strategies did and what the taxes were made of. */
export interface YearRowM2 {
  /** Roth conversion this year (prorated). */
  conversion: number;
  /** Long-term gains realized by harvesting alone (prorated). */
  harvested: number;
  /** All long-term gains realized, sales and harvests (prorated). */
  gainsRealized: number;
  /** Required minimum distribution taken (prorated). */
  rmd: number;
  /** 72(t) payment taken (prorated). */
  sepp: number;
  /** Dollars that owed the 10% additional tax (prorated). */
  penalized: number;
  /** AGI, and MAGI as the ACA and IRMAA see it. */
  agi: number;
  magiAca: number;
  taxDetail: { ordinary: number; capitalGains: number; niit: number; taxableSocialSecurity: number; seniorDeduction: number };
  healthcare: { total: number; pieces: { label: string; amount: number }[]; acaPctFpl: number | null; irmaaTier: number | null };
  /** What the year's choices were, in words, for the year-by-year plan. */
  actions: string[];
  /** Roth dollars drawn this year by layer (prorated): contribution basis, seasoned conversions, conversions still inside their clock, earnings. */
  rothDraw: { basis: number; seasonedConversions: number; unseasonedConversions: number; earnings: number };
  /** Cost basis left in taxable accounts at the end of the year. */
  taxableBasisEnd: number;
}

export interface WaterfallStep {
  step: string;
  amount: number;
  /** Tax saved by this step (pre-tax steps only). */
  taxSaved: number;
  remainingAfter: number;
}

export interface AccountInfo {
  id: string;
  label: string;
  kind: "asset" | "debt";
  taxBucket?: TaxBucket;
  /** True when the engine created it because the waterfall needed somewhere to put money. */
  implicit: boolean;
}

export interface TimelineResult {
  rows: YearRow[];
  accounts: AccountInfo[];
  firstShortfall: { year: number; age: number; amount: number } | null;
  lifetimeTaxes: number;
  /** Net worth at the end of the last year (plan-to age). */
  estate: number;
  /** Total assets at the end of the last working year, or null if never retired within the horizon. */
  assetsAtRetirement: number | null;
  socialSecurity: { pia: number; claimingAgeYears: number; factor: number; annualBenefit: number };
  /** Households of two: the partner's own benefit before any spousal top-up. */
  partnerSocialSecurity?: { pia: number; claimingAgeYears: number; factor: number; annualBenefit: number };
  flags: string[];
  /** Which conventions this run followed. */
  conventions: EngineConventions;
  /** M2: every rule the run read, with source and last-verified date (M2 acceptance test 5). */
  rulesUsed: RuleRef[];
  /** M2: the rules used that are sunsetting or under watch (tripwire 1). */
  tripwires: RuleRef[];
}

// ---------------------------------------------------------------------------
// Account state
// ---------------------------------------------------------------------------

interface AssetState {
  kind: "asset";
  id: string;
  label: string;
  taxBucket: TaxBucket;
  balance: number;
  /** Blended real percent per year after fees. */
  rate: number;
  /** Percent per year. Decides which Roth account is drawn first. */
  fees: number;
  implicit: boolean;
  /** The mix, kept so a year's return can be rebuilt from historical returns (M6). */
  allocation: { stocks: number; bonds: number; cash: number };
  /** M2: taxable accounts, the cost basis. */
  basis: number;
  /** M2: Roth accounts, the ordering layers. */
  roth: RothLayer | null;
  /** M2: HSA, saved medical receipts still reimbursable. */
  receipts: number;
  /** M2: the workplace plan this account belongs to, for the rule of 55 and 457(b). */
  plan: WorkplacePlan | null;
  /** Dictionary 9.4: whose age decides penalties, catch-ups, and required distributions. */
  owner: AccountOwner;
}

interface DebtState {
  kind: "debt";
  id: string;
  label: string;
  account: DebtAccount;
  balance: number;
}

type AccountState = AssetState | DebtState;

/** The rules update routine's trigger: a rule older than this is flagged on every result that uses it. */
export const STALE_RULE_MONTHS = 15;

const DEFAULTS = {
  highInterest: engineDefaults.highInterestThresholdPercent.value,
  workStartAge: engineDefaults.assumedWorkStartAge.value,
  reserveMonths: engineDefaults.emergencyReserveMonths.value,
  penaltyFreeAge: engineDefaults.penaltyFreeAge.value,
};

function assetState(a: AssetAccount, band: BandNumbers, year0: number, plans: readonly WorkplacePlan[], drawdown: DrawdownInputs): AssetState {
  const balance = isAnswered(a.balance) ? a.balance.value : 0;
  const bucket = a.taxBucket.value;
  // Level-two defaults (M2 spec section 7): 70% basis on taxable, 50% contribution basis on Roth, both roughly.
  const basis = bucket === "taxable" ? (a.costBasis?.value ?? 0.7 * balance) : 0;
  const roth: RothLayer | null =
    bucket === "roth"
      ? {
          basis: a.rothBasis?.value ?? 0.5 * balance,
          conversions: (a.conversions ?? []).map((c) => ({ year: parseYearMonth(c.month).year, amount: c.amount.value })).sort((x, y) => x.year - y.year),
          firstYear: drawdown.firstRothYear?.value ?? year0 - 5,
        }
      : null;
  return {
    kind: "asset",
    id: a.id,
    label: a.name?.value ?? getAccountPreset(a.preset).label,
    taxBucket: bucket,
    balance,
    rate: blendedRealReturn(a.allocation.value, band.returns, a.fees.value),
    fees: a.fees.value,
    implicit: false,
    allocation: a.allocation.value,
    basis,
    roth,
    receipts: bucket === "hsa" ? (a.savedReceipts?.value ?? 0) : 0,
    plan: plans.find((p) => p.id === a.planId) ?? null,
    owner: a.owner ?? "self",
  };
}

function implicitAsset(id: string, presetKey: "trad401k" | "roth401k" | "rothIRA" | "tradIRA" | "hsa" | "brokerage", band: BandNumbers, owner: AccountOwner = "self"): AssetState {
  const p = getAccountPreset(presetKey);
  if (p.side !== "asset") throw new Error("implicit accounts must be assets");
  return {
    kind: "asset",
    id,
    label: `${p.label} (added by the engine)`,
    taxBucket: p.taxBucket,
    balance: 0,
    rate: blendedRealReturn(p.allocation, band.returns, p.fees),
    fees: p.fees,
    implicit: true,
    allocation: p.allocation,
    basis: 0,
    roth: p.taxBucket === "roth" ? { basis: 0, conversions: [], firstYear: Infinity } : null,
    receipts: 0,
    plan: null,
    owner,
  };
}

// ---------------------------------------------------------------------------
// The timeline
// ---------------------------------------------------------------------------

export function runTimeline(hh: CompleteHousehold, opts: TimelineOptions): TimelineResult {
  const { band, retirementYear, tables, ssParams } = opts;
  const fed = tables.federal;
  const birth = parseYearMonth(hh.birthDate);
  const year0 = parseYearMonth(hh.asOf.slice(0, 7)).year;
  const flags = new Set<string>();

  // ---- Households of two (docs/household-two-spec.md) -----------------------
  const partner = hh.partner ?? null;
  const pBirth = partner ? parseYearMonth(partner.birthDate) : null;
  /** Each person's last year: their plan-to age. The horizon runs to the later one (spec 2.6). */
  const selfLastYear = birth.year + band.planToAge;
  const partnerLastYear = pBirth ? pBirth.year + band.planToAge : selfLastYear;
  const lastYear = Math.max(selfLastYear, partnerLastYear);
  const married = hh.filingStatus === "marriedJoint" || hh.filingStatus === "marriedSeparate";
  if (married && !partner) flags.add("The filing status is married but no partner is entered, so the joint columns apply to one person's income.");
  if (partner && !married) flags.add("A partner is entered but the filing status is not married, so each person's income is taxed on one return with that status.");
  const separateReturns = partner !== null && hh.filingStatus === "marriedSeparate";

  // ---- M2 conventions, policy, and the rules ledger ---------------------
  const m2 = opts.conventions === "m2";
  const policy = opts.policy ?? defaultPolicy();
  const ledger = new RuleLedger(opts.disabledRules ?? []);
  const spendingScale = opts.spendingScale ?? 1;
  const householdSize = hh.drawdown.acaHouseholdSize?.value ?? (partner ? 2 : 1);
  const medicaidExpansion = hh.drawdown.medicaidExpansionState?.value ?? null;
  const reserveMonths = (m2 && policy.limits.cashBufferMonths !== null ? policy.limits.cashBufferMonths : DEFAULTS.reserveMonths);
  /** This year's returns: the band's, or the historical year's when the backtest supplies one (M6). */
  const returnsFor = (year: number) => opts.returnsByYear?.[year] ?? band.returns;
  const rateFor = (a: AssetState, year: number) => (opts.returnsByYear ? blendedRealReturn(a.allocation, returnsFor(year), a.fees) : a.rate);

  // ---- Accounts -----------------------------------------------------------
  const states: AccountState[] = [];
  for (const a of hh.accounts) {
    if (a.side === "asset") states.push(assetState(a, band, year0, hh.plans, hh.drawdown));
    else states.push({ kind: "debt", id: a.id, label: a.name?.value ?? getAccountPreset(a.preset).label, account: a, balance: isAnswered(a.balance) ? a.balance.value : 0 });
  }
  const assets = () => states.filter((s): s is AssetState => s.kind === "asset");
  const debts = () => states.filter((s): s is DebtState => s.kind === "debt");
  const byId = new Map<string, AccountState>(states.map((s) => [s.id, s]));

  const presetOf = (id: string) => hh.accounts.find((a) => a.id === id)?.preset;
  const findAsset = (pred: (a: AssetState) => boolean) => assets().find(pred);
  const ensure = (pred: (a: AssetState) => boolean, id: string, preset: Parameters<typeof implicitAsset>[1], label?: string, owner?: AccountOwner): AssetState => {
    const found = findAsset((a) => pred(a) && (owner === undefined || a.owner === owner));
    if (found) return found;
    const created = implicitAsset(id, preset, band, owner ?? "self");
    if (label) created.label = `${label} (added by the engine)`;
    else if (owner === "partner") created.label = `Partner's ${getAccountPreset(preset).label} (added by the engine)`;
    states.push(created);
    byId.set(id, created);
    flags.add(`The engine added an empty ${label ?? getAccountPreset(preset).label} account because the savings plan needed one.`);
    return created;
  };

  const hasWages = hh.income.some((s) => s.type === "salary" || s.type === "hourly");
  const enteredHsa = hh.income.some((s) => s.preTaxDeductions?.some((d) => d.type === "hsa"));
  const hsaEligible = hh.hsaEligible || enteredHsa;
  const workplaceDeductions = hh.income.some((s) => s.preTaxDeductions?.some((d) => isWorkplaceContribution(d) && d.accountType.value === "traditional"));
  const rothWorkplaceDeductions = hh.income.some((s) => s.preTaxDeductions?.some((d) => isWorkplaceContribution(d) && d.accountType.value === "roth"));
  const anyMatch = hh.income.some((s) => s.employerMatch);
  const coveredByPlan = workplaceDeductions || rothWorkplaceDeductions || anyMatch || hh.plans.length > 0;
  // The partner's side of the same questions (spec 2.3). Their contributions go to their own accounts.
  const pIncome = partner?.income ?? [];
  const pHasWages = pIncome.some((s) => s.type === "salary" || s.type === "hourly");
  const pHsaEligible = partner !== null && (partner.hsaEligible || pIncome.some((s) => s.preTaxDeductions?.some((d) => d.type === "hsa")));
  const pWorkplaceDeductions = pIncome.some((s) => s.preTaxDeductions?.some((d) => isWorkplaceContribution(d) && d.accountType.value === "traditional"));
  const pRothWorkplaceDeductions = pIncome.some((s) => s.preTaxDeductions?.some((d) => isWorkplaceContribution(d) && d.accountType.value === "roth"));
  const pAnyMatch = pIncome.some((s) => s.employerMatch);
  const governmental457 = m2 ? hh.plans.find((pl) => pl.planType === "457bGovernmental") ?? null : null;
  const megaBackdoorPlan = m2 ? hh.plans.find((pl) => pl.megaBackdoorAllowed.value === "yes") ?? null : null;

  // With a partner, the self's accounts are the ones they own; without one, every account is the self's (owner defaults to self).
  const selfOwner: AccountOwner | undefined = partner ? "self" : undefined;
  const workplacePretax = (): AssetState =>
    ensure((a) => presetOf(a.id) === "trad401k" || a.id === "engine:trad401k", "engine:trad401k", "trad401k", undefined, selfOwner);
  const workplaceRoth = (): AssetState =>
    ensure((a) => presetOf(a.id) === "roth401k" || a.id === "engine:roth401k", "engine:roth401k", "roth401k", undefined, selfOwner);
  const rothIra = (): AssetState => ensure((a) => presetOf(a.id) === "rothIRA" || a.id === "engine:rothIRA", "engine:rothIRA", "rothIRA", undefined, selfOwner);
  const tradIra = (): AssetState => ensure((a) => presetOf(a.id) === "tradIRA" || a.id === "engine:tradIRA", "engine:tradIRA", "tradIRA", undefined, selfOwner);
  const hsaAccount = (): AssetState => ensure((a) => a.taxBucket === "hsa", "engine:hsa", "hsa", undefined, selfOwner);
  const taxable = (): AssetState => ensure((a) => a.taxBucket === "taxable", "engine:brokerage", "brokerage");
  // The partner's accounts (spec 2.3).
  const workplacePretaxP = (): AssetState =>
    ensure((a) => presetOf(a.id) === "trad401k" || a.id === "engine:trad401k:partner", "engine:trad401k:partner", "trad401k", undefined, "partner");
  const workplaceRothP = (): AssetState =>
    ensure((a) => presetOf(a.id) === "roth401k" || a.id === "engine:roth401k:partner", "engine:roth401k:partner", "roth401k", undefined, "partner");
  const hsaAccountP = (): AssetState => ensure((a) => a.taxBucket === "hsa", "engine:hsa:partner", "hsa", undefined, "partner");
  const account457 = (): AssetState => {
    const found = findAsset((a) => a.plan?.planType === "457bGovernmental" || a.id === "engine:457b");
    if (found) return found;
    const created = ensure(() => false, "engine:457b", "trad401k", "Governmental 457(b)");
    created.plan = governmental457;
    return created;
  };

  // Create the accounts the plan will need up front so every row has the same columns.
  if (workplaceDeductions || anyMatch) workplacePretax();
  if (hsaEligible) hsaAccount();
  rothIra();
  taxable();
  if (rothWorkplaceDeductions || (hh.savingsStrategy === "maxTaxFreeGrowth" && hasWages)) workplaceRoth();
  if (governmental457 && hasWages) account457();
  if (partner) {
    if (pWorkplaceDeductions || pAnyMatch || (hh.savingsStrategy === "maxTaxSavingsNow" && pHasWages)) workplacePretaxP();
    if (pHsaEligible) hsaAccountP();
    if (pRothWorkplaceDeductions || (hh.savingsStrategy === "maxTaxFreeGrowth" && pHasWages)) workplaceRothP();
  }

  // ---- Pass 1: income by year, for the Social Security earnings record ----
  const planMonth = parseYearMonth(hh.asOf.slice(0, 7)).month;
  const dependentAgesFor = (year: number): Record<string, number> => Object.fromEntries(hh.dependents.map((d) => [d.id, year - parseYearMonth(d.birthDate.value).year]));
  /** Qualifying children at year end (dictionary 9.14): living with the person and under the age given. */
  const childrenUnder = (age: number, year: number): number => hh.dependents.filter((d) => d.livesWithYou.value && year - parseYearMonth(d.birthDate.value).year < age).length;
  /** Head of household needs a qualifying child (under 19 here; students to 24 are not modeled); the year none remains, the return is single. */
  const filingStatusFor = (year: number): FilingStatus => (hh.filingStatus === "headOfHousehold" && childrenUnder(19, year) === 0 ? "single" : hh.filingStatus);
  if (hh.filingStatus === "headOfHousehold" && childrenUnder(19, year0) === 0) flags.add("The filing status is head of household but no qualifying child lives with you, so the plan files single until one does.");
  if (hh.home) flags.add(`Your home (${Math.round(hh.home.value.value).toLocaleString("en-US")}) is not counted in the FI number or the net worth chart; its upkeep reserve is counted as spending.`);
  const ctxFor = (year: number): YearContext => ({
    year,
    t: year - year0,
    age: year - birth.year,
    retirementYear,
    fraction: year === year0 ? stubFraction(hh.asOf) : 1,
    startMonth: year === year0 ? planMonth : 1,
    dependentAges: dependentAgesFor(year),
  });
  const lockFor = (year: number): YearLock => (m2 ? policy.locks[year] ?? {} : {});
  const incomeFor = (y: number): YearIncome => {
    // M1: every stream stops in the retirement year (convention C27). M2: only streams ending at retirement stop;
    // a stream with a date or age end keeps paying (Barista FI, strategy E6), and a year lock can add part-time work.
    const inc = m2 ? incomeForYear(hh.income, ctxFor(y), band) : y >= retirementYear ? emptyIncome() : incomeForYear(hh.income, ctxFor(y), band);
    const extra = lockFor(y).workIncome ?? 0;
    if (extra > 0) {
      inc.streams.push({ id: `lock:${y}`, type: "other", gross: extra, net: extra });
      inc.wages += extra;
      inc.grossTotal += extra;
      inc.netTotal += extra;
    }
    return inc;
  };
  const incomeByYear = new Map<number, YearIncome>();
  const covered: Record<number, number> = {};
  for (let y = year0; y <= lastYear; y++) {
    const inc = incomeFor(y);
    incomeByYear.set(y, inc);
    covered[y] = Math.min(inc.wages + inc.selfEmploymentNet, fed.fica.socialSecurityWageBase);
  }
  // The past is back-filled from this year's entered income whatever retirement year is being tested,
  // so testing "stop now" does not wipe out the earnings record (found by the age-70 edge case, 2026-10-04).
  const incomeNow = incomeForYear(hh.income, { ...ctxFor(year0), retirementYear: Infinity }, band);
  const coveredNow = Math.min(incomeNow.wages + incomeNow.selfEmploymentNet, fed.fica.socialSecurityWageBase);
  // The partner's streams run in the same loop with the partner's age and the household's retirement date (spec 2.3, 2.6).
  const pCtxFor = (year: number): YearContext => ({ ...ctxFor(year), age: pBirth ? year - pBirth.year : 0 });
  const pIncomeFor = (y: number): YearIncome => {
    if (!partner) return emptyIncome();
    return m2 ? incomeForYear(pIncome, pCtxFor(y), band) : y >= retirementYear ? emptyIncome() : incomeForYear(pIncome, pCtxFor(y), band);
  };
  const pIncomeByYear = new Map<number, YearIncome>();
  const pCovered: Record<number, number> = {};
  for (let y = year0; y <= lastYear; y++) {
    const inc = pIncomeFor(y);
    pIncomeByYear.set(y, inc);
    pCovered[y] = Math.min(inc.wages + inc.selfEmploymentNet, fed.fica.socialSecurityWageBase);
  }
  const pIncomeNow = partner ? incomeForYear(pIncome, { ...pCtxFor(year0), retirementYear: Infinity }, band) : emptyIncome();
  const pCoveredNow = Math.min(pIncomeNow.wages + pIncomeNow.selfEmploymentNet, fed.fica.socialSecurityWageBase);

  // ---- Social Security ----------------------------------------------------
  const record = hh.socialSecurity.earningsRecord
    ? Object.values(hh.socialSecurity.earningsRecord.value)
    : estimateEarningsRecord({
        projected: covered,
        birthYear: birth.year,
        firstProjectionYear: year0,
        assumedPastAnnual: coveredNow,
        startAge: DEFAULTS.workStartAge,
      });
  const pia = primaryInsuranceAmount(averageIndexedMonthlyEarnings(record, ssParams), ssParams);
  const claimingAge = (m2 ? policy.claimingAge : null) ?? hh.socialSecurity.claimingAge?.value ?? ssParams.normalRetirementAge(birth.year);
  const factor = claimingFactor(birth.year, claimingAge, ssParams);
  const ssAnnual = hh.socialSecurity.claimZero?.value ? 0 : annualBenefit(pia, factor, band.socialSecurityPolicy);
  const ssOverride = opts.testSettings?.socialSecurityOverride;
  const ssAnnualUsed = ssOverride ? ssOverride.annual : ssAnnual;
  const ssStartYear = ssOverride ? birth.year + ssOverride.fromAge : birth.year + claimingAge.years;
  if (!hh.socialSecurity.earningsRecord) flags.add("Social Security is estimated from your income. Enter your ssa.gov record to sharpen it.");

  // The partner's own record and benefit (spec 2.5). The optimizer's claiming-age knob moves the self only (decision H4).
  const pRecord = partner
    ? partner.socialSecurity.earningsRecord
      ? Object.values(partner.socialSecurity.earningsRecord.value)
      : estimateEarningsRecord({ projected: pCovered, birthYear: pBirth!.year, firstProjectionYear: year0, assumedPastAnnual: pCoveredNow, startAge: DEFAULTS.workStartAge })
    : [];
  const pPia = partner ? primaryInsuranceAmount(averageIndexedMonthlyEarnings(pRecord, ssParams), ssParams) : 0;
  const pClaimingAge = partner ? partner.socialSecurity.claimingAge?.value ?? ssParams.normalRetirementAge(pBirth!.year) : claimingAge;
  const pFactor = partner ? claimingFactor(pBirth!.year, pClaimingAge, ssParams) : 0;
  const pClaimZero = partner?.socialSecurity.claimZero?.value === true;
  const pSsAnnual = partner && !pClaimZero ? annualBenefit(pPia, pFactor, band.socialSecurityPolicy) : 0;
  const pSsStartYear = partner ? pBirth!.year + pClaimingAge.years : Infinity;
  if (partner && !partner.socialSecurity.earningsRecord) flags.add("Your partner's Social Security is estimated from their income. Enter their ssa.gov record to sharpen it.");
  /** Spousal and survivor rules (spec 2.5), read through the one door for an unverified rule. */
  type SpousalRule = {
    spousal: { maxShareOfWorkerPia: number; requiresWorkerClaimed: boolean; delayedCreditsApply: boolean; reductionBeforeOwnFra: SpousalReductionSchedule };
    survivor: SurvivorReductionSchedule & { maxShareOfDeceasedBenefit: number; takesLargerOfTwo: boolean; confirmPending?: boolean };
  };
  const spousal = partner && !ssOverride ? ledger.getUnverified<SpousalRule>("ss.spousalAndSurvivor") : null;
  const SURVIVOR_FLAG = "A survivor Social Security benefit changes this plan. The survivor schedule is verified from secondary sources only (rules registry ss.spousalAndSurvivor; confirm at https://www.ssa.gov/benefits/survivors/), so treat those years as rough until it is confirmed.";
  /**
   * Each person's Social Security for a year (spec 2.5, decision H9): the own benefit; the spousal top-up once both
   * have claimed, up to half the worker's PIA, reduced on the spousal schedule for the claimant's own early
   * claiming and never raised by delayed credits (verified, SSA OACT); and the survivor rule after the first
   * plan-to age, up to 100% of the deceased's benefit including their delayed credits, reduced evenly by month
   * from the survivor's full retirement age (the survivor table) to 71.5% at 60 (secondary sources; flagged until
   * confirmed). The survivor start is a known simplification until mortality is modeled.
   */
  const socialSecurityFor = (y: number): { self: number; partner: number } => {
    const selfAlive = y <= selfLastYear;
    const pAlive = y <= partnerLastYear;
    let s = y >= ssStartYear && selfAlive ? ssAnnualUsed : 0;
    let p = y >= pSsStartYear && pAlive ? pSsAnnual : 0;
    if (!spousal) return { self: s, partner: p };
    const r = spousal.value;
    const share = r.spousal.maxShareOfWorkerPia / 100;
    const bothClaimed = y >= ssStartYear && y >= pSsStartYear;
    if (selfAlive && pAlive && (bothClaimed || !r.spousal.requiresWorkerClaimed)) {
      const selfSpousalFactor = r.spousal.delayedCreditsApply ? factor : spousalFactor(birth.year, claimingAge, r.spousal.reductionBeforeOwnFra, ssParams);
      const partnerSpousalFactor = r.spousal.delayedCreditsApply ? pFactor : spousalFactor(pBirth!.year, pClaimingAge, r.spousal.reductionBeforeOwnFra, ssParams);
      const spousalSelf = y >= ssStartYear && !hh.socialSecurity.claimZero?.value ? annualBenefit(share * pPia, selfSpousalFactor, band.socialSecurityPolicy) : 0;
      const spousalPartner = y >= pSsStartYear && !pClaimZero ? annualBenefit(share * pia, partnerSpousalFactor, band.socialSecurityPolicy) : 0;
      if (spousalSelf > s + 0.5) s = spousalSelf;
      if (spousalPartner > p + 0.5) p = spousalPartner;
    }
    if (r.survivor.takesLargerOfTwo) {
      const survivorShare = r.survivor.maxShareOfDeceasedBenefit / 100;
      if (!selfAlive && pAlive && y >= pSsStartYear && !pClaimZero) {
        const inherited = survivorShare * ssAnnual * survivorFactor(pBirth!.year, pClaimingAge, r.survivor, ssParams);
        if (inherited > p + 0.5) { p = inherited; if (r.survivor.confirmPending) flags.add(SURVIVOR_FLAG); }
      }
      if (!pAlive && selfAlive && y >= ssStartYear && !hh.socialSecurity.claimZero?.value) {
        const inherited = survivorShare * pSsAnnual * survivorFactor(birth.year, claimingAge, r.survivor, ssParams);
        if (inherited > s + 0.5) { s = inherited; if (r.survivor.confirmPending) flags.add(SURVIVOR_FLAG); }
      }
    }
    return { self: s, partner: p };
  };

  // ---- M2 state that carries across years -----------------------------------
  const magiHistory = new Map<number, number>();
  let seppAmount: number | null = null;
  let seppStartYear: number | null = null;
  const separationYearOf = (pl: WorkplacePlan | null, owner: AccountOwner = "self"): number =>
    pl?.separationAge ? (owner === "partner" && pBirth ? pBirth.year : birth.year) + pl.separationAge.value : retirementYear;

  // ---- Pass 2: the annual loop --------------------------------------------
  const rows: YearRow[] = [];
  let firstShortfall: TimelineResult["firstShortfall"] = null;
  let lifetimeTaxes = 0;
  let assetsAtRetirement: number | null = null;

  for (let y = year0; y <= lastYear; y++) {
    const t = y - year0;
    const f = t === 0 ? stubFraction(hh.asOf) : 1;
    const rowFlagsDated: string[] = [];
    const ctx = ctxFor(y);
    const age = ctx.age;
    const retired = y >= retirementYear;
    const filingStatus = filingStatusFor(y);
    if (y > year0 && filingStatus !== filingStatusFor(y - 1)) rowFlagsDated.push("Head of household ends this year: no qualifying child remains, so the return is single from here.");
    if (y > year0 && childrenUnder(17, y) < childrenUnder(17, y - 1)) rowFlagsDated.push("The child tax credit ends this year: a child turns 17.");
    if (y > year0 && childrenUnder(13, y) < childrenUnder(13, y - 1)) rowFlagsDated.push("A child turns 13 this year: childcare that ends at 13 stops, and the dependent care credit with it.");
    const inc = incomeByYear.get(y) ?? emptyIncome();
    const limits = contributionLimits(age, fed);
    const rowFlags: string[] = [...rowFlagsDated];
    const lock = lockFor(y);
    const actions: string[] = [];
    // The partner's side of the year (spec 2.2): their own age and limits; the household's totals add both.
    const pAge = pBirth ? y - pBirth.year : null;
    const pInc = pIncomeByYear.get(y) ?? emptyIncome();
    const pLimits = pAge !== null ? contributionLimits(pAge, fed) : limits;
    const selfAlive = y <= selfLastYear;
    const pAlive = partner !== null && y <= partnerLastYear;
    const incAll: YearIncome = {
      streams: [...inc.streams, ...pInc.streams],
      wages: inc.wages + pInc.wages,
      selfEmploymentNet: inc.selfEmploymentNet + pInc.selfEmploymentNet,
      otherTaxable: inc.otherTaxable + pInc.otherTaxable,
      nonTaxable: inc.nonTaxable + pInc.nonTaxable,
      grossTotal: inc.grossTotal + pInc.grossTotal,
      netTotal: inc.netTotal + pInc.netTotal,
    };
    /** Whose age an account's rules read (spec 2.2): the owner's; joint reads the older for penalties and the younger for required distributions. */
    const ownerAge = (a: AssetState, forRmd = false): number => {
      if (pAge === null) return age;
      if (a.owner === "partner") return pAge;
      if (a.owner === "joint") return forRmd ? Math.min(age, pAge) : Math.max(age, pAge);
      return age;
    };
    const ownerBirthYear = (a: AssetState, forRmd = false): number => (pAge === null ? birth.year : ownerAge(a, forRmd) === age ? birth.year : pBirth!.year);

    // Step 3: entered pre-tax deductions, capped at the legal limits, per person (spec 2.3).
    type Matcher = { gross: number; cap: number; pct: number; employee: number; accountType: "traditional" | "roth" | null };
    type Entered = { workplace: number; rothWorkplace: number; hsa: number; premiums: number; matchers: Matcher[] };
    const enteredFor = (streams: readonly IncomeStream[], yearIncome: YearIncome, lim: ReturnType<typeof contributionLimits>): Entered => {
    let enteredWorkplace = 0;
    let enteredRothWorkplace = 0;
    let enteredHsaAmt = 0;
    let premiumsAndOther = 0;
    const matchers: Matcher[] = [];
    if (!retired) {
      for (const s of streams) {
        const active = yearIncome.streams.find((x) => x.id === s.id);
        if (!active) continue;
        // Workplace contributions are a percent of this stream's pay, in the account type the person chose.
        // M2's contribution-type knob can test the other type (or a split) without changing what is stored.
        let employeeTraditional = 0;
        let employeeRoth = 0;
        for (const d of s.preTaxDeductions ?? []) {
          if (isWorkplaceContribution(d)) {
            const amount = amountFromPercentOfPay(d.percentOfPay.value, active.gross);
            let type: "traditional" | "roth" = d.accountType.value;
            if (m2 && policy.contributionType === "traditional") type = "traditional";
            else if (m2 && policy.contributionType === "roth") type = "roth";
            else if (m2 && policy.contributionType === "split") {
              employeeTraditional += amount / 2;
              employeeRoth += amount / 2;
              continue;
            }
            if (type === "roth") employeeRoth += amount;
            else employeeTraditional += amount;
          } else if (d.type === "hsa") enteredHsaAmt += d.annual.value;
          else premiumsAndOther += d.annual.value;
        }
        const employee = employeeTraditional + employeeRoth;
        enteredWorkplace += employeeTraditional;
        enteredRothWorkplace += employeeRoth;
        if (s.employerMatch) {
          matchers.push({
            gross: active.gross,
            cap: (s.employerMatch.capPercentOfPay.value / 100) * active.gross,
            pct: s.employerMatch.matchPercent.value / 100,
            employee,
            accountType: employee === 0 ? null : employeeTraditional >= employeeRoth ? "traditional" : "roth",
          });
        }
      }
      if (enteredWorkplace + enteredRothWorkplace > lim.workplace) {
        rowFlags.push(`Workplace contributions were capped at the ${y} limit.`);
        enteredWorkplace = Math.min(enteredWorkplace, lim.workplace);
        enteredRothWorkplace = Math.min(enteredRothWorkplace, lim.workplace - enteredWorkplace);
      }
      if (enteredHsaAmt > lim.hsa) enteredHsaAmt = lim.hsa;
    }
    return { workplace: enteredWorkplace, rothWorkplace: enteredRothWorkplace, hsa: enteredHsaAmt, premiums: premiumsAndOther, matchers };
    };
    const enteredSelf = enteredFor(hh.income, inc, limits);
    const enteredPartner = partner ? enteredFor(pIncome, pInc, pLimits) : { workplace: 0, rothWorkplace: 0, hsa: 0, premiums: 0, matchers: [] };
    const enteredWorkplace = enteredSelf.workplace;
    const enteredRothWorkplace = enteredSelf.rothWorkplace;
    const enteredHsaAmt = enteredSelf.hsa;
    const premiumsAndOther = enteredSelf.premiums;
    const matchers = enteredSelf.matchers;
    const pEnteredWorkplace = enteredPartner.workplace;
    const pEnteredRothWorkplace = enteredPartner.rothWorkplace;
    const pEnteredHsaAmt = enteredPartner.hsa;
    const pPremiums = enteredPartner.premiums;
    const pMatchers = enteredPartner.matchers;
    /** The partner's pre-tax payroll deductions: on the joint return, or on their own separate return. */
    const pPretaxEntered = pEnteredWorkplace + pEnteredHsaAmt + pPremiums;
    const pEnteredAll = pPretaxEntered + pEnteredRothWorkplace;

    // Spending, Social Security, scheduled debt payments (annualized).
    const spend = spendingForYear(hh.spending, ctx, retired, band.phases);
    if (hh.home) {
      const reserve = homeReserveAnnual(hh);
      spend.lines.push({ rowId: "home.reserve", category: "accommodation", amount: reserve, phaseMultiplier: 1 });
      spend.total += reserve;
    }
    const careExpenses = spend.lines.filter((l) => l.category === "childcare").reduce((sum, l) => sum + l.amount, 0);
    if (retired && opts.spendingAdjuster) {
      const assetsAtStart = assets().reduce((sum, a) => sum + a.balance, 0);
      const factor = opts.spendingAdjuster({ year: y, age, assetsAtStart, assetsAtRetirement, plannedSpending: spend.total, stocksReturn: returnsFor(y).stocks });
      spend.total *= factor;
    }
    const healthcareSetting = opts.testSettings?.retirementHealthcare;
    const ssSplit = partner ? socialSecurityFor(y) : { self: y >= ssStartYear ? ssAnnualUsed : 0, partner: 0 };
    const ss = ssSplit.self + ssSplit.partner;
    const debtPreview = debts().map((d) => ({
      d,
      r: debtYear({
        balance: d.balance,
        nominalRatePercent: nominalRateFor(d.account, y, ctx.startMonth ?? 1),
        nominalPaymentAnnual: d.account.actualPaymentAnnual.value,
        inflationPercent: band.inflation,
        t,
        fraction: f,
        extraPayment: 0,
      }),
    }));
    const scheduledDebt = debtPreview.reduce((s, x) => s + x.r.scheduled, 0) / f;
    for (const x of debtPreview) if (x.r.paymentBelowInterest && x.d.balance > 0) rowFlags.push(`${x.d.label}: the payment does not cover the interest, so the balance grows.`);

    // ---- M2 year state: what the strategies did this year (annualized) -----
    const m2s = { conversion: 0, harvest: 0, salesGains: 0, penalized: 0, iraDeduction: 0, rmd: 0, sepp: 0, pretaxOrdinary: 0, rothEarnings: 0, hsaOrdinary: 0, rothBasis: 0, rothSeasoned: 0, rothUnseasoned: 0, rothEarningsDrawn: 0 };
    const m2TieOut = opts.testSettings?.m2TieOut;
    let healthcare: HealthcareLine = { total: 0, pieces: [], flags: [] };
    const magiTwoBack = m2 ? magiHistory.get(y - lookbackYears(ledger)) ?? magiHistory.get(year0) ?? 0 : 0;
    const healthcareFor = (magiAca: number): HealthcareLine => {
      if (!retired) return { total: 0, pieces: [], flags: [] };
      if (healthcareSetting) {
        const amount = age < 65 ? healthcareSetting.before65 : healthcareSetting.from65;
        return { total: amount, pieces: [{ label: "Health care (tie-out setting)", amount }], flags: [] };
      }
      if (!m2) return { total: 0, pieces: [], flags: [] };
      if (m2TieOut) {
        // Tie-out convention 7: benchmark less the ACA credit on this year's MAGI before 65 (no out-of-pocket, no Medicaid), flat from 65.
        if (age >= 65) return { total: m2TieOut.from65, pieces: [{ label: "Health care from 65 (tie-out convention)", amount: m2TieOut.from65 }], flags: [] };
        const aca = acaPremiumCredit(magiAca, householdSize, m2TieOut.acaBenchmarkBefore65, ledger, hh.state);
        return { total: aca.netPremium, pieces: [{ label: "Marketplace premium after the credit (tie-out convention)", amount: aca.netPremium }], flags: [], aca };
      }
      if (partner) {
        const persons = [...(selfAlive ? [{ age }] : []), ...(pAlive && pAge !== null ? [{ age: pAge }] : [])];
        if (persons.length === 0) return { total: 0, pieces: [], flags: [] };
        return healthcareLine({ age: persons[0]!.age, magiAca, magiTwoYearsBack: magiTwoBack, householdSize, filingStatus: hh.filingStatus, medicaidExpansion, ledger, persons, state: hh.state });
      }
      return healthcareLine({ age, magiAca, magiTwoYearsBack: magiTwoBack, householdSize, filingStatus: hh.filingStatus, medicaidExpansion, ledger, state: hh.state });
    };
    healthcare = healthcareFor(magiHistory.get(y - 1) ?? 0);
    const spendTotal = () => spend.total * spendingScale + healthcare.total;

    // Taxes as a function of the pre-tax extras and the taxable withdrawals.
    type TaxView = { fedR: FederalTaxResult | FederalTaxM2Result; stR: StateTaxResult; total: number; marginal: number; agi: number };
    /** Adds a second return to the first: every dollar field is summed; rates and room stay the first return's (spec 2.4). */
    const addReturn = <T extends FederalTaxResult | FederalTaxM2Result>(a: T, b: T): T => {
      const out = { ...a } as Record<string, number>;
      for (const k of Object.keys(out)) {
        if (k === "marginalRate" || k === "ordinaryRoom" || k === "zeroPercentGainRoom") continue;
        out[k] = (a as unknown as Record<string, number>)[k]! + (b as unknown as Record<string, number>)[k]!;
      }
      return out as unknown as T;
    };
    /**
     * Taxes as a function of the pre-tax extras and the taxable withdrawals. `pExtra` is the partner's
     * waterfall contribution. Filing jointly: one return on both incomes. Filing separately: two returns,
     * the partner's on their own earned income and benefit, the self's on everything else.
     */
    /** State departures from federal AGI (rule `state.PA.compensation`, dictionary 9.15): PA taxes workplace deferrals and allows no half-SE deduction, and its municipalities levy an earned income tax. */
    const stateAdjustmentsFor = (workplaceDeferrals: number, halfSe: number): StateAdjustments => {
      const base = inc.wages + inc.selfEmploymentNet + pInc.wages + pInc.selfEmploymentNet;
      if (hh.state === "PA") {
        const got = ledger.getUnverified<{ retirementDeferralsTaxable: boolean; halfSelfEmploymentTaxDeductible: boolean; localEarnedIncomeTax: { defaultPercent: number } }>("state.PA.compensation");
        if (!got.verified) flags.add("Pennsylvania's treatment of 401(k) contributions and the local earned income tax come from a rule not yet confirmed at its source.");
        const r = got.value;
        return { addBack: (r.retirementDeferralsTaxable ? workplaceDeferrals : 0) + (r.halfSelfEmploymentTaxDeductible ? 0 : halfSe), localTaxPercent: hh.localTaxPercent ?? r.localEarnedIncomeTax.defaultPercent, localBase: base };
      }
      return { addBack: 0, localTaxPercent: hh.localTaxPercent ?? 0, localBase: base };
    };
    const taxesFor = (pretaxExtra: number, hsaExtra: number, pretaxWithdrawal: number, iraExtra = 0, pExtra = 0): TaxView => {
      const selfDeductions = enteredWorkplace + enteredHsaAmt + premiumsAndOther + pretaxExtra + hsaExtra;
      const partnerFields = partner && !separateReturns ? { partnerWages: pInc.wages, partnerSelfEmploymentNet: pInc.selfEmploymentNet } : {};
      const jointPartnerDeductions = partner && !separateReturns ? pPretaxEntered + pExtra : 0;
      const jointPartnerOther = partner && !separateReturns ? pInc.otherTaxable : 0;
      if (!m2) {
        let fedR = computeFederalTax(
          {
            filingStatus: hh.filingStatus,
            wages: inc.wages,
            pretaxPayrollDeductions: selfDeductions + jointPartnerDeductions,
            selfEmploymentNet: inc.selfEmploymentNet,
            otherOrdinaryIncome: inc.otherTaxable + jointPartnerOther + pretaxWithdrawal,
            earlyWithdrawals: age < DEFAULTS.penaltyFreeAge ? pretaxWithdrawal : 0,
            ...partnerFields,
          },
          fed,
        );
        let stR = computeStateTax(fedR.agi, hh.state, hh.filingStatus, tables);
        if (separateReturns) {
          const fedP = computeFederalTax(
            { filingStatus: hh.filingStatus, wages: pInc.wages, pretaxPayrollDeductions: pPretaxEntered + pExtra, selfEmploymentNet: pInc.selfEmploymentNet, otherOrdinaryIncome: pInc.otherTaxable, earlyWithdrawals: 0 },
            fed,
          );
          const stP = computeStateTax(fedP.agi, hh.state, hh.filingStatus, tables);
          fedR = addReturn(fedR, fedP);
          stR = { ...stR, tax: stR.tax + stP.tax };
        }
        return { fedR, stR, total: fedR.total + stR.tax, marginal: (fedR.marginalRate + stR.marginalRate) / 100, agi: fedR.agi };
      }
      let fedR = computeFederalTaxM2(
        {
          year: y,
          age,
          filingStatus,
          wages: inc.wages,
          pretaxPayrollDeductions: selfDeductions + jointPartnerDeductions,
          selfEmploymentNet: inc.selfEmploymentNet,
          otherOrdinaryIncome: inc.otherTaxable + jointPartnerOther + pretaxWithdrawal + m2s.rothEarnings + m2s.hsaOrdinary,
          rothConversions: m2s.conversion,
          socialSecurity: separateReturns ? ssSplit.self : ss,
          longTermGains: m2s.salesGains + m2s.harvest,
          penalized: m2s.penalized,
          iraDeduction: m2s.iraDeduction + iraExtra,
          ...partnerFields,
          ...(partner && !separateReturns && pAge !== null && pAlive ? { partnerAge: pAge } : {}),
          qualifyingChildren: childrenUnder(17, y),
          careChildren: childrenUnder(13, y),
          careExpenses,
        },
        fed,
        ledger,
      );
      if (fedR.creditsUnverified) flags.add("The dependent care credit comes from a rule not yet confirmed at its source (its 2026 phase-down).");
      let stR = computeStateTax(fedR.agi, hh.state, filingStatus, tables, stateAdjustmentsFor(enteredWorkplace + pretaxExtra - amount457 + jointPartnerDeductions, fed.selfEmployment.halfDeductibleFromIncome ? fedR.selfEmploymentTax / 2 : 0));
      if (separateReturns && pAge !== null) {
        const fedP = computeFederalTaxM2(
          {
            year: y,
            age: pAge,
            filingStatus,
            wages: pInc.wages,
            pretaxPayrollDeductions: pPretaxEntered + pExtra,
            selfEmploymentNet: pInc.selfEmploymentNet,
            otherOrdinaryIncome: pInc.otherTaxable,
            rothConversions: 0,
            socialSecurity: ssSplit.partner,
            longTermGains: 0,
            penalized: 0,
            iraDeduction: 0,
          },
          fed,
          ledger,
        );
        const stP = computeStateTax(fedP.agi, hh.state, filingStatus, tables);
        fedR = addReturn(fedR, fedP);
        stR = { ...stR, tax: stR.tax + stP.tax };
      }
      return { fedR, stR, total: fedR.total + stR.tax + stR.local, marginal: (fedR.marginalRate + stR.marginalRate) / 100, agi: fedR.agi };
    };
    const m2Tax = (v: TaxView): FederalTaxM2Result => v.fedR as FederalTaxM2Result;
    const cashIn = (pretaxExtra: number, hsaExtra: number, pretaxWithdrawal: number, iraExtra = 0, pExtra = 0) =>
      incAll.netTotal - enteredWorkplace - enteredRothWorkplace - enteredHsaAmt - premiumsAndOther - pEnteredAll - pretaxExtra - hsaExtra - iraExtra - pExtra - taxesFor(pretaxExtra, hsaExtra, pretaxWithdrawal, iraExtra, pExtra).total + ss;

    // Step 8: surplus or shortfall.
    let pretaxExtra = 0;
    let rothWorkplace = 0;
    let hsaExtra = 0;
    let iraExtra = 0;
    let rothIraAmt = 0;
    let taxableAmt = 0;
    let megaBackdoorAmt = 0;
    let amount457 = 0;
    /** The partner's waterfall contributions: traditional and Roth workplace (spec 2.3, self first then partner). */
    let pPretaxExtra = 0;
    let pRothWorkplace = 0;
    const debtExtra = new Map<string, number>();
    const withdrawals = new Map<string, number>();
    let pretaxWithdrawal = 0;
    let shortfall = 0;
    let reserveDrawn = 0;
    let rothAfter = new Map<string, RothLayer>();
    let receiptsUsed = new Map<string, number>();
    let basisAfter = new Map<string, number>();
    let conversionTo: AssetState | null = null;
    let conversionFrom: AssetState | null = null;

    const gap0 = cashIn(0, 0, 0) - spendTotal() - scheduledDebt;
    const steps: WaterfallStep[] = [];

    if (gap0 >= 0 && !retired) {
      let remaining = gap0;
      // The top-up applies only where the elected percent is below the match cap, and it goes to the
      // same account type as the existing contribution. With no contribution yet, the strategy decides.
      const fallbackType = hh.savingsStrategy === "maxTaxFreeGrowth" ? "roth" : "traditional";
      let matchRoomTraditional = 0;
      let matchRoomRoth = 0;
      for (const m of matchers) {
        const room = Math.max(0, m.cap - m.employee);
        if ((m.accountType ?? fallbackType) === "roth") matchRoomRoth += room;
        else matchRoomTraditional += room;
      }
      let pMatchRoomTraditional = 0;
      let pMatchRoomRoth = 0;
      for (const m of pMatchers) {
        const room = Math.max(0, m.cap - m.employee);
        if ((m.accountType ?? fallbackType) === "roth") pMatchRoomRoth += room;
        else pMatchRoomTraditional += room;
      }

      /** A pre-tax step with the tax-savings loop and the exact final step (E10). */
      const pretaxStep = (room: number, into: "workplace" | "hsa" | "ira" | "457b" | "partnerWorkplace", name: string) => {
        if (room <= 0 || remaining <= 0) return;
        const current = (x: number) =>
          into === "workplace" || into === "457b"
            ? taxesFor(pretaxExtra + x, hsaExtra, 0, iraExtra, pPretaxExtra)
            : into === "hsa"
              ? taxesFor(pretaxExtra, hsaExtra + x, 0, iraExtra, pPretaxExtra)
              : into === "partnerWorkplace"
                ? taxesFor(pretaxExtra, hsaExtra, 0, iraExtra, pPretaxExtra + x)
                : taxesFor(pretaxExtra, hsaExtra, 0, iraExtra + x, pPretaxExtra);
        const taxNow = current(0).total;
        const saved = (x: number) => taxNow - current(x).total;
        let x = Math.min(room, remaining);
        for (let i = 0; i < 50; i++) {
          const next = Math.min(room, remaining + saved(x));
          const done = Math.abs(next - x) < 1 || next >= room;
          x = next;
          if (done) break;
        }
        if (x < room) {
          const m = current(x).marginal;
          x = Math.min(room, (remaining + saved(x) - m * x) / (1 - m));
        }
        x = Math.max(0, x);
        // Measure the tax saved before moving the extras, or the saving is counted twice.
        const taxSaved = saved(x);
        if (into === "workplace") pretaxExtra += x;
        else if (into === "partnerWorkplace") pPretaxExtra += x;
        else if (into === "457b") {
          pretaxExtra += x;
          amount457 += x;
        } else if (into === "hsa") hsaExtra += x;
        else iraExtra += x;
        remaining = remaining + taxSaved - x;
        steps.push({ step: name, amount: x, taxSaved, remainingAfter: remaining });
      };
      const afterTaxStep = (room: number, name: string): number => {
        const x = Math.max(0, Math.min(room, remaining));
        remaining -= x;
        if (x > 0) steps.push({ step: name, amount: x, taxSaved: 0, remainingAfter: remaining });
        return x;
      };

      // Step 1: capture the full employer match.
      const enteredTotal = enteredWorkplace + enteredRothWorkplace;
      if (matchRoomTraditional > 0) pretaxStep(Math.min(matchRoomTraditional, limits.workplace - enteredTotal), "workplace", "1. Employer match (traditional)");
      if (matchRoomRoth > 0) rothWorkplace += afterTaxStep(Math.min(matchRoomRoth, limits.workplace - enteredTotal - pretaxExtra), "1. Employer match (Roth 401(k))");
      const pEnteredTotal = pEnteredWorkplace + pEnteredRothWorkplace;
      if (pMatchRoomTraditional > 0) pretaxStep(Math.min(pMatchRoomTraditional, pLimits.workplace - pEnteredTotal), "partnerWorkplace", "1. Partner's employer match (traditional)");
      if (pMatchRoomRoth > 0) pRothWorkplace += afterTaxStep(Math.min(pMatchRoomRoth, pLimits.workplace - pEnteredTotal - pPretaxExtra), "1. Partner's employer match (Roth 401(k))");
      // Step 2: debts above the high-interest threshold, to payoff.
      for (const x of debtPreview) {
        if (x.d.balance <= 0 || nominalRateFor(x.d.account, y, ctx.startMonth ?? 1) <= DEFAULTS.highInterest) continue;
        const payoffRoom = Math.max(0, (x.d.balance * Math.pow(1 + 0, 1)) - x.r.scheduled / f);
        const extra = afterTaxStep(payoffRoom, `2. High-interest debt: ${x.d.label}`);
        if (extra > 0) debtExtra.set(x.d.id, extra);
      }
      // Steps 3 to 8 by strategy.
      const workplaceRoom = () => Math.max(0, limits.workplace - enteredWorkplace - enteredRothWorkplace - (pretaxExtra - amount457) - rothWorkplace);
      const pWorkplaceRoom = () => (partner && pHasWages ? Math.max(0, pLimits.workplace - pEnteredWorkplace - pEnteredRothWorkplace - pPretaxExtra - pRothWorkplace) : 0);
      const hsaRoom = () => (hsaEligible ? Math.max(0, limits.hsa - enteredHsaAmt - hsaExtra) : 0);
      /** M2: the governmental 457(b) has its own limit, separate from the 401(k) (rule limits.457b.2026). */
      const room457 = (): number => {
        if (!governmental457 || !hasWages) return 0;
        const r = ledger.get<{ limit: number; catchUp50: number; superCatchUp60to63: number }>("limits.457b.2026");
        const limit = r.limit + (age >= 60 && age <= 63 ? r.superCatchUp60to63 : age >= 50 ? r.catchUp50 : 0);
        return Math.max(0, limit - amount457);
      };
      /** M2: a traditional IRA contribution is deductible below the phase-out (rule limits.iraDeductionPhaseout.2026). */
      const iraDeductibleShare = (): number => {
        if (!m2 || m2TieOut) return 0;
        const r = ledger.get<{ coveredByWorkplacePlan: Record<FilingStatus, [number, number]> }>("limits.iraDeductionPhaseout.2026");
        if (!coveredByPlan) return 1;
        const [lo, hi] = r.coveredByWorkplacePlan[hh.filingStatus];
        const magi = taxesFor(pretaxExtra, hsaExtra, 0, iraExtra).agi;
        if (magi <= lo) return 1;
        if (magi >= hi) return 0;
        return (hi - magi) / (hi - lo);
      };
      /** M2: after-tax 401(k) room up to the total additions limit, converted to Roth in plan (strategy E3). */
      const megaRoom = (): number => {
        if (!megaBackdoorPlan || !hasWages) return 0;
        const r = ledger.get<{ limit: number }>("limits.totalAdditions.2026");
        const matchNow = matchers.reduce((sum, m) => sum + Math.min(m.employee + pretaxExtra + rothWorkplace, m.cap) * m.pct, 0);
        return Math.max(0, r.limit - (enteredWorkplace + enteredRothWorkplace + (pretaxExtra - amount457) + rothWorkplace + matchNow + megaBackdoorAmt));
      };
      switch (hh.savingsStrategy) {
        case "maxTaxSavingsNow":
          pretaxStep(hsaRoom(), "hsa", "3. HSA");
          if (hasWages) pretaxStep(workplaceRoom(), "workplace", "4. Traditional 401(k) to the limit");
          if (partner) pretaxStep(pWorkplaceRoom(), "partnerWorkplace", "4. Partner's traditional 401(k) to the limit");
          if (m2) pretaxStep(room457(), "457b", "5. Governmental 457(b) to its limit");
          if (m2 && iraDeductibleShare() >= 0.999) pretaxStep(limits.ira, "ira", "6. Traditional IRA (deductible)");
          else rothIraAmt += afterTaxStep(limits.ira, "6. Roth IRA");
          if (m2) megaBackdoorAmt += afterTaxStep(megaRoom(), "7. Mega backdoor Roth");
          taxableAmt += afterTaxStep(Infinity, "8. Taxable brokerage");
          break;
        case "maxTaxFreeGrowth":
          pretaxStep(hsaRoom(), "hsa", "3. HSA");
          rothIraAmt += afterTaxStep(limits.ira, "4. Roth IRA");
          if (hasWages) rothWorkplace += afterTaxStep(workplaceRoom(), "5. Roth 401(k) to the limit");
          if (partner) pRothWorkplace += afterTaxStep(pWorkplaceRoom(), "5. Partner's Roth 401(k) to the limit");
          if (m2) pretaxStep(room457(), "457b", "6. Governmental 457(b) to its limit");
          if (m2) megaBackdoorAmt += afterTaxStep(megaRoom(), "7. Mega backdoor Roth");
          taxableAmt += afterTaxStep(Infinity, "8. Taxable brokerage");
          break;
        case "enteredOnly":
          rothIraAmt += afterTaxStep(limits.ira, "Roth IRA");
          taxableAmt += afterTaxStep(Infinity, "Taxable brokerage");
          break;
      }
      if (iraExtra > 0) m2s.iraDeduction = iraExtra;
      if (rothIraAmt > 0) {
        const phase = m2
          ? ledger.get<Record<FilingStatus, [number, number]>>("limits.rothIraIncome.2026")[hh.filingStatus]
          : fed.contributionLimits.rothIraPhaseOut[hh.filingStatus];
        if (phase && taxesFor(pretaxExtra, hsaExtra, 0, iraExtra, pPretaxExtra).agi > phase[0]) rowFlags.push("Income is above the Roth IRA limit; the contribution assumes a backdoor Roth.");
      }
    } else if (gap0 >= 0 && retired && !m2) {
      // A surplus in retirement (Social Security above spending) goes to taxable.
      taxableAmt = gap0;
      steps.push({ step: "Retirement surplus to taxable", amount: gap0, taxSaved: 0, remainingAfter: 0 });
    } else if (!m2) {
      // Shortfall: withdraw in the M1 order. Pretax withdrawals are taxable, so iterate.
      const order: AssetState[] = [
        ...assets().filter((a) => a.taxBucket === "cash"),
        ...assets().filter((a) => a.taxBucket === "taxable"),
        ...assets().filter((a) => a.taxBucket === "pretax"),
        // Among Roth accounts, the higher fee is drawn first (so a Roth 401(k) goes before a Roth IRA).
        ...assets().filter((a) => a.taxBucket === "roth").sort((a, b) => b.fees - a.fees),
        ...assets().filter((a) => a.taxBucket === "hsa"),
      ];
      // The cash reserve is a set number of months of this year's spending, in dollars.
      const reserve = (reserveMonths / 12) * spendTotal();
      const cashAccounts = order.filter((a) => a.taxBucket === "cash");
      for (let i = 0; i < 100; i++) {
        withdrawals.clear();
        let need = -(cashIn(0, 0, pretaxWithdrawal) - spendTotal() - scheduledDebt);
        let pretaxTaken = 0;
        let cashReserveLeft = reserve;
        for (const a of order) {
          if (need <= 0) break;
          let available = a.balance;
          if (a.taxBucket === "cash") {
            const keep = Math.min(available, cashReserveLeft);
            cashReserveLeft -= keep;
            available -= keep;
          }
          const capacity = available / f;
          const w = Math.max(0, Math.min(capacity, need));
          if (w > 0) {
            withdrawals.set(a.id, w);
            need -= w;
            if (a.taxBucket === "pretax") pretaxTaken += w;
          }
        }
        // Last resort, after every other account: the reserve itself.
        reserveDrawn = 0;
        for (const a of cashAccounts) {
          if (need <= 0) break;
          const already = withdrawals.get(a.id) ?? 0;
          const w = Math.max(0, Math.min(a.balance / f - already, need));
          if (w > 0) {
            withdrawals.set(a.id, already + w);
            reserveDrawn += w;
            need -= w;
          }
        }
        shortfall = Math.max(0, need);
        if (Math.abs(pretaxTaken - pretaxWithdrawal) < 0.01) {
          pretaxWithdrawal = pretaxTaken;
          break;
        }
        pretaxWithdrawal = pretaxTaken;
      }
      if (pretaxWithdrawal > 0 && age < DEFAULTS.penaltyFreeAge) rowFlags.push("Pretax withdrawals before 59 and a half pay the 10% penalty in M1.");
      const rothDrawn = assets().some((a) => a.taxBucket === "roth" && (withdrawals.get(a.id) ?? 0) > 0);
      if (rothDrawn && age < DEFAULTS.penaltyFreeAge) flags.add(EARLY_ROTH_FLAG);
    }

    // ---- M2: every retired year, and any working year short of cash. Strategies first (retired only), then the shortfall at full tax depth ----
    if (m2 && (retired || gap0 < 0)) {
      const penaltyFree = age >= DEFAULTS.penaltyFreeAge;
      const pretaxAccounts = () => assets().filter((a) => a.taxBucket === "pretax");
      const planOf = (a: AssetState): WorkplacePlan | null => a.plan ?? (a.id === "engine:trad401k" || presetOf(a.id) === "trad401k" ? hh.plans[0] ?? null : null);
      /** Whether a pretax draw from this account owes the 10% additional tax this year. */
      const penaltyOn = (a: AssetState): boolean => {
        if (ownerAge(a) >= DEFAULTS.penaltyFreeAge) return false;
        const pl = planOf(a);
        if (pl?.planType === "457bGovernmental" && governmental457bPenaltyFree(y, separationYearOf(pl, a.owner), ledger)) return false;
        if (policy.ruleOf55 && pl && pl.ruleOf55Allowed.value === "yes" && presetOf(a.id) !== "tradIRA" && a.id !== "engine:tradIRA") {
          const sepYear = separationYearOf(pl, a.owner);
          if (ruleOf55Applies(sepYear - ownerBirthYear(a), ownerAge(a), y, sepYear, ledger)) return false;
        }
        return true;
      };

      // 1. Required minimum distributions, from each pretax account's balance at the start of the year, by the owner's age.
      const rmdBy = new Map<string, number>();
      for (const a of pretaxAccounts()) {
        const r = requiredMinimumDistribution(a.balance, ownerAge(a, true), ownerBirthYear(a, true), ledger) / f;
        if (r > 0) {
          rmdBy.set(a.id, Math.min(r, a.balance / f));
          m2s.rmd += rmdBy.get(a.id)!;
        }
      }
      if (m2s.rmd > 0) actions.push(`The required minimum distribution is about ${Math.round(m2s.rmd * f).toLocaleString("en-US")}.`);

      // 2. 72(t) payments, sized once at the start and held level (the RMD method is resized each year).
      let seppThisYear = 0;
      if (retired && policy.sepp && age >= policy.sepp.startAge && !penaltyFree) {
        const source = pretaxAccounts().sort((a, b) => b.balance - a.balance)[0];
        if (source && source.balance > 0) {
          if (seppStartYear === null) {
            seppStartYear = y;
            const rate = Math.min(policy.sepp.interestRatePercent, seppMaxRate(policy.sepp.federalMidTermRatePercent, ledger));
            seppAmount = seppPayment({ balance: source.balance, age, method: policy.sepp.method, interestRatePercent: rate }, ledger);
            if (policy.sepp.method === "fixedAnnuitization") rowFlags.push("The 72(t) annuitization payment is approximated with the single life table; the IRS mortality table is not loaded yet.");
          }
          const yearsIn = y - seppStartYear;
          const required = seppYearsRequired(policy.sepp.startAge, DEFAULTS.penaltyFreeAge);
          const allowed = policy.limits.maxSeppYears === null ? required : Math.max(required, policy.limits.maxSeppYears);
          if (yearsIn < allowed) {
            seppThisYear = policy.sepp.method === "rmd" ? seppPayment({ balance: source.balance, age, method: "rmd", interestRatePercent: 0 }, ledger) : seppAmount!;
            seppThisYear = Math.min(seppThisYear / f, source.balance / f - (rmdBy.get(source.id) ?? 0));
            if (seppThisYear > 0) {
              rmdBy.set(source.id, (rmdBy.get(source.id) ?? 0) + seppThisYear);
              m2s.sepp = seppThisYear;
              actions.push(`The 72(t) payment of about ${Math.round(seppThisYear * f).toLocaleString("en-US")} comes from the ${source.label}, penalty free.`);
            }
          }
        }
      }

      // 3. The MAGI budget for the ACA (a target, the cliff limit, or an IRMAA cap), shared by conversions and harvests.
      const acaTarget = lock.acaTarget ?? policy.acaTarget;
      let magiBudget = Infinity;
      const youngestLiving = Math.min(selfAlive || !partner ? age : Infinity, pAlive && pAge !== null ? pAge : Infinity);
      if (youngestLiving < 65) {
        if (acaTarget !== "off") magiBudget = Math.min(magiBudget, magiForPctFpl(acaTarget, householdSize, ledger, hh.state));
        else if (policy.limits.stayUnderAcaCliff) magiBudget = Math.min(magiBudget, magiForPctFpl(400, householdSize, ledger, hh.state));
      }
      if (policy.limits.irmaaTierCap !== null && Math.max(age, pAge ?? 0) >= 63) {
        const tiers = ledger.get<{ tiers: { single: [number | null, number | null]; marriedJoint: [number | null, number | null] }[] }>("health.irmaa.2026").tiers;
        const top = tiers[policy.limits.irmaaTierCap]?.[hh.filingStatus === "marriedJoint" ? "marriedJoint" : "single"][1];
        if (top != null) magiBudget = Math.min(magiBudget, top);
      }

      // 4. Roth conversions are sized inside the shortfall loop below, once the year's sales gains are known,
      //    so the ACA budget and the bracket targets see the whole picture.
      const forcedPretax = [...rmdBy.values()].reduce((a, b) => a + b, 0);
      const conversionSource = pretaxAccounts().sort((a, b) => b.balance - a.balance)[0];
      const wantsConversion = retired && !!conversionSource && (lock.conversion !== undefined || policy.conversionTarget !== "none");
      const sizeConversion = (): number => {
        if (!wantsConversion || !conversionSource) return 0;
        m2s.conversion = 0;
        // "Other income" includes the pretax dollars the year's shortfall draws (last pass), so a conversion never claims
        // MAGI room that the withdrawals already use (strategy C1). Fixed 2026-10-04 in the M2 tie-out.
        const before = m2Tax(taxesFor(0, 0, Math.max(forcedPretax, pretaxWithdrawal)));
        let want = 0;
        if (lock.conversion !== undefined) want = lock.conversion;
        else {
          const toBracket = (rate: number) => before.ordinaryRoom + Math.max(0, bracketTop(rate, hh.filingStatus, ledger) - before.ordinaryTaxableIncome);
          switch (policy.conversionTarget) {
            case "fillStandardDeduction": want = before.ordinaryRoom; break;
            case "fill10": want = toBracket(10); break;
            case "fill12": want = toBracket(12); break;
            case "fill22": want = toBracket(22); break;
            case "fillToAcaTarget": want = Infinity; break;
            case "fillToIrmaaTier": want = Infinity; break;
            default: want = 0;
          }
          if (Number.isFinite(magiBudget)) want = Math.min(want, Math.max(0, magiBudget - before.magiAca));
          if (!Number.isFinite(want)) want = 0;
        }
        const available = conversionSource.balance / f - (rmdBy.get(conversionSource.id) ?? 0);
        return Math.max(0, Math.min(want, available));
      };

      // 5. The shortfall, drawn in the policy's order at full tax depth. Iterate until the taxes settle.
      // Tie-out convention 10: the reserve counts the M1 health care placeholder, not the computed line.
      const reserve = m2TieOut
        ? (reserveMonths / 12) * (spend.total * spendingScale + (retired ? (age < 65 ? m2TieOut.reserveHealthcarePlaceholder.before65 : m2TieOut.reserveHealthcarePlaceholder.from65) : 0))
        : (reserveMonths / 12) * spendTotal();
      const byBucket = (b: TaxBucket) => assets().filter((a) => a.taxBucket === b);
      const rothSorted = () => byBucket("roth").sort((a, b) => b.fees - a.fees);
      /** An entry in the withdrawal order: an account, and for a Roth drawn in two stages the cap on the first stage. */
      type OrderEntry = { a: AssetState; cap: ((a: AssetState) => number) | null };
      const plain = (list: AssetState[]): OrderEntry[] => list.map((a) => ({ a, cap: null }));
      /** The Roth ladder's access order: contributions and conversions come out before pretax, earnings after. */
      const rothLayersCap = (a: AssetState): number => {
        const layers = rothAfter.get(a.id) ?? a.roth;
        return layers ? layers.basis + layers.conversions.reduce((sum, c) => sum + c.amount, 0) : 0;
      };
      const baseOrder = (): OrderEntry[] => {
        const conventional = plain([...byBucket("cash"), ...byBucket("taxable"), ...byBucket("pretax"), ...rothSorted(), ...byBucket("hsa")]);
        if (policy.withdrawalOrder === "bracketBased") return plain([...byBucket("cash"), ...byBucket("pretax"), ...byBucket("taxable"), ...rothSorted(), ...byBucket("hsa")]);
        if (policy.withdrawalOrder === "rothLayersFirst") {
          return [...plain([...byBucket("cash"), ...byBucket("taxable")]), ...rothSorted().map((a) => ({ a, cap: rothLayersCap })), ...plain(byBucket("pretax")), ...plain(rothSorted()), ...plain(byBucket("hsa"))];
        }
        return conventional;
      };
      let order = baseOrder();
      if (lock.withdrawFirst) order = [...plain(byBucket(lock.withdrawFirst)), ...order.filter((e) => e.a.taxBucket !== lock.withdrawFirst)];
      const cashAccounts = byBucket("cash");
      const harvestWanted = !retired ? 0 : lock.harvest !== undefined ? lock.harvest : policy.gainHarvesting === "fillZeroBracket" ? Infinity : 0;
      let lastTotal = -1;
      pretaxWithdrawal = forcedPretax;
      for (let i = 0; i < 100; i++) {
        withdrawals.clear();
        rothAfter = new Map();
        receiptsUsed = new Map();
        basisAfter = new Map();
        const trial = { salesGains: 0, penalized: 0, rothEarnings: 0, hsaOrdinary: 0, pretaxOrdinary: forcedPretax, rothBasis: 0, rothSeasoned: 0, rothUnseasoned: 0, rothEarningsDrawn: 0 };
        // The conversion is sized with last pass's sales gains and Roth earnings still counted, then those are reset for this pass.
        m2s.conversion = sizeConversion();
        // The need is grossed up for last pass's taxes on the withdrawals themselves (pretax draws, realized gains, Roth earnings,
        // penalties, the conversion), so taxes are paid from the accounts and settle across passes (M1 tie-out convention 9;
        // fixed 2026-10-04 in the M2 tie-out: before this the year's withdrawal taxes were owed but never drawn).
        let need = -(cashIn(0, 0, pretaxWithdrawal) - spendTotal() - scheduledDebt) - forcedPretax;
        m2s.salesGains = 0;
        m2s.penalized = 0;
        m2s.rothEarnings = 0;
        m2s.hsaOrdinary = 0;
        // Forced pretax income first (RMDs and 72(t)), then what is still needed.
        for (const [id, amt] of rmdBy) withdrawals.set(id, amt);
        const taxView = () => {
          m2s.salesGains = trial.salesGains;
          m2s.penalized = trial.penalized;
          m2s.rothEarnings = trial.rothEarnings;
          m2s.hsaOrdinary = trial.hsaOrdinary;
          m2s.rothBasis = trial.rothBasis;
          m2s.rothSeasoned = trial.rothSeasoned;
          m2s.rothUnseasoned = trial.rothUnseasoned;
          m2s.rothEarningsDrawn = trial.rothEarningsDrawn;
          return taxesFor(0, 0, trial.pretaxOrdinary);
        };
        let cashReserveLeft = reserve;
        const bracketTopTaxable = policy.withdrawalOrder === "bracketBased" ? bracketTop(12, hh.filingStatus, ledger) : Infinity;
        const takeFrom = (a: AssetState, w: number) => {
          if (w <= 0) return;
          withdrawals.set(a.id, (withdrawals.get(a.id) ?? 0) + w);
          need -= w;
          if (a.taxBucket === "taxable") {
            const basisNow = basisAfter.get(a.id) ?? a.basis;
            const share = a.balance > 0 ? Math.min(1, basisNow / a.balance) : 1;
            trial.salesGains += w * (1 - share);
            basisAfter.set(a.id, basisNow - w * share);
          } else if (a.taxBucket === "pretax") {
            trial.pretaxOrdinary += w;
            if (penaltyOn(a)) trial.penalized += w;
          } else if (a.taxBucket === "roth" && a.roth) {
            const d = drawRoth(w, a.balance / f, rothAfter.get(a.id) ?? a.roth, y, ownerAge(a), DEFAULTS.penaltyFreeAge, ledger);
            trial.penalized += d.penalizedConversions;
            // Qualified distributions (59 and a half and the five-year clock) are tax free; only unqualified earnings are ordinary income.
            // Fixed 2026-10-04 in the M2 tie-out: before this, qualified earnings were taxed as ordinary income.
            if (!d.earningsQualified) trial.rothEarnings += d.earnings;
            trial.rothEarningsDrawn += d.earnings;
            trial.rothBasis += d.fromBasis;
            trial.rothSeasoned += d.seasonedConversions;
            trial.rothUnseasoned += d.penalizedConversions;
            if (d.earningsPenalized) trial.penalized += d.earnings;
            rothAfter.set(a.id, d.after);
          } else if (a.taxBucket === "hsa") {
            const used = receiptsUsed.get(a.id) ?? 0;
            const fromReceipts = Math.min(w, Math.max(0, a.receipts - used));
            receiptsUsed.set(a.id, used + fromReceipts);
            trial.hsaOrdinary += w - fromReceipts;
          }
        };
        const proportional = policy.withdrawalOrder === "proportional" && !lock.withdrawFirst;
        if (proportional && need > 0) {
          const pool = [...byBucket("taxable"), ...byBucket("pretax"), ...rothSorted()].filter((a) => a.balance > 0 && !(policy.limits.neverPayPenalty && a.taxBucket === "pretax" && penaltyOn(a)));
          const total = pool.reduce((sum, a) => sum + a.balance, 0);
          const target = need;
          for (const a of pool) takeFrom(a, Math.min((a.balance / f) - (withdrawals.get(a.id) ?? 0), (target * a.balance) / total));
        }
        for (const { a, cap } of order) {
          if (need <= 0) break;
          let available = a.balance / f - (withdrawals.get(a.id) ?? 0);
          if (cap) available = Math.min(available, Math.max(0, cap(a) - (withdrawals.get(a.id) ?? 0)));
          if (a.taxBucket === "cash") {
            const keep = Math.min(available, cashReserveLeft);
            cashReserveLeft -= keep;
            available -= keep;
          }
          if (a.taxBucket === "hsa" && ownerAge(a) < 65) available = Math.min(available, Math.max(0, a.receipts - (receiptsUsed.get(a.id) ?? 0)));
          if (a.taxBucket === "pretax" && policy.limits.neverPayPenalty && penaltyOn(a)) continue;
          if (a.taxBucket === "pretax" && Number.isFinite(bracketTopTaxable)) {
            const room = Math.max(0, bracketTopTaxable - m2Tax(taxView()).ordinaryTaxableIncome);
            available = Math.min(available, room);
          }
          takeFrom(a, Math.max(0, Math.min(available, need)));
        }
        // Last resort, after every other account: the reserve itself.
        reserveDrawn = 0;
        for (const a of cashAccounts) {
          if (need <= 0) break;
          const already = withdrawals.get(a.id) ?? 0;
          const w = Math.max(0, Math.min(a.balance / f - already, need));
          if (w > 0) {
            withdrawals.set(a.id, already + w);
            reserveDrawn += w;
            need -= w;
          }
        }
        shortfall = Math.max(0, need);
        // Gain harvesting fills whatever 0% room is left after the year's sales.
        m2s.harvest = 0;
        if (harvestWanted > 0) {
          const tv = m2Tax(taxView());
          const tax = byBucket("taxable")[0];
          const unrealized = tax ? Math.max(0, tax.balance / f - (basisAfter.get(tax.id) ?? tax.basis) - (withdrawals.get(tax.id) ?? 0) * 0) : 0;
          let h = Math.min(harvestWanted, tv.zeroPercentGainRoom, unrealized);
          if (Number.isFinite(magiBudget)) h = Math.min(h, Math.max(0, magiBudget - tv.magiAca));
          m2s.harvest = Math.max(0, h);
        }
        let total = taxView().total;
        pretaxWithdrawal = trial.pretaxOrdinary;
        // The marketplace premium is priced on this year's MAGI (the reconciled credit) and settles with the taxes
        // and withdrawals (decision T4, locked 2026-10-04; M2 tie-out convention 11).
        healthcare = healthcareFor(m2Tax(taxView()).magiAca);
        total += healthcare.total;
        if (Math.abs(total - lastTotal) < 0.01) break;
        lastTotal = total;
      }
      if (m2s.conversion > 0 && conversionSource) {
        conversionFrom = conversionSource;
        conversionTo = rothIra();
        actions.push(`About ${Math.round(m2s.conversion * f).toLocaleString("en-US")} moves from the ${conversionSource.label} to Roth as a conversion.`);
      }
      if (m2s.harvest > 0) actions.push(`About ${Math.round(m2s.harvest * f).toLocaleString("en-US")} of gains is realized at 0%.`);
      if (shortfall <= 0) {
        // Cash left over after spending (Social Security, part-time pay, or forced pretax income above the need) goes to taxable.
        const drawn = [...withdrawals.values()].reduce((a, b) => a + b, 0);
        const surplus = cashIn(0, 0, pretaxWithdrawal) + drawn - spendTotal() - scheduledDebt;
        if (surplus > 0.5) {
          taxableAmt = surplus;
          steps.push({ step: retired ? "Retirement surplus to taxable" : "Surplus to taxable", amount: surplus, taxSaved: 0, remainingAfter: 0 });
        }
      }
      if (m2s.penalized > 0) rowFlags.push("Some of this year's withdrawals pay the 10% additional tax.");
      if (shortfall > 1 && policy.limits.neverPayPenalty) rowFlags.push("The never-pay-the-penalty limit left part of this year unfunded.");
    }

    // Final taxes and take-home for the year (annualized).
    const tx = taxesFor(pretaxExtra, hsaExtra, pretaxWithdrawal, iraExtra, pPretaxExtra);
    const takeHome = incAll.netTotal - enteredWorkplace - enteredRothWorkplace - enteredHsaAmt - premiumsAndOther - pEnteredAll - pretaxExtra - hsaExtra - iraExtra - pPretaxExtra - tx.total;
    const gap = takeHome + ss - spendTotal() - scheduledDebt;

    // Employer match on total employee workplace contributions (pretax plus Roth), attributed to the first matcher, per person.
    const matchFor = (ms: Matcher[], extra: number): number => {
      let total = 0;
      let extraEmployee = extra;
      for (const m of ms) {
        const employee = m.employee + extraEmployee;
        extraEmployee = 0;
        total += Math.min(employee, m.cap) * m.pct;
      }
      return total;
    };
    const match = matchFor(matchers, pretaxExtra - amount457 + rothWorkplace);
    const pMatch = matchFor(pMatchers, pPretaxExtra + pRothWorkplace);

    // Contributions by account (annualized).
    const contributions = new Map<string, number>();
    const add = (a: AssetState, amt: number) => { if (amt > 0) contributions.set(a.id, (contributions.get(a.id) ?? 0) + amt); };
    if (enteredWorkplace + (pretaxExtra - amount457) + match > 0) add(workplacePretax(), enteredWorkplace + (pretaxExtra - amount457) + match);
    if (amount457 > 0) add(account457(), amount457);
    if (enteredRothWorkplace + rothWorkplace + megaBackdoorAmt > 0) add(workplaceRoth(), enteredRothWorkplace + rothWorkplace + megaBackdoorAmt);
    if (enteredHsaAmt + hsaExtra > 0) add(hsaAccount(), enteredHsaAmt + hsaExtra);
    if (iraExtra > 0) add(tradIra(), iraExtra);
    if (rothIraAmt > 0) add(rothIra(), rothIraAmt);
    if (taxableAmt > 0) add(taxable(), taxableAmt);
    if (partner) {
      if (pEnteredWorkplace + pPretaxExtra + pMatch > 0) add(workplacePretaxP(), pEnteredWorkplace + pPretaxExtra + pMatch);
      if (pEnteredRothWorkplace + pRothWorkplace > 0) add(workplaceRothP(), pEnteredRothWorkplace + pRothWorkplace);
      if (pEnteredHsaAmt > 0) add(hsaAccountP(), pEnteredHsaAmt);
    }
    // Entered annual contributions on accounts (data dictionary 3.6) are in addition, while working.
    if (!retired) {
      for (const a of hh.accounts) {
        if (a.side === "asset" && a.annualContribution.value > 0) {
          const st = byId.get(a.id);
          if (st && st.kind === "asset") add(st, a.annualContribution.value);
        }
      }
    }

    // Step 9: growth and roll forward.
    const balances: Record<string, number> = {};
    let assetTotal = 0;
    let debtTotal = 0;
    let debtInterest = 0;
    let debtPrincipal = 0;
    let debtExtraPaid = 0;
    let debtScheduledPaid = 0;
    for (const s of states) {
      if (s.kind === "asset") {
        let flow = ((contributions.get(s.id) ?? 0) - (withdrawals.get(s.id) ?? 0)) * f;
        if (m2) {
          if (conversionFrom && s.id === conversionFrom.id) flow -= m2s.conversion * f;
          if (conversionTo && s.id === conversionTo.id) flow += m2s.conversion * f;
          // Basis and ordering layers follow the money.
          if (s.taxBucket === "taxable") s.basis = Math.max(0, (basisAfter.get(s.id) ?? s.basis) + (contributions.get(s.id) ?? 0) * f + (s === taxable() ? m2s.harvest * f : 0));
          if (s.taxBucket === "roth" && s.roth) {
            const layers = rothAfter.get(s.id) ?? s.roth;
            const contributed = (contributions.get(s.id) ?? 0) * f;
            s.roth = { basis: layers.basis + contributed, conversions: [...layers.conversions], firstYear: layers.firstYear };
            if (contributed > 0 && !Number.isFinite(s.roth.firstYear)) s.roth.firstYear = y;
            if (conversionTo && s.id === conversionTo.id && m2s.conversion > 0) {
              s.roth.conversions.push({ year: y, amount: m2s.conversion * f });
              if (!Number.isFinite(s.roth.firstYear)) s.roth.firstYear = y;
            }
          }
          if (s.taxBucket === "hsa") s.receipts = Math.max(0, s.receipts - (receiptsUsed.get(s.id) ?? 0) * f);
        }
        s.balance = Math.max(0, growBalance(s.balance, flow, rateFor(s, y), f));
        balances[s.id] = s.balance;
        assetTotal += s.balance;
      } else {
        const r = debtYear({
          balance: s.balance,
          nominalRatePercent: nominalRateFor(s.account, y, ctx.startMonth ?? 1),
          nominalPaymentAnnual: s.account.actualPaymentAnnual.value,
          inflationPercent: band.inflation,
          t,
          fraction: f,
          extraPayment: (debtExtra.get(s.id) ?? 0) * f,
        });
        s.balance = r.endBalance;
        balances[s.id] = s.balance;
        debtTotal += s.balance;
        debtInterest += r.interest;
        debtPrincipal += r.principal;
        debtScheduledPaid += r.scheduled;
        debtExtraPaid += r.paid - r.scheduled;
      }
    }

    if (!retired && y + 1 === retirementYear) assetsAtRetirement = assetTotal;
    lifetimeTaxes += tx.total * f;
    if (shortfall > 1 && !firstShortfall) firstShortfall = { year: y, age, amount: shortfall * f };

    const scale = (m: Map<string, number>) => Object.fromEntries([...m].map(([k, v]) => [k, v * f]));
    const m2r = m2 ? m2Tax(tx) : null;
    if (m2r) magiHistory.set(y, m2r.magiIrmaa);
    for (const fl of healthcare.flags) rowFlags.push(fl);
    const federalIncomeTax = m2r ? m2r.ordinaryTax + m2r.capitalGainsTax + m2r.niit - m2r.credits : (tx.fedR as FederalTaxResult).incomeTax;
    rows.push({
      year: y,
      t,
      fraction: f,
      age,
      retired,
      phaseId: spend.phaseId,
      income: { wages: incAll.wages * f, selfEmploymentNet: incAll.selfEmploymentNet * f, otherTaxable: incAll.otherTaxable * f, nonTaxable: incAll.nonTaxable * f, gross: incAll.grossTotal * f },
      deductions: {
        workplacePretax: (enteredWorkplace + pretaxExtra - amount457 + pEnteredWorkplace + pPretaxExtra) * f,
        workplaceRoth: (enteredRothWorkplace + rothWorkplace + pEnteredRothWorkplace + pRothWorkplace) * f,
        hsa: (enteredHsaAmt + hsaExtra + pEnteredHsaAmt) * f,
        premiumsAndOther: (premiumsAndOther + pPremiums) * f,
      },
      employerMatch: (match + pMatch) * f,
      taxes: {
        federalIncome: federalIncomeTax * f,
        fica: (tx.fedR.socialSecurityTax + tx.fedR.medicareTax + tx.fedR.additionalMedicareTax) * f,
        selfEmployment: tx.fedR.selfEmploymentTax * f,
        penalty: tx.fedR.penalty * f,
        state: tx.stR.tax * f,
        local: tx.stR.local * f,
        total: tx.total * f,
      },
      takeHome: takeHome * f,
      spending: spendTotal() * f,
      socialSecurity: ss * f,
      debt: { scheduled: debtScheduledPaid, extra: debtExtraPaid, interest: debtInterest, principal: debtPrincipal },
      gap: gap * f,
      contributions: scale(contributions),
      withdrawals: scale(withdrawals),
      fromReserve: reserveDrawn * f,
      waterfall: steps.map((st) => ({ ...st, amount: st.amount * f, taxSaved: st.taxSaved * f, remainingAfter: st.remainingAfter * f })),
      shortfall: shortfall * f,
      balances,
      assets: assetTotal,
      debts: debtTotal,
      netWorth: assetTotal - debtTotal,
      flags: rowFlags,
      ...(partner && pAge !== null ? { partner: { age: pAge, alive: pAlive, income: pInc.grossTotal * f, socialSecurity: ssSplit.partner * f } } : {}),
      ...(m2r
        ? {
            m2: {
              conversion: m2s.conversion * f,
              harvested: m2s.harvest * f,
              gainsRealized: (m2s.salesGains + m2s.harvest) * f,
              rmd: m2s.rmd * f,
              sepp: m2s.sepp * f,
              penalized: m2s.penalized * f,
              agi: m2r.agi,
              magiAca: m2r.magiAca,
              taxDetail: { ordinary: m2r.ordinaryTax * f, capitalGains: m2r.capitalGainsTax * f, niit: m2r.niit * f, taxableSocialSecurity: m2r.taxableSocialSecurity * f, seniorDeduction: m2r.seniorDeduction },
              healthcare: { total: healthcare.total * f, pieces: healthcare.pieces, acaPctFpl: healthcare.aca?.pctFpl ?? null, irmaaTier: healthcare.irmaa?.tier ?? null },
              actions,
              rothDraw: { basis: m2s.rothBasis * f, seasonedConversions: m2s.rothSeasoned * f, unseasonedConversions: m2s.rothUnseasoned * f, earnings: m2s.rothEarningsDrawn * f },
              taxableBasisEnd: assets().filter((a) => a.taxBucket === "taxable").reduce((sum, a) => sum + a.basis, 0),
            },
          }
        : {}),
    });
  }

  // Rules checked more than 15 months before the plan date are flagged on every result, never refused (decision F7).
  for (const r of ledger.stale(hh.asOf, STALE_RULE_MONTHS)) flags.add(`The rule "${r.name}" was last checked against its source on ${r.lastVerified}, more than ${STALE_RULE_MONTHS} months ago. Its numbers may have changed.`);

  const last = rows[rows.length - 1];
  return {
    rows,
    accounts: states.map((s) => (s.kind === "asset" ? { id: s.id, label: s.label, kind: "asset", taxBucket: s.taxBucket, implicit: s.implicit } : { id: s.id, label: s.label, kind: "debt", implicit: false })),
    firstShortfall,
    lifetimeTaxes,
    estate: last ? last.netWorth : 0,
    assetsAtRetirement,
    socialSecurity: { pia, claimingAgeYears: claimingAge.years, factor, annualBenefit: ssAnnual },
    ...(partner ? { partnerSocialSecurity: { pia: pPia, claimingAgeYears: pClaimingAge.years, factor: pFactor, annualBenefit: pSsAnnual } } : {}),
    flags: [...flags],
    conventions: m2 ? "m2" : "m1",
    rulesUsed: ledger.refs(),
    tripwires: ledger.tripwires(),
  };
}

/** M1 limitation, shown on the result screen whenever a plan draws Roth money early (engine spec section 4). */
export const EARLY_ROTH_FLAG =
  "This plan draws Roth money before 59 and a half. M1 treats that as tax and penalty free, which is optimistic: in reality only contributions are. Results that lean on early Roth money will sharpen in M2.";

function emptyIncome(): YearIncome {
  return { streams: [], wages: 0, selfEmploymentNet: 0, otherTaxable: 0, nonTaxable: 0, grossTotal: 0, netTotal: 0 };
}
