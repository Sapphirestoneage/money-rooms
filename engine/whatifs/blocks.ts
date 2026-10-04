/**
 * Scenario blocks (docs/levels/level-3-life-plans.md section 2, dictionary 9.5,
 * decision X5): layered proposed changes applied to a copy of the household in
 * memory. The real rows are never edited. Blocks stack in list order. Pure.
 */

import blocksFile from "../../data/scenario-blocks.json";
import type { BlockChange, Household, ScenarioBlock, ScenarioBlockType, YearMonth } from "../model";
import { addMonths, assetFromPreset, debtFromPreset, resolveAssumptions, userValue } from "../model";
import { resolveBand } from "../projection/bands";
import { defaultDeps, findFiDate, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";

export const BLOCK_TYPES = blocksFile.types;

const clone = <T>(x: T): T => structuredClone(x);

/** Shifts a change's dates so its first month is the block's chosen start. Dates inside a change are relative offsets in months when given as "+N". */
function dated(ym: YearMonth | undefined, start: YearMonth): YearMonth | undefined {
  if (!ym) return undefined;
  if (ym.startsWith("+")) return addMonths(start, Number(ym.slice(1)));
  return ym;
}

/** Applies one block's changes to a household copy, at one of its start dates. */
export function applyBlock(h: Household, block: ScenarioBlock, start: YearMonth = block.startDates[0] ?? h.asOf.slice(0, 7)): Household {
  const c = clone(h);
  const asOf = c.asOf;
  if (c.spending.kind !== "rows") c.spending = { kind: "rows", rows: [] };
  if (c.accounts.kind !== "rows") c.accounts = { kind: "rows", rows: [] };
  if (c.self.income.kind !== "rows") c.self.income = { kind: "rows", rows: [] };
  let n = 0;
  for (const ch of block.changes) {
    const id = `block-${block.id}-${n++}`;
    const s = dated(ch.target === "asset" || ch.target === "debt" ? undefined : ("start" in ch ? ch.start : undefined), start) ?? start;
    const e = "end" in ch ? dated(ch.end, start) : undefined;
    switch (ch.target) {
      case "spending":
        if (ch.op === "add") {
          c.spending.rows.push({ id, category: ch.category, label: ch.label, annual: { value: ch.annual, asOf, source: "user", confidence: block.confidence }, start: s, ...(e ? { end: { kind: "date", date: e } } : {}) });
        } else {
          // Scale: the original row ends the month before, a scaled copy runs from the start (and the original resumes after an end).
          for (const r of [...c.spending.rows]) {
            if (r.id.startsWith("block-")) continue;
            const copy = { ...r, id: `${id}-${r.id}`, annual: { ...r.annual, value: r.annual.value * ch.factor }, start: s, ...(e ? { end: { kind: "date" as const, date: e } } : {}) };
            if (e) c.spending.rows.push({ ...r, id: `${id}-${r.id}-after`, start: addMonths(e, 1) });
            r.end = { kind: "date", date: addMonths(s, -1) };
            c.spending.rows.push(copy);
          }
        }
        break;
      case "income":
        if (ch.op === "add") {
          c.self.income.rows.push({ id, type: ch.type, label: ch.label, grossAnnual: { value: ch.grossAnnual, asOf, source: "user", confidence: block.confidence }, start: s, end: e ? { kind: "date", date: e } : { kind: "retirement" } });
        } else if (ch.op === "scale") {
          for (const r of [...c.self.income.rows]) {
            if (r.id.startsWith("block-")) continue;
            const copy = { ...r, id: `${id}-${r.id}`, grossAnnual: { ...r.grossAnnual, value: r.grossAnnual.value * ch.factor }, start: s, end: e ? { kind: "date" as const, date: e } : r.end };
            if (e) c.self.income.rows.push({ ...r, id: `${id}-${r.id}-after`, start: addMonths(e, 1) });
            r.end = { kind: "date", date: addMonths(s, -1) };
            c.self.income.rows.push(copy);
          }
        } else {
          // Pause: the stream ends the month before, and a copy resumes the month after the pause.
          for (const r of [...c.self.income.rows]) {
            if (r.id.startsWith("block-")) continue;
            c.self.income.rows.push({ ...r, id: `${id}-${r.id}-after`, start: addMonths(e!, 1) });
            r.end = { kind: "date", date: addMonths(s, -1) };
          }
        }
        break;
      case "asset":
        if (ch.op === "add") c.accounts.rows.push(assetFromPreset(ch.preset, id, userValue(ch.balance, asOf, block.confidence), asOf));
        else {
          let left = ch.amount;
          for (const a of c.accounts.rows) {
            if (left <= 0 || a.side !== "asset" || a.taxBucket.value !== ch.from || a.balance.value === null) continue;
            const take = Math.min(left, a.balance.value);
            a.balance = { ...a.balance, value: a.balance.value - take };
            left -= take;
          }
          if (left > 0) c.spending.rows.push({ id: `${id}-short`, category: "everythingElse", label: `${block.name} (not covered by savings)`, annual: { value: left * 12, asOf, source: "user", confidence: block.confidence }, start: s, end: { kind: "date", date: s } });
        }
        break;
      case "debt":
        c.accounts.rows.push(debtFromPreset(ch.preset, id, userValue(ch.balance, asOf, block.confidence), { rate: userValue(ch.ratePercent, asOf, block.confidence), minimumPaymentAnnual: userValue(ch.paymentMonthly * 12, asOf, block.confidence) }, asOf));
        break;
    }
  }
  return c;
}

/** Applies every enabled block in list order (a "replacing" block skips the one it replaces). */
export function applyBlocks(h: Household, blocks: readonly ScenarioBlock[] = h.blocks ?? []): Household {
  const replaced = new Set(blocks.filter((b) => b.enabled && b.relation?.kind === "replacing").map((b) => b.relation!.blockId));
  let out = h;
  for (const b of blocks) if (b.enabled && !replaced.has(b.id)) out = applyBlock(out, b);
  return out;
}

export interface BlockHeadline {
  blockId: string;
  start: YearMonth;
  /** Change in monthly cash flow in the first full year of the block (negative means less). */
  monthlyCashFlowChange: number;
  /** Years the FI date moves (positive means later), or null. */
  fiDeltaYears: number | null;
  fiAgeWith: number | null;
  fiAgeWithout: number | null;
}

/** The headline for a block at one start date (spec section 2): change in monthly cash flow, and FI date moved. */
export function blockHeadline(h: Household, block: ScenarioBlock, start: YearMonth = block.startDates[0] ?? h.asOf.slice(0, 7), deps: Deps = defaultDeps()): BlockHeadline {
  const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
  const others = (h.blocks ?? []).filter((b) => b.id !== block.id);
  const base = applyBlocks(h, others);
  const withBlock = applyBlock(base, block, start);
  const without = findFiDate(requireComplete(base), band, deps);
  const withIt = findFiDate(requireComplete(withBlock), band, deps, without.retirementYear ?? undefined);
  const year = Number(start.slice(0, 4)) + 1;
  const rowWith = withIt.timeline.rows.find((r) => r.year === year);
  const rowWithout = without.timeline.rows.find((r) => r.year === year);
  const cash = rowWith && rowWithout ? (rowWith.gap - rowWithout.gap) / 12 : 0;
  return {
    blockId: block.id,
    start,
    monthlyCashFlowChange: cash,
    fiDeltaYears: without.retirementYear === null || withIt.retirementYear === null ? null : withIt.retirementYear - without.retirementYear,
    fiAgeWith: withIt.fiAge,
    fiAgeWithout: without.fiAge,
  };
}

/** Builds a block from a type's questionnaire answers (the national defaults when blank). */
export function blockFromQuestionnaire(type: ScenarioBlockType, id: string, name: string, start: YearMonth, answers: Record<string, number> = {}): ScenarioBlock {
  const t = blocksFile.types.find((x) => x.id === type)!;
  const a = (key: string) => answers[key] ?? t.questions.find((q) => q.id === key)?.default ?? 0;
  const changes: BlockChange[] = [];
  const endAfterYears = (years: number) => addMonths(start, Math.max(1, Math.round(years * 12)) - 1);
  switch (type) {
    case "home": {
      const price = a("price");
      const down = (a("downPercent") / 100) * price;
      const loan = price - down;
      const r = a("ratePercent") / 100 / 12;
      const n = 360;
      const payment = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
      changes.push({ target: "asset", op: "remove", amount: down, from: "cash" });
      changes.push({ target: "debt", op: "add", preset: "mortgage", label: `${name} mortgage`, balance: loan, ratePercent: a("ratePercent"), paymentMonthly: payment });
      changes.push({ target: "spending", op: "add", category: "accommodation", label: `${name} upkeep, tax, insurance`, annual: price * ((t as { ownershipCostPercentOfPrice?: number }).ownershipCostPercentOfPrice ?? 1.5) / 100 });
      if (a("rentReplaced") > 0) changes.push({ target: "spending", op: "add", category: "accommodation", label: "Rent no longer paid", annual: -a("rentReplaced") * 12 });
      break;
    }
    case "car": {
      const loan = Math.max(0, a("price") - a("downPayment"));
      const r = a("ratePercent") / 100 / 12;
      const n = Math.max(1, a("years") * 12);
      const payment = loan > 0 ? (r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n) : 0;
      changes.push({ target: "asset", op: "remove", amount: a("downPayment"), from: "cash" });
      if (loan > 0) changes.push({ target: "debt", op: "add", preset: "auto", label: `${name} loan`, balance: loan, ratePercent: a("ratePercent"), paymentMonthly: payment });
      changes.push({ target: "spending", op: "add", category: "transportation", label: `${name} running costs`, annual: (t as { runningCostAnnual?: number }).runningCostAnnual ?? 2400 });
      break;
    }
    case "kid":
      changes.push({ target: "spending", op: "add", category: "everythingElse", label: name, annual: a("annualCost"), end: endAfterYears(a("years")) });
      if (a("childcareAnnual") > 0) changes.push({ target: "spending", op: "add", category: "everythingElse", label: `${name} childcare`, annual: a("childcareAnnual"), end: endAfterYears(5) });
      break;
    case "jobChange":
      if (a("gapMonths") > 0) changes.push({ target: "income", op: "pause", start, end: addMonths(start, Math.round(a("gapMonths")) - 1) });
      changes.push({ target: "income", op: "scale", factor: 0, start: addMonths(start, Math.round(a("gapMonths"))) });
      changes.push({ target: "income", op: "add", type: "salary", label: name, grossAnnual: a("newGrossAnnual"), start: addMonths(start, Math.round(a("gapMonths"))) });
      break;
    case "sabbatical":
      changes.push({ target: "income", op: "pause", start, end: addMonths(start, Math.max(1, Math.round(a("months"))) - 1) });
      changes.push({ target: "spending", op: "add", category: "travel", label: name, annual: (a("costTotal") / Math.max(1, a("months"))) * 12, end: addMonths(start, Math.max(1, Math.round(a("months"))) - 1) });
      break;
    case "geoArbitrage":
      changes.push({ target: "spending", op: "scale", factor: a("spendingFactor") });
      if (a("incomeFactor") !== 1) changes.push({ target: "income", op: "scale", factor: a("incomeFactor") });
      if (a("movingCost") > 0) changes.push({ target: "spending", op: "add", category: "everythingElse", label: `${name} moving cost`, annual: a("movingCost") * 12, end: start });
      break;
    case "sideHustle":
      changes.push({ target: "income", op: "add", type: "sideGig", label: name, grossAnnual: a("grossAnnual"), ...(a("years") > 0 ? { end: endAfterYears(a("years")) } : {}) });
      break;
    case "inheritance":
      changes.push({ target: "asset", op: "add", preset: "brokerage", label: name, balance: a("amount") });
      break;
    case "marriage":
      changes.push({ target: "income", op: "add", type: "salary", label: `${name}: partner's pay`, grossAnnual: a("partnerIncome") });
      changes.push({ target: "spending", op: "scale", factor: a("sharedSpendingFactor") });
      break;
    case "custom":
      if (a("annualCost") > 0) changes.push({ target: "spending", op: "add", category: "everythingElse", label: name, annual: a("annualCost"), end: endAfterYears(a("years")) });
      if (a("oneOff") > 0) changes.push({ target: "spending", op: "add", category: "everythingElse", label: `${name} (one-off)`, annual: a("oneOff") * 12, end: start });
      break;
  }
  return { id, type, name, startDates: [start], changes, confidence: "roughly", enabled: true };
}
