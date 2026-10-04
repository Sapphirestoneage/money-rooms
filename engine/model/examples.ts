/**
 * Loading an example household file (tests/households/*.json) into the data
 * model. The files use a short entry format; this turns it into stored values
 * with metadata. The same examples are shown in the app (tests/README.md).
 */

import type {
  Account,
  EndRule,
  FilingStatus,
  Household,
  IncomeStream,
  IncomeType,
  IsoDate,
  PayFrequency,
  PreTaxDeduction,
  PreTaxDeductionType,
  SavingsStrategy,
  SpendingRow,
  StateCode,
  WorkplaceAccountType,
} from "./types";
import { isYearMonth } from "./dates";
import { emptyHousehold } from "./household";
import { annualFromMonthly, percentOfPay } from "./normalize";
import { assetFromPreset, debtFromPreset, getAccountPreset, isAccountPresetKey } from "./presets";
import { userValue } from "./values";

export interface ExampleIncome {
  id: string;
  type: IncomeType;
  grossAnnual: number;
  payFrequency?: PayFrequency;
  end?: string;
  employerMatch?: { matchPercent: number; capPercentOfPay: number };
  /** For 401(k) and 403(b), `annual` is converted to a percent of pay. `accountType` defaults to traditional. */
  preTaxDeductions?: { type: PreTaxDeductionType; annual: number; accountType?: WorkplaceAccountType }[];
  businessExpensesAnnual?: number;
}

export interface ExampleAccount {
  id: string;
  preset: string;
  balance: number;
  rate?: number;
  minPaymentMonthly?: number;
  actualPaymentMonthly?: number;
  stress?: number;
  /** A promo rate on a debt: the rate now, the last month it applies (YYYY-MM), and the rate after. */
  promo?: { rate: number; endDate: string; rateAfter: number };
  /** A display name for the account. */
  name?: string;
  /** Family loans (dictionary 9.16). */
  paymentFlexibility?: "fixed" | "flexible" | "pausable";
  possibleForgiveness?: "unknown" | "none" | "possible";
  lenders?: number;
}

export interface ExampleDependent {
  id: string;
  label?: string;
  birthDate: string;
  /** Defaults to true. */
  livesWithYou?: boolean;
}

export interface ExampleHome {
  value: number;
  maintenanceReservePercent?: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
}

export interface ExampleHouseholdFile {
  id: string;
  label: string;
  story?: string;
  inputs: {
    birthDate: string;
    state: StateCode;
    filingStatus?: FilingStatus;
    hsaEligible?: boolean;
    savingsStrategy?: SavingsStrategy;
    income: ExampleIncome[];
    /** `end` as parseEndRule reads it: "retirement", "age:N", "YYYY-MM", or "dependentAge:<id>:N". */
    spending: { category: string; annual: number; label?: string; end?: string }[];
    accounts: ExampleAccount[];
    dependents?: ExampleDependent[];
    home?: ExampleHome;
    /** Local earned income tax, percent (dictionary 9.15). */
    localTaxPercent?: number;
  };
  expected?: unknown;
  notes?: string;
}

/** "retirement", "age:30", or "YYYY-MM". */
export function parseEndRule(s: string | undefined): EndRule {
  if (!s || s === "retirement") return { kind: "retirement" };
  if (s.startsWith("age:")) {
    const age = Number(s.slice(4));
    if (!Number.isFinite(age)) throw new Error(`Bad end rule "${s}"`);
    return { kind: "age", age };
  }
  if (s.startsWith("dependentAge:")) {
    const [, dependentId, ageText] = s.split(":");
    const age = Number(ageText);
    if (!dependentId || !Number.isFinite(age)) throw new Error(`Bad end rule "${s}"`);
    return { kind: "dependentAge", dependentId, age };
  }
  if (isYearMonth(s)) return { kind: "date", date: s };
  throw new Error(`Bad end rule "${s}"`);
}

export function householdFromExample(file: ExampleHouseholdFile, asOf: IsoDate): Household {
  const h = emptyHousehold(asOf);
  const i = file.inputs;

  h.self.birthDate = userValue(i.birthDate, asOf);
  h.self.state = userValue(i.state, asOf);
  if (i.filingStatus) h.self.filingStatus = userValue(i.filingStatus, asOf);
  if (i.hsaEligible !== undefined) h.self.hsaEligible = userValue(i.hsaEligible, asOf);
  if (i.savingsStrategy) h.savingsStrategy = userValue(i.savingsStrategy, asOf);

  const income: IncomeStream[] = i.income.map((s) => {
    const confidence = s.type === "salary" ? "known" : "roughly";
    const stream: IncomeStream = { id: s.id, type: s.type, grossAnnual: userValue(s.grossAnnual, asOf, confidence), end: parseEndRule(s.end) };
    if (s.payFrequency) stream.payFrequency = userValue(s.payFrequency, asOf);
    if (s.employerMatch) {
      stream.employerMatch = { matchPercent: userValue(s.employerMatch.matchPercent, asOf), capPercentOfPay: userValue(s.employerMatch.capPercentOfPay, asOf) };
    }
    if (s.preTaxDeductions) {
      stream.preTaxDeductions = s.preTaxDeductions.map((d, n): PreTaxDeduction => {
        const id = `${s.id}-ded-${n}`;
        if (d.type === "401k" || d.type === "403b") {
          return { id, type: d.type, percentOfPay: userValue(percentOfPay(d.annual, s.grossAnnual), asOf), accountType: userValue(d.accountType ?? "traditional", asOf) };
        }
        return { id, type: d.type, annual: userValue(d.annual, asOf) };
      });
    }
    if (s.businessExpensesAnnual !== undefined) stream.businessExpensesAnnual = userValue(s.businessExpensesAnnual, asOf, "roughly");
    return stream;
  });
  h.self.income = income.length ? { kind: "rows", rows: income } : { kind: "none", asOf };

  const spending: SpendingRow[] = i.spending.map((r, n) => ({ id: `spend-${n}-${r.category}`, category: r.category, annual: userValue(r.annual, asOf, "roughly"), ...(r.label ? { label: r.label } : {}), ...(r.end ? { end: parseEndRule(r.end) } : {}) }));
  h.spending = spending.length ? { kind: "rows", rows: spending } : { kind: "none", asOf };

  const accounts: Account[] = i.accounts.map((a) => {
    if (!isAccountPresetKey(a.preset)) throw new Error(`Unknown preset "${a.preset}" on account "${a.id}"`);
    const preset = getAccountPreset(a.preset);
    const balance = userValue(a.balance, asOf);
    if (preset.side === "asset") return assetFromPreset(a.preset, a.id, balance, asOf);
    if (a.rate === undefined || a.minPaymentMonthly === undefined) throw new Error(`Debt "${a.id}" needs rate and minPaymentMonthly`);
    const debt = debtFromPreset(a.preset, a.id, balance, {
      rate: userValue(a.rate, asOf),
      minimumPaymentAnnual: userValue(annualFromMonthly(a.minPaymentMonthly), asOf),
      ...(a.actualPaymentMonthly !== undefined ? { actualPaymentAnnual: userValue(annualFromMonthly(a.actualPaymentMonthly), asOf) } : {}),
    }, asOf);
    if (a.stress !== undefined) debt.stress = userValue(a.stress, asOf);
    if (a.promo) {
      if (!isYearMonth(a.promo.endDate)) throw new Error(`Debt "${a.id}" promo endDate must be YYYY-MM`);
      debt.promo = { rate: userValue(a.promo.rate, asOf), endDate: userValue(a.promo.endDate, asOf), rateAfter: userValue(a.promo.rateAfter, asOf) };
    }
    if (a.name) debt.name = userValue(a.name, asOf);
    if (a.paymentFlexibility) debt.paymentFlexibility = userValue(a.paymentFlexibility, asOf);
    if (a.possibleForgiveness) debt.possibleForgiveness = userValue(a.possibleForgiveness, asOf);
    if (a.lenders !== undefined) debt.lenders = userValue(a.lenders, asOf);
    return debt;
  });
  h.accounts = accounts.length ? { kind: "rows", rows: accounts } : { kind: "none", asOf };
  if (i.dependents?.length) {
    h.dependents = i.dependents.map((d) => {
      if (!isYearMonth(d.birthDate)) throw new Error(`Dependent "${d.id}" birthDate must be YYYY-MM`);
      return { id: d.id, birthDate: userValue(d.birthDate, asOf), livesWithYou: userValue(d.livesWithYou ?? true, asOf), ...(d.label ? { label: userValue(d.label, asOf) } : {}) };
    });
  }
  if (i.home) {
    h.home = { value: userValue(i.home.value, asOf, "roughly") };
    if (i.home.maintenanceReservePercent !== undefined) h.home.maintenanceReservePercent = userValue(i.home.maintenanceReservePercent, asOf);
    if (i.home.propertyTaxAnnual !== undefined) h.home.propertyTaxAnnual = userValue(i.home.propertyTaxAnnual, asOf);
    if (i.home.insuranceAnnual !== undefined) h.home.insuranceAnnual = userValue(i.home.insuranceAnnual, asOf);
  }
  if (i.localTaxPercent !== undefined) h.self.localTaxPercent = userValue(i.localTaxPercent, asOf);

  return h;
}
