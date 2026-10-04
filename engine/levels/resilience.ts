/**
 * Level 2: Resilience (docs/levels/level-2-resilience.md). The Rule of 5 target
 * and the monthly number, the spending staircase, the runway stack,
 * unemployment and health insurance after a job loss, disability and term life,
 * and the shock tests. Pure functions. Rule values from data/resilience.json.
 */

import resilience from "../../data/resilience.json";
import healthcare from "../../data/healthcare.json";
import type { Household, IncomeStability, SpendingRow } from "../model";
import { RuleLedger, ageInYears, resolveAssumptions, yearMonthOf, homeReserveAnnual } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, type Deps } from "../projection/fi";
import { acaPremiumCredit } from "../projection/healthcare";
import { requireComplete } from "../projection/timeline";

export const RESILIENCE = resilience;

// ---------------------------------------------------------------------------
// Spending by step
// ---------------------------------------------------------------------------

export interface MustPay {
  label: string;
  annual: number;
}

/** Full monthly spending: every current spending row plus scheduled debt payments. */
/** Full spending a month: the rows, the home's reserve, and the debt payments that cannot pause (decision A11). */
export function fullMonthlySpending(h: Household): number {
  const spending = h.spending.kind === "rows" ? h.spending.rows.reduce((s, r) => s + r.annual.value, 0) : 0;
  return (spending + homeReserveAnnual(h) + debtPaymentsAnnual(h, { fixedOnly: true })) / 12;
}

/** Scheduled debt payments a year. With `fixedOnly`, a payment the lender lets flex or pause is left out (a family loan in a hard season). */
export function debtPaymentsAnnual(h: Household, options: { fixedOnly?: boolean } = {}): number {
  if (h.accounts.kind !== "rows") return 0;
  return h.accounts.rows.reduce((s, a) => {
    if (a.side !== "debt") return s;
    if (options.fixedOnly && a.paymentFlexibility && a.paymentFlexibility.value !== "fixed") return s;
    return s + a.actualPaymentAnnual.value;
  }, 0);
}

/** The bills that do not disappear below full spending: health insurance and phone from the rows, debt minimums, and anything entered. */
export function mustPays(h: Household): MustPay[] {
  const out: MustPay[] = [];
  if (h.spending.kind === "rows") {
    for (const r of h.spending.rows) if (resilience.staircase.mustPayCategories.includes(r.category)) out.push({ label: r.label ?? r.category, annual: r.annual.value });
  }
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) if (a.side === "debt" && a.minimumPaymentAnnual.value > 0) out.push({ label: `${a.name?.value ?? a.preset} minimum`, annual: a.minimumPaymentAnnual.value });
  }
  const extra = h.resilience?.extraMustPaysAnnual?.value ?? 0;
  if (extra > 0) out.push({ label: "Other must-pays", annual: extra });
  return out;
}

export interface StaircaseStep {
  id: string;
  label: string;
  /** Dollars a month kept at this step, must-pays included. */
  monthly: number;
  mustPays: MustPay[];
}

/** The staircase: what spending is kept at each step, must-pays on every step below full. */
export function staircase(h: Household): StaircaseStep[] {
  const rows: SpendingRow[] = h.spending.kind === "rows" ? h.spending.rows : [];
  const must = mustPays(h);
  const mustAnnual = must.reduce((s, m) => s + m.annual, 0);
  return resilience.staircase.steps.map((step) => {
    if (step.keeps === "all") return { id: step.id, label: step.label, monthly: fullMonthlySpending(h), mustPays: [] };
    const kept = rows.filter((r) => (step.keeps as string[]).includes(r.category) && !resilience.staircase.mustPayCategories.includes(r.category)).reduce((s, r) => s + r.annual.value, 0);
    return { id: step.id, label: step.label, monthly: (kept + mustAnnual) / 12, mustPays: must };
  });
}

// ---------------------------------------------------------------------------
// The Rule of 5
// ---------------------------------------------------------------------------

export interface RuleOfFive {
  ageYears: number;
  stability: IncomeStability;
  multiplier: number;
  targetMonths: number;
  monthlySpending: number;
  targetDollars: number;
  cashNow: number;
  gap: number;
  monthsToClose: number;
  /** Dollars a month to close the gap over the chosen months. */
  closeMonthly: number;
  /** Dollars a month to keep pace with age (the target grows 0.2 months a year). */
  growthMonthly: number;
  /** The one number: close plus growth, or growth alone once the target is met. */
  saveMonthly: number;
}

export function cashBalance(h: Household): number {
  if (h.accounts.kind !== "rows") return 0;
  return h.accounts.rows.filter((a) => a.side === "asset" && a.taxBucket.value === "cash").reduce((s, a) => s + (a.balance.value ?? 0), 0);
}

export function ruleOfFive(h: Household): RuleOfFive {
  const r = resilience.ruleOfFive;
  const stability = h.resilience?.incomeStability?.value ?? "normal";
  const multiplier = r.stabilityMultipliers[stability];
  const ageYears = h.self.birthDate ? ageInYears(h.self.birthDate.value, yearMonthOf(h.asOf)) : 25;
  const targetMonths = (ageYears / r.ageDivisor) * multiplier;
  const monthlySpending = fullMonthlySpending(h);
  const targetDollars = targetMonths * monthlySpending;
  const cashNow = cashBalance(h);
  const gap = Math.max(0, targetDollars - cashNow);
  const monthsToClose = h.resilience?.monthsToClose?.value ?? r.monthsToCloseDefault;
  const growthMonthly = (monthlySpending / (12 / r.growthMonthsPerYear)) * multiplier;
  const closeMonthly = gap / monthsToClose;
  return { ageYears, stability, multiplier, targetMonths, monthlySpending, targetDollars, cashNow, gap, monthsToClose, closeMonthly, growthMonthly, saveMonthly: gap > 0 ? closeMonthly + growthMonthly : growthMonthly };
}

// ---------------------------------------------------------------------------
// Unemployment, health insurance after a job loss, severance
// ---------------------------------------------------------------------------

export interface UnemploymentEstimate {
  eligible: boolean;
  weeklyBenefit: number;
  weeks: number;
  /** Total before tax. */
  total: number;
  /** After federal tax at the 12% bracket as an approximation of a low-income year. */
  afterTax: number;
  source: string;
  url: string;
  lastVerified: string | null;
  unverified: boolean;
}

export function unemploymentEstimate(h: Household): UnemploymentEstimate {
  const u = resilience.unemployment;
  const streams = h.self.income.kind === "rows" ? h.self.income.rows : [];
  const w2 = streams.filter((s) => u.eligibleIncomeTypes.includes(s.type)).reduce((s, r) => s + r.grossAnnual.value, 0);
  const eligible = h.resilience?.unemploymentEligible?.value ?? w2 > 0;
  const weeklyWage = w2 / 52;
  const weekly = eligible ? Math.min(u.placeholder.maxWeeklyBenefit, weeklyWage * u.placeholder.replacementShareOfWeeklyWage) : 0;
  const total = weekly * u.placeholder.weeks;
  return { eligible, weeklyBenefit: weekly, weeks: u.placeholder.weeks, total, afterTax: u.placeholder.federallyTaxable ? total * 0.88 : total, source: u.source, url: u.url, lastVerified: u.lastVerified, unverified: u.lastVerified === null };
}

/** Health insurance after a job loss, per month: the marketplace benchmark less the credit at unemployment-only income, or COBRA. */
export function healthAfterJobLossMonthly(h: Household, ledger = new RuleLedger()): { monthly: number; basis: "marketplace" | "cobra" } {
  const benchmark = healthcare.before65.benchmarkSilverPremiumAnnualPerAdult.value * Math.max(1, h.drawdown?.acaHouseholdSize?.value ?? 1);
  const ui = unemploymentEstimate(h);
  const magi = ui.total;
  const aca = acaPremiumCredit(magi, h.drawdown?.acaHouseholdSize?.value ?? 1, benchmark, ledger);
  const marketplace = aca.belowRange && h.drawdown?.medicaidExpansionState?.value ? 0 : aca.netPremium;
  return { monthly: marketplace / 12, basis: "marketplace" };
}

export function severanceDollars(h: Household): number {
  const weeks = h.resilience?.severanceWeeks?.value ?? 0;
  const streams = h.self.income.kind === "rows" ? h.self.income.rows : [];
  const wages = streams.filter((s) => s.type === "salary" || s.type === "hourly").reduce((s, r) => s + r.grossAnnual.value, 0);
  return (wages / 52) * weeks;
}

// ---------------------------------------------------------------------------
// The runway stack
// ---------------------------------------------------------------------------

export interface RunwayLayer {
  id: string;
  label: string;
  dollars: number;
  /** Months this layer adds at the chosen step's burn rate. */
  months: number;
}

export interface Runway {
  stepId: string;
  /** Monthly burn at the step, health insurance after the job loss included. */
  burnMonthly: number;
  layers: RunwayLayer[];
  totalMonths: number;
  /** The break-glass line: retirement accounts after tax and penalty, shown but not counted unless turned on. */
  breakGlass: { dollars: number; months: number; counted: boolean };
}

/** Runway in months at a step on the staircase, layer by layer (spec section 4). */
export function runway(h: Household, stepId = "full"): Runway {
  const steps = staircase(h);
  const step = steps.find((s) => s.id === stepId) ?? steps[0]!;
  const health = healthAfterJobLossMonthly(h).monthly;
  const burn = step.monthly + health;
  const layers: RunwayLayer[] = [];
  const add = (id: string, label: string, dollars: number) => layers.push({ id, label, dollars, months: burn > 0 ? dollars / burn : 0 });
  add("cash", "Cash", cashBalance(h));
  // The ability to cut is the difference between full spending and this step, over the full-spending months the cash buys.
  const full = steps[0]!.monthly + health;
  const cutMonths = burn > 0 ? (cashBalance(h) / burn) - (cashBalance(h) / full) : 0;
  layers.push({ id: "cut", label: "The ability to cut", dollars: cutMonths * burn, months: Math.max(0, cutMonths) });
  const ui = unemploymentEstimate(h);
  add("unemployment", "Unemployment benefits", ui.afterTax);
  add("severance", "Severance", severanceDollars(h));
  let reachable = 0;
  let pretax = 0;
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.side !== "asset") continue;
      const balance = a.balance.value ?? 0;
      if (a.taxBucket.value === "roth" && resilience.runway.reachableInvestments.rothBasisCounts) reachable += a.rothBasis?.value ?? 0.5 * balance;
      else if (a.taxBucket.value === "taxable") reachable += balance * (1 - resilience.runway.reachableInvestments.taxableAfterTaxHaircut);
      else if (a.taxBucket.value === "pretax") pretax += balance;
    }
  }
  add("investments", "Reachable investments", reachable);
  // The cash layer already counts cash at the step's burn; the cut layer is informational, so the total uses cash once.
  const total = layers.filter((l) => l.id !== "cut").reduce((s, l) => s + l.months, 0);
  const bg = pretax * (1 - resilience.runway.breakGlass.pretaxTaxRateAssumed - resilience.runway.breakGlass.penaltyRate);
  const counted = h.resilience?.breakGlass?.value === true;
  return { stepId: step.id, burnMonthly: burn, layers, totalMonths: total + (counted && burn > 0 ? bg / burn : 0), breakGlass: { dollars: bg, months: burn > 0 ? bg / burn : 0, counted } };
}

/** The staircase read as "+N months" per step down, from cash alone (spec section 3, immediate reading). */
export function staircaseMonths(h: Household): { stepId: string; label: string; months: number; added: number }[] {
  const cash = cashBalance(h);
  const health = healthAfterJobLossMonthly(h).monthly;
  let previous = 0;
  return staircase(h).map((s) => {
    const months = s.monthly + health > 0 ? cash / (s.monthly + health) : 0;
    const row = { stepId: s.id, label: s.label, months, added: months - previous };
    previous = months;
    return row;
  });
}

/** The graceful path: full spending until a trigger, then one step down every N months; months until the cash runs out. */
export function gracefulPathMonths(h: Household): number {
  const cash = cashBalance(h);
  const health = healthAfterJobLossMonthly(h).monthly;
  const steps = staircase(h);
  const every = resilience.staircase.gracefulPathStepEveryMonths;
  let left = cash;
  let months = 0;
  for (let i = 0; i < steps.length; i++) {
    const burn = steps[i]!.monthly + health;
    if (burn <= 0) return Infinity;
    const stay = i === steps.length - 1 ? Infinity : every;
    const affordable = left / burn;
    if (affordable <= stay) return months + affordable;
    left -= burn * stay;
    months += stay;
  }
  return months;
}

// ---------------------------------------------------------------------------
// Disability and term life
// ---------------------------------------------------------------------------

export function disabilityGap(h: Household): { coveredMonthly: number; gapMonthly: number; waitingWeeks: number; monthsRunwayCovers: number; unsure: boolean } {
  const streams = h.self.income.kind === "rows" ? h.self.income.rows : [];
  const pay = streams.reduce((s, r) => s + r.grossAnnual.value, 0) / 12;
  const d = h.resilience?.disability;
  const pct = d?.replacesPercentOfPay.value ?? resilience.disability.defaultReplacesPercentOfPay;
  const waiting = d?.waitingWeeks.value ?? resilience.disability.defaultWaitingWeeks;
  const covered = (pay * pct) / 100;
  const burn = fullMonthlySpending(h);
  const gap = Math.max(0, burn - covered);
  const cash = cashBalance(h);
  return { coveredMonthly: covered, gapMonthly: gap, waitingWeeks: waiting, monthsRunwayCovers: gap > 0 ? cash / gap : Infinity, unsure: !d };
}

export function termLifeRange(h: Household): { low: number; high: number; applies: boolean } {
  const dependents = Math.max(h.resilience?.dependents?.value ?? 0, h.dependents?.length ?? 0);
  if (dependents <= 0) return { low: 0, high: 0, applies: false };
  const annual = fullMonthlySpending(h) * 12;
  const debts = h.accounts.kind === "rows" ? h.accounts.rows.filter((a) => a.side === "debt").reduce((s, a) => s + (a.balance.value ?? 0), 0) : 0;
  const [lo, hi] = resilience.disability.termLifeYearsOfSupport;
  return { low: annual * lo! + debts, high: annual * hi! + debts, applies: true };
}

// ---------------------------------------------------------------------------
// Shock tests
// ---------------------------------------------------------------------------

export interface ShockResult {
  id: string;
  label: string;
  sentence: string;
  /** Months of runway after the shock, at full spending. */
  runwayMonthsAfter: number;
  /** Years the FI date moves (positive means later), or null when never funded. */
  fiDeltaYears: number | null;
}

const clone = <T>(x: T): T => structuredClone(x);

/** Each shock rerun through the plan (spec section 7). Sizes from data/resilience.json unless overridden. */
export function shockTests(h: Household, deps: Deps = defaultDeps(), overrides: Record<string, number> = {}): ShockResult[] {
  const hh = requireComplete(h);
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const base = findFiDate(hh, band, deps);
  const baseRunway = runway(h).totalMonths;
  const ui = unemploymentEstimate(h);
  const out: ShockResult[] = [];
  const asOfMonth = h.asOf.slice(0, 7);
  const delta = (r: ReturnType<typeof findFiDate>) => (base.retirementYear === null || r.retirementYear === null ? null : r.retirementYear - base.retirementYear);
  const oneOff = (c: Household, label: string, amount: number) => {
    if (c.spending.kind !== "rows") return;
    c.spending.rows.push({ id: `shock-${label}`, category: "everythingElse", label, annual: { value: amount * 12, asOf: c.asOf, source: "computed", confidence: "roughly" }, start: asOfMonth, end: { kind: "date", date: asOfMonth } });
  };
  for (const s of resilience.shocks) {
    const c = clone(h);
    let sentence = "";
    let runwayAfter = baseRunway;
    if (s.id === "jobLoss" || s.id === "disability") {
      const months = overrides[s.id] ?? s.months!;
      // Income stops for the months, then resumes: the stream ends now and a copy starts after the gap.
      if (c.self.income.kind === "rows") {
        const resumed = c.self.income.rows.map((r) => ({ ...r, id: `${r.id}-resumed`, start: addMonthsYm(asOfMonth, months) }));
        for (const r of c.self.income.rows) r.end = { kind: "date", date: asOfMonth };
        c.self.income.rows.push(...resumed);
        const benefit = s.id === "jobLoss" && ui.eligible ? ui.afterTax : s.id === "disability" ? disabilityGap(h).coveredMonthly * months : 0;
        if (benefit > 0) c.self.income.rows.push({ id: "shock-benefit", type: s.id === "jobLoss" ? "unemployment" : "other", grossAnnual: { value: (benefit / months) * 12, asOf: c.asOf, source: "computed", confidence: "roughly" }, start: asOfMonth, end: { kind: "date", date: addMonthsYm(asOfMonth, months - 1) } });
      }
      const burn = fullMonthlySpending(h) + healthAfterJobLossMonthly(h).monthly;
      const cover = (cashBalance(h) + (s.id === "jobLoss" && ui.eligible ? ui.afterTax : s.id === "disability" ? disabilityGap(h).coveredMonthly * months : 0)) / Math.max(1, burn);
      runwayAfter = Math.max(0, cover - months);
      sentence = `A ${months}-month ${s.id === "jobLoss" ? "job loss" : "disability"}: your runway ${cover >= months ? `covers it with ${Math.round(cover - months)} months to spare` : `falls ${Math.round(months - cover)} months short`}`;
    } else if (s.id === "marketDrop") {
      const drop = (overrides[s.id] ?? s.stocksDropPercent!) / 100;
      if (c.accounts.kind === "rows") for (const a of c.accounts.rows) if (a.side === "asset" && a.balance.value !== null) a.balance = { ...a.balance, value: a.balance.value * (1 - drop * (a.allocation.value.stocks / 100)) };
      sentence = `A ${Math.round(drop * 100)}% drop in stocks today`;
    } else {
      const amount = overrides[s.id] ?? s.amount!;
      oneOff(c, s.label, amount);
      runwayAfter = Math.max(0, (cashBalance(h) - amount) / Math.max(1, fullMonthlySpending(h)));
      sentence = `A $${amount.toLocaleString("en-US")} ${s.label.toLowerCase()}: your cash covers it with ${Math.round(runwayAfter)} months of runway left`;
    }
    let r: ReturnType<typeof findFiDate>;
    try {
      r = findFiDate(requireComplete(c), band, deps, base.retirementYear ?? undefined);
    } catch {
      r = base;
    }
    const d = delta(r);
    const fiText = d === null ? "the plan is not fully funded" : d === 0 ? "your FI date does not move" : `your FI date moves ${Math.abs(d)} ${Math.abs(d) === 1 ? "year" : "years"} ${d > 0 ? "later" : "sooner"}`;
    out.push({ id: s.id, label: s.label, sentence: `${sentence}, and ${fiText}.`, runwayMonthsAfter: runwayAfter, fiDeltaYears: d });
  }
  return out;
}

function addMonthsYm(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** The sturdiness view headline (spec section 9). */
export function sturdiness(h: Household): { fullMonths: number; staircaseTotalMonths: number; gracefulMonths: number; headline: string } {
  const steps = staircaseMonths(h);
  const full = steps[0]?.months ?? 0;
  const total = steps[steps.length - 1]?.months ?? 0;
  const graceful = gracefulPathMonths(h);
  return { fullMonths: full, staircaseTotalMonths: total, gracefulMonths: graceful, headline: `Zombie readiness: ${Math.round(total)} months. At full spending you'd last ${Math.round(full)}. Cutting back gets you to ${Math.round(total)}.` };
}
