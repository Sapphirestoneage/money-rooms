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
  AssetAccount,
  DebtAccount,
  FilingStatus,
  Household,
  IncomeStream,
  SavingsStrategy,
  SocialSecurityParams,
  SpendingRow,
  StateCode,
  TaxBucket,
  TaxTables,
  YearMonth,
} from "../model";
import { getAccountPreset, isAnswered, parseYearMonth, stubFraction } from "../model";
import {
  annualBenefit,
  averageIndexedMonthlyEarnings,
  claimingFactor,
  estimateEarningsRecord,
  primaryInsuranceAmount,
} from "../social-security/benefit";
import { computeFederalTax, type FederalTaxResult } from "../tax/federal";
import { computeStateTax, type StateTaxResult } from "../tax/state";
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
}

/** Narrows a household, or throws naming what is still unanswered (data dictionary section 7). */
export function requireComplete(h: Household): CompleteHousehold {
  const missing: string[] = [];
  if (!h.self.birthDate) missing.push("birth date");
  if (!h.self.state) missing.push("state");
  if (h.self.income.kind === "unanswered") missing.push("income");
  if (h.spending.kind === "unanswered") missing.push("spending");
  if (h.accounts.kind === "unanswered") missing.push("accounts");
  if (missing.length) throw new Error(`The household still needs: ${missing.join(", ")}`);
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
  };
}

export interface TimelineOptions {
  band: BandNumbers;
  /** The first calendar year with no work income. Use Infinity to never retire. */
  retirementYear: number;
  tables: TaxTables;
  ssParams: SocialSecurityParams;
  /** Test-only settings for hand tie-outs. The app never sets these. */
  testSettings?: TieOutSettings;
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
  /** Each savings waterfall step that took money this year (prorated), in order. */
  waterfall: WaterfallStep[];
  shortfall: number;
  balances: Record<string, number>;
  assets: number;
  debts: number;
  netWorth: number;
  flags: string[];
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
  flags: string[];
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
  implicit: boolean;
}

interface DebtState {
  kind: "debt";
  id: string;
  label: string;
  account: DebtAccount;
  balance: number;
}

type AccountState = AssetState | DebtState;

const DEFAULTS = {
  highInterest: engineDefaults.highInterestThresholdPercent.value,
  workStartAge: engineDefaults.assumedWorkStartAge.value,
  reserveMonths: engineDefaults.emergencyReserveMonths.value,
  penaltyFreeAge: engineDefaults.penaltyFreeAge.value,
};

function assetState(a: AssetAccount, band: BandNumbers): AssetState {
  return {
    kind: "asset",
    id: a.id,
    label: a.name?.value ?? getAccountPreset(a.preset).label,
    taxBucket: a.taxBucket.value,
    balance: isAnswered(a.balance) ? a.balance.value : 0,
    rate: blendedRealReturn(a.allocation.value, band.returns, a.fees.value),
    implicit: false,
  };
}

function implicitAsset(id: string, presetKey: "trad401k" | "roth401k" | "rothIRA" | "hsa" | "brokerage", band: BandNumbers): AssetState {
  const p = getAccountPreset(presetKey);
  if (p.side !== "asset") throw new Error("implicit accounts must be assets");
  return {
    kind: "asset",
    id,
    label: `${p.label} (added by the engine)`,
    taxBucket: p.taxBucket,
    balance: 0,
    rate: blendedRealReturn(p.allocation, band.returns, p.fees),
    implicit: true,
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
  const lastYear = birth.year + band.planToAge;
  const flags = new Set<string>();

  // ---- Accounts -----------------------------------------------------------
  const states: AccountState[] = [];
  for (const a of hh.accounts) {
    if (a.side === "asset") states.push(assetState(a, band));
    else states.push({ kind: "debt", id: a.id, label: a.name?.value ?? getAccountPreset(a.preset).label, account: a, balance: isAnswered(a.balance) ? a.balance.value : 0 });
  }
  const assets = () => states.filter((s): s is AssetState => s.kind === "asset");
  const debts = () => states.filter((s): s is DebtState => s.kind === "debt");
  const byId = new Map<string, AccountState>(states.map((s) => [s.id, s]));

  const presetOf = (id: string) => hh.accounts.find((a) => a.id === id)?.preset;
  const findAsset = (pred: (a: AssetState) => boolean) => assets().find(pred);
  const ensure = (pred: (a: AssetState) => boolean, id: string, preset: Parameters<typeof implicitAsset>[1]): AssetState => {
    const found = findAsset(pred);
    if (found) return found;
    const created = implicitAsset(id, preset, band);
    states.push(created);
    byId.set(id, created);
    flags.add(`The engine added an empty ${getAccountPreset(preset).label} account because the savings plan needed one.`);
    return created;
  };

  const hasWages = hh.income.some((s) => s.type === "salary" || s.type === "hourly");
  const enteredHsa = hh.income.some((s) => s.preTaxDeductions?.some((d) => d.type === "hsa"));
  const hsaEligible = hh.hsaEligible || enteredHsa;
  const workplaceDeductions = hh.income.some((s) => s.preTaxDeductions?.some((d) => d.type === "401k" || d.type === "403b"));
  const anyMatch = hh.income.some((s) => s.employerMatch);

  const workplacePretax = (): AssetState =>
    ensure((a) => presetOf(a.id) === "trad401k" || a.id === "engine:trad401k", "engine:trad401k", "trad401k");
  const workplaceRoth = (): AssetState =>
    ensure((a) => presetOf(a.id) === "roth401k" || a.id === "engine:roth401k", "engine:roth401k", "roth401k");
  const rothIra = (): AssetState => ensure((a) => presetOf(a.id) === "rothIRA" || a.id === "engine:rothIRA", "engine:rothIRA", "rothIRA");
  const hsaAccount = (): AssetState => ensure((a) => a.taxBucket === "hsa", "engine:hsa", "hsa");
  const taxable = (): AssetState => ensure((a) => a.taxBucket === "taxable", "engine:brokerage", "brokerage");

  // Create the accounts the plan will need up front so every row has the same columns.
  if (workplaceDeductions || anyMatch) workplacePretax();
  if (hsaEligible) hsaAccount();
  rothIra();
  taxable();
  if (hh.savingsStrategy === "maxTaxFreeGrowth" && hasWages) workplaceRoth();

  // ---- Pass 1: income by year, for the Social Security earnings record ----
  const ctxFor = (year: number): YearContext => ({ year, t: year - year0, age: year - birth.year, retirementYear });
  const incomeByYear = new Map<number, YearIncome>();
  const covered: Record<number, number> = {};
  for (let y = year0; y <= lastYear; y++) {
    const inc = y >= retirementYear ? emptyIncome() : incomeForYear(hh.income, ctxFor(y), band);
    incomeByYear.set(y, inc);
    covered[y] = Math.min(inc.wages + inc.selfEmploymentNet, fed.fica.socialSecurityWageBase);
  }

  // ---- Social Security ----------------------------------------------------
  const record = hh.socialSecurity.earningsRecord
    ? Object.values(hh.socialSecurity.earningsRecord.value)
    : estimateEarningsRecord({
        projected: covered,
        birthYear: birth.year,
        firstProjectionYear: year0,
        assumedPastAnnual: covered[year0] ?? 0,
        startAge: DEFAULTS.workStartAge,
      });
  const pia = primaryInsuranceAmount(averageIndexedMonthlyEarnings(record, ssParams), ssParams);
  const claimingAge = hh.socialSecurity.claimingAge?.value ?? ssParams.normalRetirementAge(birth.year);
  const factor = claimingFactor(birth.year, claimingAge, ssParams);
  const ssAnnual = hh.socialSecurity.claimZero?.value ? 0 : annualBenefit(pia, factor, band.socialSecurityPolicy);
  const ssOverride = opts.testSettings?.socialSecurityOverride;
  const ssAnnualUsed = ssOverride ? ssOverride.annual : ssAnnual;
  const ssStartYear = ssOverride ? birth.year + ssOverride.fromAge : birth.year + claimingAge.years;
  if (!hh.socialSecurity.earningsRecord) flags.add("Social Security is estimated from your income. Enter your ssa.gov record to sharpen it.");

  // ---- Pass 2: the annual loop --------------------------------------------
  const rows: YearRow[] = [];
  let firstShortfall: TimelineResult["firstShortfall"] = null;
  let lifetimeTaxes = 0;
  let assetsAtRetirement: number | null = null;

  for (let y = year0; y <= lastYear; y++) {
    const t = y - year0;
    const f = t === 0 ? stubFraction(hh.asOf) : 1;
    const ctx = ctxFor(y);
    const age = ctx.age;
    const retired = y >= retirementYear;
    const inc = incomeByYear.get(y) ?? emptyIncome();
    const limits = contributionLimits(age, fed);
    const rowFlags: string[] = [];

    // Step 3: entered pre-tax deductions, capped at the legal limits.
    let enteredWorkplace = 0;
    let enteredHsaAmt = 0;
    let premiumsAndOther = 0;
    const matchers: { gross: number; cap: number; pct: number; employee: number }[] = [];
    if (!retired) {
      for (const s of hh.income) {
        const active = inc.streams.find((x) => x.id === s.id);
        if (!active) continue;
        let employee = 0;
        for (const d of s.preTaxDeductions ?? []) {
          if (d.type === "401k" || d.type === "403b") employee += d.annual.value;
          else if (d.type === "hsa") enteredHsaAmt += d.annual.value;
          else premiumsAndOther += d.annual.value;
        }
        enteredWorkplace += employee;
        if (s.employerMatch) {
          matchers.push({ gross: active.gross, cap: (s.employerMatch.capPercentOfPay.value / 100) * active.gross, pct: s.employerMatch.matchPercent.value / 100, employee });
        }
      }
      if (enteredWorkplace > limits.workplace) {
        rowFlags.push(`Workplace contributions were capped at the ${y} limit.`);
        enteredWorkplace = limits.workplace;
      }
      if (enteredHsaAmt > limits.hsa) enteredHsaAmt = limits.hsa;
    }

    // Spending, Social Security, scheduled debt payments (annualized).
    const spend = spendingForYear(hh.spending, ctx, retired, band.phases);
    const healthcareSetting = opts.testSettings?.retirementHealthcare;
    const healthcareLine = retired && healthcareSetting ? (age < 65 ? healthcareSetting.before65 : healthcareSetting.from65) : 0;
    const spendTotal = spend.total + healthcareLine;
    const ss = y >= ssStartYear ? ssAnnualUsed : 0;
    const debtPreview = debts().map((d) => ({
      d,
      r: debtYear({
        balance: d.balance,
        nominalRatePercent: nominalRateFor(d.account, y),
        nominalPaymentAnnual: d.account.actualPaymentAnnual.value,
        inflationPercent: band.inflation,
        t,
        fraction: f,
        extraPayment: 0,
      }),
    }));
    const scheduledDebt = debtPreview.reduce((s, x) => s + x.r.scheduled, 0) / f;
    for (const x of debtPreview) if (x.r.paymentBelowInterest && x.d.balance > 0) rowFlags.push(`${x.d.label}: the payment does not cover the interest, so the balance grows.`);

    // Taxes as a function of the pre-tax extras and pretax withdrawals.
    const taxesFor = (pretaxExtra: number, hsaExtra: number, pretaxWithdrawal: number): { fedR: FederalTaxResult; stR: StateTaxResult; total: number; marginal: number } => {
      const fedR = computeFederalTax(
        {
          filingStatus: hh.filingStatus,
          wages: inc.wages,
          pretaxPayrollDeductions: enteredWorkplace + enteredHsaAmt + premiumsAndOther + pretaxExtra + hsaExtra,
          selfEmploymentNet: inc.selfEmploymentNet,
          otherOrdinaryIncome: inc.otherTaxable + pretaxWithdrawal,
          earlyWithdrawals: age < DEFAULTS.penaltyFreeAge ? pretaxWithdrawal : 0,
        },
        fed,
      );
      const stR = computeStateTax(fedR.agi, hh.state, hh.filingStatus, tables);
      return { fedR, stR, total: fedR.total + stR.tax, marginal: (fedR.marginalRate + stR.marginalRate) / 100 };
    };
    const cashIn = (pretaxExtra: number, hsaExtra: number, pretaxWithdrawal: number) =>
      inc.netTotal - enteredWorkplace - enteredHsaAmt - premiumsAndOther - pretaxExtra - hsaExtra - taxesFor(pretaxExtra, hsaExtra, pretaxWithdrawal).total + ss;

    // Step 8: surplus or shortfall.
    let pretaxExtra = 0;
    let rothWorkplace = 0;
    let hsaExtra = 0;
    let rothIraAmt = 0;
    let taxableAmt = 0;
    const debtExtra = new Map<string, number>();
    const withdrawals = new Map<string, number>();
    let pretaxWithdrawal = 0;
    let shortfall = 0;

    const gap0 = cashIn(0, 0, 0) - spendTotal - scheduledDebt;
    const steps: WaterfallStep[] = [];

    if (gap0 >= 0 && !retired) {
      let remaining = gap0;
      const matchRoom = matchers.reduce((s, m) => s + Math.max(0, m.cap - m.employee), 0);

      /** A pre-tax step with the tax-savings loop and the exact final step (E10). */
      const pretaxStep = (room: number, into: "workplace" | "hsa", name: string) => {
        if (room <= 0 || remaining <= 0) return;
        const current = (x: number) => (into === "workplace" ? taxesFor(pretaxExtra + x, hsaExtra, 0) : taxesFor(pretaxExtra, hsaExtra + x, 0));
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
        else hsaExtra += x;
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
      if (matchRoom > 0) {
        if (hh.savingsStrategy === "maxTaxFreeGrowth") rothWorkplace += afterTaxStep(Math.min(matchRoom, limits.workplace - enteredWorkplace), "1. Employer match (Roth 401(k))");
        else pretaxStep(Math.min(matchRoom, limits.workplace - enteredWorkplace), "workplace", "1. Employer match (traditional)");
      }
      // Step 2: debts above the high-interest threshold, to payoff.
      for (const x of debtPreview) {
        if (x.d.balance <= 0 || nominalRateFor(x.d.account, y) <= DEFAULTS.highInterest) continue;
        const payoffRoom = Math.max(0, (x.d.balance * Math.pow(1 + 0, 1)) - x.r.scheduled / f);
        const extra = afterTaxStep(payoffRoom, `2. High-interest debt: ${x.d.label}`);
        if (extra > 0) debtExtra.set(x.d.id, extra);
      }
      // Steps 3 to 8 by strategy.
      const workplaceRoom = () => Math.max(0, limits.workplace - enteredWorkplace - pretaxExtra - rothWorkplace);
      const hsaRoom = () => (hsaEligible ? Math.max(0, limits.hsa - enteredHsaAmt - hsaExtra) : 0);
      switch (hh.savingsStrategy) {
        case "maxTaxSavingsNow":
          pretaxStep(hsaRoom(), "hsa", "3. HSA");
          if (hasWages) pretaxStep(workplaceRoom(), "workplace", "4. Traditional 401(k) to the limit");
          // 457(b) and the traditional IRA deduction wait for verified limits (rules registry). Roth IRA instead.
          rothIraAmt += afterTaxStep(limits.ira, "6. Roth IRA");
          taxableAmt += afterTaxStep(Infinity, "8. Taxable brokerage");
          break;
        case "maxTaxFreeGrowth":
          pretaxStep(hsaRoom(), "hsa", "3. HSA");
          rothIraAmt += afterTaxStep(limits.ira, "4. Roth IRA");
          if (hasWages) rothWorkplace += afterTaxStep(workplaceRoom(), "5. Roth 401(k) to the limit");
          taxableAmt += afterTaxStep(Infinity, "8. Taxable brokerage");
          break;
        case "enteredOnly":
          rothIraAmt += afterTaxStep(limits.ira, "Roth IRA");
          taxableAmt += afterTaxStep(Infinity, "Taxable brokerage");
          break;
      }
      if (rothIraAmt > 0) {
        const phase = fed.contributionLimits.rothIraPhaseOut[hh.filingStatus];
        if (phase && taxesFor(pretaxExtra, hsaExtra, 0).fedR.agi > phase[0]) rowFlags.push("Income is above the Roth IRA limit; the contribution assumes a backdoor Roth.");
      }
    } else if (gap0 >= 0 && retired) {
      // A surplus in retirement (Social Security above spending) goes to taxable.
      taxableAmt = gap0;
      steps.push({ step: "Retirement surplus to taxable", amount: gap0, taxSaved: 0, remainingAfter: 0 });
    } else {
      // Shortfall: withdraw in the M1 order. Pretax withdrawals are taxable, so iterate.
      const order: AssetState[] = [
        ...assets().filter((a) => a.taxBucket === "cash"),
        ...assets().filter((a) => a.taxBucket === "taxable"),
        ...assets().filter((a) => a.taxBucket === "pretax"),
        ...assets().filter((a) => a.taxBucket === "roth"),
        ...assets().filter((a) => a.taxBucket === "hsa"),
      ];
      // The cash reserve is a set number of months of this year's spending, in dollars.
      const reserve = (DEFAULTS.reserveMonths / 12) * spendTotal;
      const cashAccounts = order.filter((a) => a.taxBucket === "cash");
      for (let i = 0; i < 100; i++) {
        withdrawals.clear();
        let need = -(cashIn(0, 0, pretaxWithdrawal) - spendTotal - scheduledDebt);
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
        for (const a of cashAccounts) {
          if (need <= 0) break;
          const already = withdrawals.get(a.id) ?? 0;
          const w = Math.max(0, Math.min(a.balance / f - already, need));
          if (w > 0) {
            withdrawals.set(a.id, already + w);
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
    }

    // Final taxes and take-home for the year (annualized).
    const tx = taxesFor(pretaxExtra, hsaExtra, pretaxWithdrawal);
    const takeHome = inc.netTotal - enteredWorkplace - enteredHsaAmt - premiumsAndOther - pretaxExtra - hsaExtra - tx.total;
    const gap = takeHome + ss - spendTotal - scheduledDebt;

    // Employer match on total employee workplace contributions (pretax plus Roth), attributed to the first matcher.
    let match = 0;
    let extraEmployee = pretaxExtra + rothWorkplace;
    for (const m of matchers) {
      const employee = m.employee + extraEmployee;
      extraEmployee = 0;
      match += Math.min(employee, m.cap) * m.pct;
    }

    // Contributions by account (annualized).
    const contributions = new Map<string, number>();
    const add = (a: AssetState, amt: number) => { if (amt > 0) contributions.set(a.id, (contributions.get(a.id) ?? 0) + amt); };
    if (enteredWorkplace + pretaxExtra + match > 0) add(workplacePretax(), enteredWorkplace + pretaxExtra + match);
    if (rothWorkplace > 0) add(workplaceRoth(), rothWorkplace);
    if (enteredHsaAmt + hsaExtra > 0) add(hsaAccount(), enteredHsaAmt + hsaExtra);
    if (rothIraAmt > 0) add(rothIra(), rothIraAmt);
    if (taxableAmt > 0) add(taxable(), taxableAmt);
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
        const flow = ((contributions.get(s.id) ?? 0) - (withdrawals.get(s.id) ?? 0)) * f;
        s.balance = Math.max(0, growBalance(s.balance, flow, s.rate, f));
        balances[s.id] = s.balance;
        assetTotal += s.balance;
      } else {
        const r = debtYear({
          balance: s.balance,
          nominalRatePercent: nominalRateFor(s.account, y),
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
    rows.push({
      year: y,
      t,
      fraction: f,
      age,
      retired,
      phaseId: spend.phaseId,
      income: { wages: inc.wages * f, selfEmploymentNet: inc.selfEmploymentNet * f, otherTaxable: inc.otherTaxable * f, nonTaxable: inc.nonTaxable * f, gross: inc.grossTotal * f },
      deductions: { workplacePretax: (enteredWorkplace + pretaxExtra) * f, workplaceRoth: rothWorkplace * f, hsa: (enteredHsaAmt + hsaExtra) * f, premiumsAndOther: premiumsAndOther * f },
      employerMatch: match * f,
      taxes: {
        federalIncome: tx.fedR.incomeTax * f,
        fica: (tx.fedR.socialSecurityTax + tx.fedR.medicareTax + tx.fedR.additionalMedicareTax) * f,
        selfEmployment: tx.fedR.selfEmploymentTax * f,
        penalty: tx.fedR.penalty * f,
        state: tx.stR.tax * f,
        total: tx.total * f,
      },
      takeHome: takeHome * f,
      spending: spendTotal * f,
      socialSecurity: ss * f,
      debt: { scheduled: debtScheduledPaid, extra: debtExtraPaid, interest: debtInterest, principal: debtPrincipal },
      gap: gap * f,
      contributions: scale(contributions),
      withdrawals: scale(withdrawals),
      waterfall: steps.map((st) => ({ ...st, amount: st.amount * f, taxSaved: st.taxSaved * f, remainingAfter: st.remainingAfter * f })),
      shortfall: shortfall * f,
      balances,
      assets: assetTotal,
      debts: debtTotal,
      netWorth: assetTotal - debtTotal,
      flags: rowFlags,
    });
  }

  const last = rows[rows.length - 1];
  return {
    rows,
    accounts: states.map((s) => (s.kind === "asset" ? { id: s.id, label: s.label, kind: "asset", taxBucket: s.taxBucket, implicit: s.implicit } : { id: s.id, label: s.label, kind: "debt", implicit: false })),
    firstShortfall,
    lifetimeTaxes,
    estate: last ? last.netWorth : 0,
    assetsAtRetirement,
    socialSecurity: { pia, claimingAgeYears: claimingAge.years, factor, annualBenefit: ssAnnual },
    flags: [...flags],
  };
}

function emptyIncome(): YearIncome {
  return { streams: [], wages: 0, selfEmploymentNet: 0, otherTaxable: 0, nonTaxable: 0, grossTotal: 0, netTotal: 0 };
}
