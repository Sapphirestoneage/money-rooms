/**
 * Health care in retirement (M2 spec section 4 C): the ACA premium tax credit
 * before 65, with the 2026 cliff, and Medicare with IRMAA from 65. Pure helpers.
 * Rule values come from the rules registry; cost placeholders from data/healthcare.json.
 */

import healthcare from "../../data/healthcare.json";
import type { FilingStatus, RuleLedger } from "../model";

export const HEALTHCARE_DATA = healthcare;

interface FplRule {
  byHouseholdSize: Record<string, number>;
  eachAdditionalPerson: number;
}

/** The poverty guideline for a household size (48 states and DC). */
export function povertyLine(householdSize: number, ledger: RuleLedger): number {
  const r = ledger.get<FplRule>("health.fpl.2026");
  const n = Math.max(1, Math.floor(householdSize));
  const base = r.byHouseholdSize[String(Math.min(n, 8))]!;
  return base + Math.max(0, n - 8) * r.eachAdditionalPerson;
}

interface AcaRule {
  eligibleIncomePctFpl: [number, number];
  medicaidExpansionLowerBoundPctFpl: number;
  cliffAbove400: boolean;
  applicablePercentageTable: { fplFrom: number; fplTo: number; initial: number; final: number }[];
}

export interface AcaResult {
  /** MAGI as a percent of the poverty line. */
  pctFpl: number;
  /** The share of income the household pays for the benchmark plan (percent), or null outside the credit range. */
  applicablePercent: number | null;
  /** The credit for the year, in dollars. */
  credit: number;
  /** What the household pays for the benchmark plan after the credit. */
  netPremium: number;
  /** Below the lower bound: Medicaid in an expansion state, no credit in a non-expansion state (flagged). */
  belowRange: boolean;
  /** Above 400% of the poverty line with the cliff in force: no credit at all. */
  aboveCliff: boolean;
}

/** The applicable percentage for an income level, interpolated inside its band (IRC 36B(b)(3)(A)). */
export function applicablePercentage(pctFpl: number, table: AcaRule["applicablePercentageTable"]): number | null {
  for (const band of table) {
    const last = band === table[table.length - 1];
    if (pctFpl >= band.fplFrom && (pctFpl < band.fplTo || (last && pctFpl <= band.fplTo))) {
      if (band.fplTo === band.fplFrom) return band.initial;
      const share = (pctFpl - band.fplFrom) / (band.fplTo - band.fplFrom);
      return band.initial + share * (band.final - band.initial);
    }
  }
  return null;
}

/**
 * The premium tax credit for a year. `benchmarkPremium` is the annual second-lowest-cost
 * silver premium for the household. The credit is the benchmark less the applicable percent
 * of MAGI, never below zero, and nothing above 400% of the poverty line while the cliff stands.
 */
export function acaPremiumCredit(magi: number, householdSize: number, benchmarkPremium: number, ledger: RuleLedger): AcaResult {
  const r = ledger.get<AcaRule>("health.acaPtc.2026");
  const fpl = povertyLine(householdSize, ledger);
  const pctFpl = fpl > 0 ? (magi / fpl) * 100 : Infinity;
  const [lo, hi] = r.eligibleIncomePctFpl;
  if (pctFpl < lo) return { pctFpl, applicablePercent: null, credit: 0, netPremium: benchmarkPremium, belowRange: true, aboveCliff: false };
  if (r.cliffAbove400 && pctFpl > hi) return { pctFpl, applicablePercent: null, credit: 0, netPremium: benchmarkPremium, belowRange: false, aboveCliff: true };
  const pct = applicablePercentage(Math.min(pctFpl, hi), r.applicablePercentageTable);
  if (pct === null) return { pctFpl, applicablePercent: null, credit: 0, netPremium: benchmarkPremium, belowRange: false, aboveCliff: false };
  const contribution = (pct / 100) * magi;
  const credit = Math.max(0, benchmarkPremium - contribution);
  return { pctFpl, applicablePercent: pct, credit, netPremium: benchmarkPremium - credit, belowRange: false, aboveCliff: false };
}

/** The most MAGI that keeps a household at or under a target percent of the poverty line (the ACA knob). */
export function magiForPctFpl(pctFpl: number, householdSize: number, ledger: RuleLedger): number {
  return (pctFpl / 100) * povertyLine(householdSize, ledger);
}

interface IrmaaRule {
  lookbackYears: number;
  partBStandardMonthly: number;
  tiers: { single: [number | null, number | null]; marriedJoint: [number | null, number | null]; partBAdjustment: number; partBTotal: number; partDAdjustment: number }[];
  marriedSeparate: { magi: [number | null, number | null]; partBAdjustment: number; partDAdjustment: number }[];
}

export interface IrmaaResult {
  tier: number;
  /** Annual Part B premium including the adjustment. */
  partBAnnual: number;
  /** Annual Part D adjustment (the base Part D premium is separate). */
  partDAdjustmentAnnual: number;
  /** The MAGI used (from two years earlier). */
  magiUsed: number;
  /** The MAGI where the next tier starts, or null at the top. */
  nextTierAt: number | null;
}

/** Medicare premiums for a year from MAGI two years earlier (M2 spec C3). */
export function irmaa(magiTwoYearsBack: number, filingStatus: FilingStatus, ledger: RuleLedger): IrmaaResult {
  const r = ledger.get<IrmaaRule>("health.irmaa.2026");
  const inRange = (range: [number | null, number | null], m: number) => (range[0] === null || m > range[0]) && (range[1] === null || m <= range[1]);
  if (filingStatus === "marriedSeparate") {
    const i = r.marriedSeparate.findIndex((t) => inRange(t.magi, magiTwoYearsBack));
    const tier = r.marriedSeparate[Math.max(0, i)]!;
    return { tier: Math.max(0, i), partBAnnual: 12 * (r.partBStandardMonthly + tier.partBAdjustment), partDAdjustmentAnnual: 12 * tier.partDAdjustment, magiUsed: magiTwoYearsBack, nextTierAt: tier.magi[1] };
  }
  const column = filingStatus === "marriedJoint" ? "marriedJoint" : "single";
  const i = r.tiers.findIndex((t) => inRange(t[column], magiTwoYearsBack));
  const idx = Math.max(0, i);
  const tier = r.tiers[idx]!;
  return { tier: idx, partBAnnual: 12 * tier.partBTotal, partDAdjustmentAnnual: 12 * tier.partDAdjustment, magiUsed: magiTwoYearsBack, nextTierAt: tier[column][1] };
}

export function lookbackYears(ledger: RuleLedger): number {
  return ledger.get<IrmaaRule>("health.irmaa.2026").lookbackYears;
}

/** The yearly health care line in retirement (data/healthcare.json placeholders plus the rules). */
export interface HealthcareLine {
  total: number;
  pieces: { label: string; amount: number }[];
  flags: string[];
  aca?: AcaResult;
  irmaa?: IrmaaResult;
}

export function healthcareLine(args: {
  age: number;
  magiAca: number;
  magiTwoYearsBack: number;
  householdSize: number;
  filingStatus: FilingStatus;
  medicaidExpansion: boolean | null;
  ledger: RuleLedger;
  /** Households of two (household-two-spec 2.2): every living adult's age. Marketplace coverage is priced per adult under 65, Medicare per adult 65 and over, on the household's MAGI. Blank means one adult at `age`. */
  persons?: readonly { age: number }[];
  /** Internal: how many adults the marketplace premium covers. Set by the per-person branch. */
  adultsUnder65?: number;
}): HealthcareLine {
  if (args.persons && args.persons.length !== 1) {
    const under65 = args.persons.filter((p) => p.age < 65);
    const onMedicare = args.persons.filter((p) => p.age >= 65);
    const line: HealthcareLine = { total: 0, pieces: [], flags: [] };
    if (under65.length > 0) {
      const aca = healthcareLine({ ...args, age: under65[0]!.age, persons: [{ age: under65[0]!.age }], adultsUnder65: under65.length });
      line.total += aca.total;
      line.pieces.push(...aca.pieces);
      line.flags.push(...aca.flags);
      if (aca.aca) line.aca = aca.aca;
    }
    for (const p of onMedicare) {
      const med = healthcareLine({ ...args, age: p.age, persons: [{ age: p.age }] });
      line.total += med.total;
      line.pieces.push(...med.pieces);
      if (p === onMedicare[0]) line.flags.push(...med.flags);
      if (med.irmaa) line.irmaa = med.irmaa;
    }
    return line;
  }
  const flags: string[] = [];
  if (args.age < 65) {
    const adults = args.adultsUnder65 ?? Math.max(1, args.householdSize);
    const benchmark = healthcare.before65.benchmarkSilverPremiumAnnualPerAdult.value * adults;
    const aca = acaPremiumCredit(args.magiAca, args.householdSize, benchmark, args.ledger);
    let cost = aca.netPremium + healthcare.before65.outOfPocketAnnual.value;
    if (aca.belowRange) {
      if (args.medicaidExpansion === true) {
        cost = healthcare.before65.outOfPocketAnnual.value;
        flags.push("Income is under the Medicaid line this year, so the plan assumes Medicaid instead of a marketplace credit.");
      } else {
        flags.push("Income is under 100% of the poverty line this year, so no marketplace credit applies. In a Medicaid expansion state this would be Medicaid.");
      }
    }
    if (aca.aboveCliff) flags.push("Income is above 400% of the poverty line this year, so the plan pays the full marketplace premium (the subsidy cliff is back for 2026).");
    return { total: cost, pieces: [{ label: "Marketplace premium after the credit", amount: cost }], flags, aca };
  }
  const i = irmaa(args.magiTwoYearsBack, args.filingStatus, args.ledger);
  const partD = healthcare.from65.partDBasePremiumAnnual.value + i.partDAdjustmentAnnual;
  const other = healthcare.from65.supplementAndOutOfPocketAnnual.value;
  if (i.tier > 0) flags.push(`Medicare premiums are in IRMAA tier ${i.tier} this year because income two years earlier was ${Math.round(i.magiUsed).toLocaleString("en-US")}.`);
  return { total: i.partBAnnual + partD + other, pieces: [{ label: "Medicare Part B", amount: i.partBAnnual }, { label: "Part D", amount: partD }, { label: "Supplement and out of pocket", amount: other }], flags, irmaa: i };
}
