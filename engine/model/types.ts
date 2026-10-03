/**
 * Data model types for Money Rooms, level one.
 *
 * This file mirrors docs/data-dictionary.md section by section. If a field
 * isn't in the dictionary, it isn't here. Fields marked "Later" have their
 * shape settled now but are not built in M1.
 *
 * Nothing derivable is stored (D2). Ages, totals, taxes, and the FI date are
 * computed by the engine from these inputs.
 */

import type { AccountPresetKey } from "./presets";

// ---------------------------------------------------------------------------
// Section 2.1: metadata on every value
// ---------------------------------------------------------------------------

export type Source = "user" | "statement" | "preset" | "assumptionSet" | "computed";

export type Confidence = "known" | "lookUp" | "roughly" | "computed" | "notForMe";

/** A calendar date, YYYY-MM-DD. */
export type IsoDate = string;

/** A month and year, YYYY-MM. */
export type YearMonth = string;

export interface Meta {
  /** The date the value was true. */
  asOf: IsoDate;
  source: Source;
  confidence: Confidence;
}

/** A stored value with its metadata. */
export interface Value<T> extends Meta {
  value: T;
}

/** The "I don't have this" answer (2.8). Counts as complete. */
export interface NotForMe extends Meta {
  value: null;
  confidence: "notForMe";
}

export type Answer<T> = Value<T> | NotForMe;

/**
 * A list question (2.5, 2.8). Unanswered, answered "I don't have any",
 * or answered with rows.
 */
export type ListAnswer<T> =
  | { kind: "unanswered" }
  | { kind: "none"; asOf: IsoDate }
  | { kind: "rows"; rows: T[] };

// ---------------------------------------------------------------------------
// Section 2.6: dates for anything that changes
// ---------------------------------------------------------------------------

export type EndRule =
  | { kind: "date"; date: YearMonth }
  | { kind: "age"; age: number }
  | { kind: "retirement" };

/** An age in years and months, for claiming ages and similar. */
export interface AgeYearsMonths {
  years: number;
  months: number;
}

// ---------------------------------------------------------------------------
// Section 4: bands
// ---------------------------------------------------------------------------

/** [low, likely, high]. Which end is "worst" depends on the assumption. */
export type Band = readonly [low: number, likely: number, high: number];

export type BandName = "worst" | "likely" | "best";

// ---------------------------------------------------------------------------
// Section 3.2 and 3.3: filing status and state
// ---------------------------------------------------------------------------

export type FilingStatus = "single" | "marriedJoint" | "marriedSeparate" | "headOfHousehold";

export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export type StateCode = (typeof STATE_CODES)[number];

// ---------------------------------------------------------------------------
// Section 3.4: income streams
// ---------------------------------------------------------------------------

export type IncomeType =
  | "salary"
  | "hourly"
  | "selfEmployed"
  | "sideGig"
  | "allowance"
  | "rental" // Later
  | "other";

/** The income types that have a growth default in an assumption set. */
export type IncomeGrowthType = Exclude<IncomeType, "rental">;

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export type PreTaxDeductionType = "401k" | "403b" | "hsa" | "healthPremium" | "other";

export interface PreTaxDeduction {
  id: string;
  type: PreTaxDeductionType;
  /** Annual dollars. */
  annual: Value<number>;
}

export interface EmployerMatch {
  /** Percent of the person's contribution that is matched (100 = dollar for dollar). */
  matchPercent: Value<number>;
  /** The match stops once contributions reach this percent of pay. */
  capPercentOfPay: Value<number>;
}

export interface IncomeStream {
  id: string;
  type: IncomeType;
  label?: string;
  /** Annual gross dollars (2.4). */
  grossAnnual: Value<number>;
  /** Annual take-home as entered, if given. Used for reconciliation (D5). */
  enteredTakeHome?: Value<number>;
  /** Hourly streams only. 1 to 80. */
  hoursPerWeek?: Value<number>;
  payFrequency?: Value<PayFrequency>;
  preTaxDeductions?: PreTaxDeduction[];
  employerMatch?: EmployerMatch;
  /** Self-employed and side gig: annual business expenses. */
  businessExpensesAnnual?: Value<number>;
  start?: YearMonth;
  end: EndRule;
  /** Real growth, percent per year. Blank means the assumption set default for this type. */
  growth?: Value<Band>;
}

// ---------------------------------------------------------------------------
// Section 3.5: spending
// ---------------------------------------------------------------------------

export type ContinuesInRetirement = "yes" | "no" | "changes";

/** Later (D8). */
export type SpendingWhy = "planned" | "unavoidable" | "mistake";

export interface SpendingRow {
  id: string;
  /** A category id from data/spending-categories.json. */
  category: string;
  /** Annual dollars, smoothed (D7). */
  annual: Value<number>;
  /** Blank means the category default. */
  continuesInRetirement?: Value<ContinuesInRetirement>;
  /** Annual dollars in retirement, when continuesInRetirement is "changes". */
  retirementAnnual?: Value<number>;
  start?: YearMonth;
  end?: EndRule;
  /** Later. */
  why?: SpendingWhy;
}

// ---------------------------------------------------------------------------
// Section 3.6: accounts, assets and debts
// ---------------------------------------------------------------------------

export type AccountSide = "asset" | "debt";

export type TaxBucket = "cash" | "taxable" | "pretax" | "roth" | "hsa";

export type Liquidity = "now" | "days" | "penaltyBefore59Half" | "restricted";

/** Percent of the account in each class. The three sum to 100. */
export interface Allocation {
  stocks: number;
  bonds: number;
  cash: number;
}

export type AssetClass = keyof Allocation;

export interface AccountCommon {
  id: string;
  preset: AccountPresetKey;
  /** Blank means the preset label. */
  name?: Value<string>;
  institution?: string;
  /** Dollars, with asOf. Roughly allowed. Side carries the sign. */
  balance: Answer<number>;
  /** 1 to 5. Not asked in round one (D10). */
  stress?: Value<number>;
}

export interface AssetAccount extends AccountCommon {
  side: "asset";
  taxBucket: Value<TaxBucket>;
  liquidity: Value<Liquidity>;
  allocation: Value<Allocation>;
  /** Dollars per year. */
  annualContribution: Value<number>;
  /** Percent per year. */
  fees: Value<number>;
  /** Later. */
  costBasis?: Value<number>;
  /** Later. */
  holdings?: Value<string[]>;
}

export interface PromoRate {
  /** Percent per year during the promo. */
  rate: Value<number>;
  endDate: Value<YearMonth>;
  /** Percent per year after the promo ends. */
  rateAfter: Value<number>;
}

export type DebtPurpose = "personal" | "business";

export type ForgivenessPath = "none" | "idr" | "pslf";

export interface DebtAccount extends AccountCommon {
  side: "debt";
  /** Percent per year. */
  rate: Value<number>;
  promo?: PromoRate;
  /** Entered monthly, stored annual (2.4). */
  minimumPaymentAnnual: Value<number>;
  /** Entered monthly, stored annual. Defaults to the minimum. */
  actualPaymentAnnual: Value<number>;
  purpose: Value<DebtPurpose>;
  interestDeductible: Value<boolean>;
  /** Later. */
  forgivenessPath?: Value<ForgivenessPath>;
}

export type Account = AssetAccount | DebtAccount;

// ---------------------------------------------------------------------------
// Section 4: assumptions
// ---------------------------------------------------------------------------

/**
 * Life phases (5.1 layer 2, D17). Discretionary spending scales by phase.
 * startAge null means "from retirement". endAge null means "and up".
 */
export interface LifePhase {
  id: string;
  label: string;
  startAge: number | null;
  endAge: number | null;
  /** 1.0 means 100%. */
  discretionaryMultiplier: number;
}

/**
 * What a household stores about assumptions: the active set and any
 * single-value overrides. The set's numbers are never copied in (D2).
 */
export interface HouseholdAssumptions {
  /** A key in data/assumption-sets.json. */
  set: string;
  overrides: AssumptionOverrides;
}

export interface AssumptionOverrides {
  returns?: Partial<Record<AssetClass, Value<Band>>>;
  inflation?: Value<Band>;
  incomeGrowth?: Partial<Record<IncomeGrowthType, Value<Band>>>;
  /** Percent of the scheduled Social Security benefit paid, as a fraction (1.0 = 100%). */
  socialSecurityPolicy?: Value<Band>;
  planToAge?: Value<number>;
  phases?: Value<LifePhase[]>;
}

/** The effective assumptions after the set and overrides are merged. */
export interface ResolvedAssumptions {
  set: string;
  returns: Record<AssetClass, Value<Band>>;
  inflation: Value<Band>;
  incomeGrowth: Record<IncomeGrowthType, Value<Band>>;
  socialSecurityPolicy: Value<Band>;
  planToAge: Value<number>;
  phases: Value<LifePhase[]>;
}

// ---------------------------------------------------------------------------
// Section 4.4: the parts of Social Security the person owns
// ---------------------------------------------------------------------------

export interface PersonSocialSecurity {
  /** Fact. Covered earnings by calendar year (key YYYY). Blank means estimated from income. */
  earningsRecord?: Value<Record<string, number>>;
  /** Decision. Blank means full retirement age. */
  claimingAge?: Value<AgeYearsMonths>;
  /** Explicit override to zero. Zero is never a band. */
  claimZero?: Value<boolean>;
}

// ---------------------------------------------------------------------------
// Section 5: goals
// ---------------------------------------------------------------------------

export type GoalPriority = "must" | "want" | "dream";

/** Later (5.1 layer 3). Shape settled now. */
export interface GoalBucket {
  id: string;
  name: string;
  cost: Value<number>;
  cadence: "oneOff" | "annual";
  startAge: number;
  endAge: number;
  priority: GoalPriority;
}

// ---------------------------------------------------------------------------
// The person and the household
// ---------------------------------------------------------------------------

export interface Person {
  /** 3.1. Required. Always known. */
  birthDate?: Value<YearMonth>;
  /** 3.2. Defaults to single, roughly. */
  filingStatus: Value<FilingStatus>;
  /** 3.3. Required. */
  state?: Value<StateCode>;
  /** 3.4. Required to answer. */
  income: ListAnswer<IncomeStream>;
  socialSecurity: PersonSocialSecurity;
}

export interface Household {
  /** Export format version (M1 step 7). */
  schemaVersion: 1;
  /** The plan date. Year 0 is a stub period from this month through December (E8). */
  asOf: IsoDate;
  self: Person;
  /** D18: shape from day one, logic later. */
  partner?: Person;
  /** 3.5. Required to answer. */
  spending: ListAnswer<SpendingRow>;
  /** 3.6. Required to answer. */
  accounts: ListAnswer<Account>;
  assumptions: HouseholdAssumptions;
  /** Later. */
  goals: GoalBucket[];
}
