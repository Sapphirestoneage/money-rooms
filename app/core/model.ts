/**
 * The client file (DATA_MODEL.md): four drawers, a ledger, snapshots, a schema version. Every field
 * below is an input with a status and metadata; nothing derived is stored.
 */

import type { AssumptionsDrawer } from "./assumptions";
import type { Composite, Input, IsoDate } from "./values";

export type PersonRole = "self" | "partner";

export interface Person {
  id: string;
  role: PersonRole;
  /** Year and month (YYYY-MM). Age is computed, never stored. */
  birthDate: Input<string>;
}

export type FilingStatus = "single" | "marriedJoint" | "marriedSeparate" | "headOfHousehold";

export interface Household {
  people: Person[];
  filingStatus: Input<FilingStatus>;
  state: Input<string>;
  localTaxPercent: Input<number>;
}

export type IncomeType = "salary" | "hourly" | "selfEmployed" | "sideGig" | "benefits" | "support" | "other";
export type Stability = "steady" | "variable" | "seasonal" | "uncertain";

export interface IncomeStream {
  id: string;
  personId: string;
  label: string;
  type: Input<IncomeType>;
  grossMonthly: Input<number>;
  takeHomeMonthly: Input<number>;
  stability: Input<Stability>;
  start?: IsoDate;
  end?: IsoDate;
}

export interface SpendingBucket {
  category: string;
  monthly: Composite;
}

export type DebtKind = "card" | "student" | "auto" | "mortgage" | "family" | "medical" | "other";
export type Flexibility = "fixed" | "flexible" | "pausable";

export interface Debt {
  id: string;
  label: string;
  kind: Input<DebtKind>;
  balance: Input<number>;
  ratePercent: Input<number>;
  promo?: { ratePercent: Input<number>; endDate: Input<string>; rateAfterPercent: Input<number> };
  minimumMonthly: Input<number>;
  actualMonthly: Input<number>;
  stressRating: Input<number>;
  flexibility: Input<Flexibility>;
}

export type TaxBucket = "cash" | "taxable" | "pretax" | "roth" | "hsa" | "education" | "property";
export type LiquidityTier = "now" | "days" | "restricted" | "penalized";

export interface Account {
  id: string;
  label: string;
  personId?: string;
  taxBucket: Input<TaxBucket>;
  liquidityTier: Input<LiquidityTier>;
  balance: Input<number>;
  annualContribution: Input<number>;
  employerMatchAnnual: Input<number>;
}

export interface SafetyNetFacts {
  incomeStability: Input<Stability>;
  monthsToClose: Input<number>;
}

export interface Facts {
  income: Record<string, IncomeStream>;
  spending: Record<string, SpendingBucket>;
  debts: Record<string, Debt>;
  accounts: Record<string, Account>;
  safetyNet: SafetyNetFacts;
}

export interface Goal {
  id: string;
  label: string;
  kind: "event" | "goal";
  /** A date (YYYY-MM) or an age of the self person. */
  when: Input<string>;
  cost: Input<number>;
  cadence: "oneOff" | "monthly";
  durationMonths?: Input<number>;
  priority: "must" | "want" | "dream";
}

export interface ScenarioChange {
  path: string;
  value: unknown;
}

export interface Scenario {
  id: string;
  label: string;
  createdAt: IsoDate;
  changes: ScenarioChange[];
}

export interface LedgerEntry {
  id: string;
  at: IsoDate;
  by: "coach" | "client" | "promote" | "migration";
  path: string;
  from: unknown;
  to: unknown;
  why: string;
  owner: string;
}

export interface ClientMeta {
  id: string;
  /** A nickname the coach chooses; never a legal name. */
  label: string;
  createdAt: IsoDate;
  notes: string;
}

export interface Snapshot {
  takenAt: IsoDate;
  reason: "beforeImport" | "sessionStart" | "manual";
  /** The file as it was, without its own snapshots. */
  file: Omit<ClientFile, "snapshots">;
}

export interface ClientFile {
  schemaVersion: number;
  app: "money-rooms-v1";
  client: ClientMeta;
  updatedAt: IsoDate;
  household: Household;
  drawers: {
    facts: Facts;
    assumptions: AssumptionsDrawer;
    goals: Goal[];
    scenarios: Scenario[];
  };
  ledger: LedgerEntry[];
  snapshots: Snapshot[];
}
