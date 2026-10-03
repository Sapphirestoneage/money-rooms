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
  | "unemployment"
  | "allowance"
  | "rental" // Later
  | "other";

/** The income types that have a growth default in an assumption set. */
export type IncomeGrowthType = Exclude<IncomeType, "rental" | "unemployment">;

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export type PreTaxDeductionType = "401k" | "403b" | "hsa" | "healthPremium" | "other";

export type WorkplaceAccountType = "traditional" | "roth";

/**
 * A workplace plan contribution (401(k) or 403(b)). Stored as a percent of that
 * stream's pay, so it scales with raises, and it stays in the account type the
 * person chose in every savings strategy (data dictionary 3.4).
 */
export interface WorkplaceContribution {
  id: string;
  type: "401k" | "403b";
  /** Percent of the stream's gross pay (4 means 4%). */
  percentOfPay: Value<number>;
  accountType: Value<WorkplaceAccountType>;
}

/** Other payroll deductions, stored as annual dollars. */
export interface AnnualDeduction {
  id: string;
  type: "hsa" | "healthPremium" | "other";
  /** Annual dollars. */
  annual: Value<number>;
}

export type PreTaxDeduction = WorkplaceContribution | AnnualDeduction;

export function isWorkplaceContribution(d: PreTaxDeduction): d is WorkplaceContribution {
  return d.type === "401k" || d.type === "403b";
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
  /** True when the income is expected but not yet certain (3.4). It counts in the plan and is named on the result screen. */
  notConfirmed?: boolean;
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
  /** A category id from data/spending-categories.json. Several rows can share one. */
  category: string;
  /** The person's own name for the row ("Rent", "Health insurance after 26"). Optional. */
  label?: string;
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
  /** M2 (spec section 7): taxable accounts. Blank means 70% of the balance, roughly. */
  costBasis?: Value<number>;
  /** M2: Roth accounts. Regular contributions, which come out first and free. Blank means 50% of the balance, roughly. */
  rothBasis?: Value<number>;
  /** M2: Roth accounts. Past conversions into this account, each with its own five-year clock (dictionary 9.6). */
  conversions?: RothConversion[];
  /** M2: HSA. Qualified medical receipts saved for later tax-free reimbursement (strategy A6). */
  savedReceipts?: Value<number>;
  /** M2: the workplace plan this account belongs to (dictionary 9.2). */
  planId?: string;
  /** Dictionary 9.4. Blank means self. */
  owner?: AccountOwner;
  /** Later. */
  holdings?: Value<string[]>;
}

export type AccountOwner = "self" | "partner" | "joint";

/** 72(t) payment methods (M2 strategy A3). */
export type SeppMethod = "rmd" | "fixedAmortization" | "fixedAnnuitization";

/** Dictionary 9.6. A past Roth conversion. The five-year clock starts January 1 of the conversion year. */
export interface RothConversion {
  id: string;
  fromAccountId?: string;
  /** The taxable part converted, in dollars. */
  amount: Value<number>;
  month: YearMonth;
}

/** Dictionary 9.2. The employer's plan: accounts hold money, the plan holds the rules. */
export type WorkplacePlanType = "401k" | "403b" | "457bGovernmental" | "457bNonGovernmental" | "tsp" | "simpleIra" | "sepIra" | "solo401k";
export type YesNoUnknown = "yes" | "no" | "unknown";

export interface WorkplacePlan {
  id: string;
  /** The income stream of the employer. */
  employerIncomeId: string;
  planType: WorkplacePlanType;
  ruleOf55Allowed: Value<YesNoUnknown>;
  megaBackdoorAllowed: Value<YesNoUnknown>;
  rothOffered: Value<boolean>;
  /** Age in years at separation from this employer, or blank for retirement (M2 spec section 7). */
  separationAge?: Value<number>;
  owner?: AccountOwner;
}

/** Dictionary 9.3. A business groups self-employed income, expenses, and business debts. */
export type BusinessEntityType = "soleProprietor" | "singleMemberLlc" | "partnership" | "sCorp" | "cCorp";

export interface Business {
  id: string;
  name: string;
  entityType: Value<BusinessEntityType>;
  incomeIds: string[];
  expenseAnnual: Value<number>;
  debtIds: string[];
  ownerSalary?: Value<number>;
  /** A record only. Where an entity is formed never changes where income is taxed. */
  stateOfFormation?: Value<StateCode>;
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
  /** Level 5: a dream that outlasts you moves into the legacy projects while keeping its price card. */
  legacy?: boolean;
}

// ---------------------------------------------------------------------------
// The person and the household
// ---------------------------------------------------------------------------

/** 4.6. Decision. Sets the order of the savings waterfall (E10, E11). */
export type SavingsStrategy = "maxTaxSavingsNow" | "maxTaxFreeGrowth" | "enteredOnly";

export interface Person {
  /** 3.1. Required. Always known. */
  birthDate?: Value<YearMonth>;
  /** 3.2. Defaults to single, roughly. */
  filingStatus: Value<FilingStatus>;
  /** 3.3. Required. */
  state?: Value<StateCode>;
  /** 3.4. Required to answer. */
  income: ListAnswer<IncomeStream>;
  /** 3.7. Covered by a high-deductible health plan. Defaults to no, roughly. */
  hsaEligible: Value<boolean>;
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
  /** 4.6. Defaults to enteredOnly, roughly. */
  savingsStrategy: Value<SavingsStrategy>;
  /** Later. */
  goals: GoalBucket[];
  /** M2, dictionary 9.2 (Proposed). */
  plans?: WorkplacePlan[];
  /** M2, dictionary 9.3 (Proposed). */
  businesses?: Business[];
  /** M2, spec section 7: the drawdown details that unlock the True FI number. */
  drawdown?: DrawdownInputs;
  /** M3, dictionary 9.7 (Proposed): what the person did with each small win, by win id. */
  smallWins?: Record<string, "done" | "notForMe" | "later">;
  /** Level 2 (dictionary 9.8, Proposed): resilience inputs. */
  resilience?: ResilienceInputs;
  /** Level 3 (dictionary 9.9, Proposed): milestone settings. */
  milestones?: MilestoneSettings;
  /** Level 5 (dictionary 9.10, Proposed): legacy inputs. */
  legacy?: LegacyInputs;
  /** M5 (dictionary 9.5, Proposed): scenario blocks, layered proposed changes never applied to the real rows. */
  blocks?: ScenarioBlock[];
}

/** Dictionary 9.5. One proposed change inside a block. */
export type BlockChange =
  | { target: "spending"; op: "add"; category: string; label: string; annual: number; start?: YearMonth; end?: YearMonth }
  | { target: "spending"; op: "scale"; factor: number; start?: YearMonth; end?: YearMonth }
  | { target: "income"; op: "add"; type: IncomeType; label: string; grossAnnual: number; start?: YearMonth; end?: YearMonth }
  | { target: "income"; op: "scale"; factor: number; start?: YearMonth; end?: YearMonth }
  | { target: "income"; op: "pause"; start: YearMonth; end: YearMonth }
  | { target: "asset"; op: "add"; preset: AccountPresetKey; label: string; balance: number }
  | { target: "debt"; op: "add"; preset: AccountPresetKey; label: string; balance: number; ratePercent: number; paymentMonthly: number }
  | { target: "asset"; op: "remove"; amount: number; from: "cash" | "taxable" };

export type ScenarioBlockType = "home" | "car" | "kid" | "jobChange" | "sabbatical" | "geoArbitrage" | "sideHustle" | "inheritance" | "marriage" | "custom";

export interface ScenarioBlock {
  id: string;
  type: ScenarioBlockType;
  name: string;
  /** One or more start months, to compare timings side by side. The first is the chosen one. */
  startDates: YearMonth[];
  changes: BlockChange[];
  /** Per block: how sure the numbers are. Defaults from the questionnaire are roughly. */
  confidence: "known" | "lookUp" | "roughly";
  relation?: { kind: "inAdditionTo" | "replacing"; blockId: string };
  enabled: boolean;
}

/** Level 2 (docs/levels/level-2-resilience.md section 11). */
export type IncomeStability = "steady" | "normal" | "variable";

export interface ResilienceInputs {
  incomeStability?: Value<IncomeStability>;
  /** Months to close the emergency gap. Blank means 12. */
  monthsToClose?: Value<number>;
  /** Blank means from the income type: W-2 eligible, self-employed and gigs not. */
  unemploymentEligible?: Value<boolean>;
  /** Weeks of pay the job would give on the way out. Blank means 0. */
  severanceWeeks?: Value<number>;
  /** Employer disability coverage: the share of pay it replaces (percent) and the waiting period in weeks. Blank means unsure. */
  disability?: { replacesPercentOfPay: Value<number>; waitingWeeks: Value<number> };
  /** People who depend on this income. Blank means none. */
  dependents?: Value<number>;
  /** Monthly must-pays that survive every step down (health insurance, phone, debt minimums are added by the engine). Dollars per year. */
  extraMustPaysAnnual?: Value<number>;
  /** Whether retirement accounts count as runway (break glass). Blank means no. */
  breakGlass?: Value<boolean>;
}

/** Level 3 (docs/levels/level-3-life-plans.md section 9). Every one has a default from data/milestones.json. */
export interface MilestoneSettings {
  coastAge?: Value<number>;
  baristaIncomeAnnual?: Value<number>;
  fatFiMultiplier?: Value<number>;
  flexFiTrimPercent?: Value<number>;
  slowFiTargetAge?: Value<number>;
  walkAwayMonths?: Value<number>;
  businessRunwayMonths?: Value<number>;
}

/** Level 5 (docs/levels/level-5-legacy.md section 9). */
export type BasicsAnswer = "yes" | "no" | "unsure";

export interface LegacyProject {
  id: string;
  name: string;
  type: "book" | "mentoring" | "scholarship" | "community" | "family" | "business" | "creative" | "other";
  oneOffCost: Value<number>;
  annualCost: Value<number>;
  hoursPerWeek: Value<number>;
  startAge: number;
  /** Years, or null for forever. */
  horizonYears: number | null;
}

export interface LegacyInputs {
  projects?: LegacyProject[];
  /** Share of the FI number set aside for legacy. Blank means 10%. */
  breathingRoomPercent?: Value<number>;
  basics?: { beneficiaries: Value<BasicsAnswer>; will: Value<BasicsAnswer>; healthcareProxy: Value<BasicsAnswer>; powerOfAttorney: Value<BasicsAnswer> };
  /** Free hours a week after FI. Blank means 45. */
  freeHoursPerWeek?: Value<number>;
}

/** M2 spec section 7, the level-two inputs that are not on an account. */
export interface DrawdownInputs {
  /** The year of the first Roth IRA contribution, for the five-year earnings clock. Blank means the year of the oldest Roth account, or five years ago when unknown. */
  firstRothYear?: Value<number>;
  /** Expected heir tax rate, percent. Blank means 22, roughly (Level 5 Y5). */
  heirTaxRatePercent?: Value<number>;
  /** People covered on the health plan, for the poverty line. Blank means 1. */
  acaHouseholdSize?: Value<number>;
  /** Blank means the state's value from data/, else unknown. */
  medicaidExpansionState?: Value<boolean>;
}
