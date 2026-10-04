/**
 * Materiality (docs/m3-spec.md section 4): how much each rough or missing
 * input could move the result, and the three lines that decide what is worth
 * asking. Pure functions. Ranges and lines come from data/materiality.json.
 *
 * The FI number here is the smooth dollar measure the spec asks for: assets
 * at the FI date in the likely band. An input's sensitivity is measured by
 * nudging it to each end of its plausible range, rerunning the plan with the
 * retirement year held, and discounting the change in the ending balance back
 * to the FI date. That moves smoothly where the date itself moves in whole years.
 */

import materiality from "../../data/materiality.json";
import type { Confidence, Household } from "../model";
import { resolveAssumptions } from "../model";
import { resolveBand, type BandNumbers } from "../projection/bands";
import { defaultDeps, findFiDate, runFor, type Deps } from "../projection/fi";
import { requireComplete, type CompleteHousehold } from "../projection/timeline";
import { agedValues, effectiveRangeKind } from "./staleness";

export const MATERIALITY = materiality;

export type RangeKind = Confidence | "default";

/** The plausible range for a kind of value, as a fraction (0.25 means plus or minus 25%). */
export function plausibleRange(kind: RangeKind): number {
  return (materiality.plausibleRangeByKind as Record<string, number>)[kind] ?? 0;
}

export interface MaterialityLines {
  clearlyTrivialAnnual: number;
  /** Share of the FI number (0.05 = 5%). */
  materialShare: number;
  /** Dollars per hour of effort a question or move must be worth. */
  worthItPerHour: number;
  /** True when the material share is above the default, so results carry the label. */
  roughResults: boolean;
}

export function materialityLines(options: { materialShare?: number; hourlyWage?: number | null } = {}): MaterialityLines {
  const l = materiality.lines;
  const share = Math.min(l.materialShareOfFiNumber.max, Math.max(l.materialShareOfFiNumber.min, options.materialShare ?? l.materialShareOfFiNumber.default));
  return {
    clearlyTrivialAnnual: l.clearlyTrivialAnnual.value,
    materialShare: share,
    worthItPerHour: options.hourlyWage ?? l.worthIt.defaultHourlyWageWhenUnknown,
    roughResults: share > l.materialShareOfFiNumber.warnAbove,
  };
}

/** The real hourly wage: gross income a year over the hours worked (2,000 when unknown). */
export function realHourlyWage(h: Household, hoursPerYear = 2000): number | null {
  if (h.self.income.kind !== "rows") return null;
  const gross = h.self.income.rows.reduce((s, r) => s + r.grossAnnual.value, 0);
  const hours = h.self.income.rows.reduce((s, r) => s + (r.hoursPerWeek?.value ? r.hoursPerWeek.value * 52 : 0), 0) || hoursPerYear;
  return gross > 0 ? gross / hours : null;
}

export interface Sensitivity {
  inputId: string;
  label: string;
  kind: RangeKind;
  /** The range tested, as a fraction. */
  range: number;
  /** Dollars of FI number at stake across the range (the larger of the two ends). */
  dollarsAtStake: number;
  /** The same, as months of FI date, from the plan's rate of building assets in the last working year. */
  monthsAtStake: number;
  /** True when the dollars at stake are at least the material share of the FI number. */
  material: boolean;
}

export interface MaterialityReport {
  fiNumber: number | null;
  retirementYear: number | null;
  lines: MaterialityLines;
  /** Dollars of assets the plan added in the last working year, which turns dollars into months. */
  dollarsPerMonth: number;
  sensitivities: Sensitivity[];
  /** Share of what matters that is covered by known or sharpened values (impact-weighted). */
  coverage: number;
}

type Nudge = { inputId: string; label: string; kind: RangeKind; apply: (h: Household, factor: number) => void };

/** Every rough, look-up, or defaulted input the materiality engine can test, with a way to nudge it. */
export function materialInputs(h: Household, today: string = h.asOf): Nudge[] {
  const out: Nudge[] = [];
  // M3 spec section 8: an aged value is tested at the roughly range, so the next card pulls it in once that is material.
  const aged = new Map(agedValues(h, today).map((v) => [v.inputId, v]));
  const widen = (inputId: string, kind: RangeKind): RangeKind => (kind === "known" || kind === "lookUp" || kind === "roughly" ? effectiveRangeKind(kind, aged.get(inputId)) : kind);
  const kindOf = (c: Confidence | undefined, isDefault: boolean): RangeKind => (isDefault ? "default" : c ?? "default");
  if (h.self.income.kind === "rows") {
    for (const s of h.self.income.rows) {
      out.push({
        inputId: `income.${s.id}.grossAnnual`,
        label: `${s.label ?? s.type} income`,
        kind: widen(`income.${s.id}.grossAnnual`, kindOf(s.grossAnnual.confidence, false)),
        apply: (c, f) => {
          if (c.self.income.kind !== "rows") return;
          const row = c.self.income.rows.find((r) => r.id === s.id);
          if (row) row.grossAnnual = { ...row.grossAnnual, value: row.grossAnnual.value * f };
        },
      });
    }
  }
  if (h.spending.kind === "rows") {
    for (const r of h.spending.rows) {
      out.push({
        inputId: `spending.${r.id}.annual`,
        label: `${r.label ?? r.category} spending`,
        kind: widen(`spending.${r.id}.annual`, kindOf(r.annual.confidence, false)),
        apply: (c, f) => {
          if (c.spending.kind !== "rows") return;
          const row = c.spending.rows.find((x) => x.id === r.id);
          if (row) row.annual = { ...row.annual, value: row.annual.value * f };
        },
      });
    }
  }
  if (h.accounts.kind === "rows") {
    for (const a of h.accounts.rows) {
      if (a.balance.value === null) continue;
      out.push({
        inputId: `account.${a.id}.balance`,
        label: `${a.name?.value ?? a.preset} balance`,
        kind: widen(`account.${a.id}.balance`, kindOf(a.balance.confidence, false)),
        apply: (c, f) => {
          if (c.accounts.kind !== "rows") return;
          const row = c.accounts.rows.find((x) => x.id === a.id);
          if (row && row.balance.value !== null) row.balance = { ...row.balance, value: row.balance.value * f };
        },
      });
      if (a.side === "debt") {
        out.push({
          inputId: `account.${a.id}.rate`,
          label: `${a.name?.value ?? a.preset} rate`,
          kind: kindOf(a.rate.confidence, a.rate.source === "preset"),
          apply: (c, f) => {
            if (c.accounts.kind !== "rows") return;
            const row = c.accounts.rows.find((x) => x.id === a.id);
            if (row && row.side === "debt") row.rate = { ...row.rate, value: row.rate.value * f };
          },
        });
      }
      if (a.side === "asset" && a.taxBucket.value === "taxable") {
        out.push({
          inputId: `account.${a.id}.costBasis`,
          label: `${a.name?.value ?? a.preset} cost basis`,
          kind: kindOf(a.costBasis?.confidence, !a.costBasis),
          apply: (c, f) => {
            if (c.accounts.kind !== "rows") return;
            const row = c.accounts.rows.find((x) => x.id === a.id);
            if (row && row.side === "asset") {
              const base = row.costBasis?.value ?? 0.7 * (row.balance.value ?? 0);
              row.costBasis = { value: Math.min(row.balance.value ?? base, base * f), asOf: c.asOf, source: "user", confidence: "roughly" };
            }
          },
        });
      }
    }
  }
  if (h.self.filingStatus.confidence === "roughly" || h.self.filingStatus.source === "preset") {
    out.push({ inputId: "self.filingStatus", label: "filing status", kind: "default", apply: () => undefined });
  }
  return out;
}

const clone = <T>(x: T): T => structuredClone(x);

/** Runs the materiality engine for the likely band. About two projections per input. */
export function materialityReport(h: Household, options: { materialShare?: number; hourlyWage?: number | null } = {}, deps: Deps = defaultDeps()): MaterialityReport {
  const lines = materialityLines({ ...(options.materialShare !== undefined ? { materialShare: options.materialShare } : {}), hourlyWage: options.hourlyWage === undefined ? realHourlyWage(h) : options.hourlyWage });
  const hh = requireComplete(h);
  const band: BandNumbers = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const base = findFiDate(hh, band, deps);
  const fiNumber = base.funded ? base.timeline.assetsAtRetirement : null;
  const retirementYear = base.retirementYear ?? Infinity;
  const baseRun = base.timeline;
  const baseEstate = baseRun.estate;
  // What a year of the plan is worth in dollars at the FI date: the asset growth in the last working year.
  const lastWorking = baseRun.rows.filter((r) => !r.retired).slice(-1)[0];
  const prevWorking = baseRun.rows.filter((r) => !r.retired).slice(-2)[0];
  const perYear = lastWorking && prevWorking ? Math.max(1, lastWorking.assets - prevWorking.assets) : Math.max(1, (lastWorking?.assets ?? 1) / 10);
  const dollarsPerMonth = perYear / 12;
  // Discount an ending-balance change back to the FI date at the likely blended return (stocks-heavy by default).
  const yearsAfter = baseRun.rows.filter((r) => r.retired).length;
  const blended = (0.9 * band.returns.stocks + 0.1 * band.returns.bonds) / 100;
  const discount = Math.pow(1 + blended, yearsAfter);

  const sensitivities: Sensitivity[] = [];
  for (const n of materialInputs(h)) {
    const range = plausibleRange(n.kind);
    if (range <= 0) continue;
    let worst = 0;
    for (const f of [1 - range, 1 + range]) {
      const c = clone(h);
      n.apply(c, f);
      let estate: number;
      try {
        estate = runFor(requireComplete(c), band, deps, retirementYear).estate;
      } catch {
        continue;
      }
      worst = Math.max(worst, Math.abs(estate - baseEstate) / discount);
    }
    const material = fiNumber !== null ? worst >= lines.materialShare * fiNumber : worst >= lines.clearlyTrivialAnnual;
    sensitivities.push({ inputId: n.inputId, label: n.label, kind: n.kind, range, dollarsAtStake: worst, monthsAtStake: worst / dollarsPerMonth, material });
  }
  sensitivities.sort((a, b) => b.dollarsAtStake - a.dollarsAtStake);
  // Coverage: of everything at stake, the share held by known values (impact-weighted, not a count).
  const total = sensitivities.reduce((s, x) => s + x.dollarsAtStake, 0);
  const knownShare = sensitivities.filter((x) => x.kind === "known").reduce((s, x) => s + x.dollarsAtStake, 0);
  const coverage = total > 0 ? knownShare / total : 1;
  return { fiNumber, retirementYear: base.retirementYear, lines, dollarsPerMonth, sensitivities, coverage };
}

/** Which inputs would be worth sharpening (material, above the trivial line, and worth the time). */
export function worthSharpening(report: MaterialityReport, minutesEach = 2): Sensitivity[] {
  return report.sensitivities.filter((s) => s.kind !== "known" && s.material && s.dollarsAtStake >= report.lines.clearlyTrivialAnnual && s.dollarsAtStake >= (report.lines.worthItPerHour * minutesEach) / 60);
}
