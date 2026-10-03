/**
 * Items and the next card (docs/m3-spec.md sections 5, 6, and 7): every
 * question and move with the same shape, valued per person, ranked by value
 * per minute above the trivial and worth-it lines, preferring the lowest
 * level not yet passed. Definitions come from data/items.json; values are
 * computed here, never stored.
 */

import itemsFile from "../../data/items.json";
import materiality from "../../data/materiality.json";
import type { Household } from "../model";
import { missingLevelOneAnswers } from "../model";
import { drawdownUnlockItems } from "../optimizer/fi-numbers";
import type { MaterialityReport } from "./materiality";
import { worthSharpening } from "./materiality";

export type Tier = "easy" | "intermediate" | "advanced" | "expert";
export type ItemType = "question" | "move";

export interface ItemDefinition {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  tier: Tier;
  type: ItemType;
  effortMinutes: number;
  why: string;
  whereToFind: string | null;
  fields: string[];
  sharpens?: string;
}

export interface ValuedItem extends ItemDefinition {
  /** Dollars of FI number at stake (questions) or dollars a year (moves). */
  valueDollars: number;
  /** Months of FI date, when known. */
  valueMonths: number | null;
  /** Dollars per minute of effort, the ranking measure. */
  valuePerMinute: number;
  /** Why this item is on the list now, in one sentence with the numbers in it. */
  sentence: string;
  /** True when the item is already done for this person. */
  done: boolean;
}

export function loadItems(): readonly ItemDefinition[] {
  return itemsFile.items as ItemDefinition[];
}

/** Which levels this household has passed: every material item of the level is in (section 7). */
export function levelsPassed(h: Household, report: MaterialityReport | null): number[] {
  const passed: number[] = [];
  if (missingLevelOneAnswers(h).length === 0 && (report === null || worthSharpening(report).length === 0)) passed.push(1);
  if (passed.includes(1) && drawdownUnlockItems(h).length === 0) passed.push(4);
  return passed;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const months = (n: number | null) => (n === null ? "" : ` (about ${Math.max(1, Math.round(n))} ${Math.round(n) === 1 ? "month" : "months"})`);

/** Every item valued for this person. `report` can be null before the materiality engine has run. */
export function valueItems(h: Household, report: MaterialityReport | null): ValuedItem[] {
  const missing = missingLevelOneAnswers(h);
  const unlock = drawdownUnlockItems(h);
  const sharpen = report ? worthSharpening(report) : [];
  const fi = report?.fiNumber ?? null;
  const perMonth = report?.dollarsPerMonth ?? null;
  const out: ValuedItem[] = [];
  for (const d of loadItems()) {
    let value = 0;
    let done = false;
    let sentence = d.why;
    switch (d.id) {
      case "q.birthDate": done = !missing.includes("birthDate"); break;
      case "q.state": done = !missing.includes("state"); break;
      case "q.income": done = !missing.includes("income"); break;
      case "q.spending": done = !missing.includes("spending"); break;
      case "q.accounts": done = !missing.includes("accounts"); break;
      case "q.filingStatus": done = h.self.filingStatus.source === "user"; break;
      case "q.hsaEligible": done = h.self.hsaEligible.source === "user"; break;
      case "q.income.sharpen":
      case "q.spending.sharpen":
      case "q.accounts.sharpen":
      case "q.debts.sharpen": {
        const prefix = d.sharpens === "income" ? "income." : d.sharpens === "spending" ? "spending." : "account.";
        const mine = sharpen.filter((s) => s.inputId.startsWith(prefix) && (d.sharpens !== "debts" || s.inputId.endsWith(".rate")) && (d.sharpens !== "accounts" || s.inputId.endsWith(".balance")));
        done = mine.length === 0;
        const top = mine[0];
        if (top) {
          value = top.dollarsAtStake;
          sentence = `${top.label} is marked ${top.kind === "default" ? "as a default" : top.kind} and could move your FI number by ${money(top.dollarsAtStake)}${months(top.monthsAtStake)}.`;
        }
        break;
      }
      case "q.drawdown": done = unlock.length === 0; break;
      case "q.ssRecord": done = !!h.self.socialSecurity.earningsRecord; break;
      case "m.savingsStrategy": done = h.savingsStrategy.source === "user"; break;
      case "m.claimingAge": done = !!h.self.socialSecurity.claimingAge; break;
      default: done = false;
    }
    // A required level-one answer is worth the whole FI number: nothing shows without it.
    if (!done && value === 0 && d.level === 1 && d.type === "question" && !d.sharpens) value = fi ?? 1e6;
    // Later-level items without a measured value get a placeholder worth below the material line, so they wait their turn.
    if (!done && value === 0 && d.level > 1) value = fi !== null ? 0.02 * fi : 10000;
    const valueMonths = perMonth !== null && perMonth > 0 ? value / perMonth : null;
    out.push({ ...d, valueDollars: value, valueMonths, valuePerMinute: d.effortMinutes > 0 ? value / d.effortMinutes : value, sentence, done });
  }
  return out;
}

export interface NextCard {
  big: ValuedItem | null;
  small: ValuedItem[];
  /** The lowest level not yet passed. */
  currentLevel: number;
}

/**
 * The next card (section 6): the highest value per minute among items above the clearly-trivial
 * and worth-it lines, preferring the lowest level not yet passed. An item from a later level
 * jumps ahead only if it is worth at least three times the best current-level item.
 */
export function nextCard(h: Household, report: MaterialityReport | null, options: { hourlyWage?: number | null } = {}): NextCard {
  const items = valueItems(h, report).filter((i) => !i.done);
  const trivial = materiality.lines.clearlyTrivialAnnual.value;
  const wage = options.hourlyWage ?? report?.lines.worthItPerHour ?? materiality.lines.worthIt.defaultHourlyWageWhenUnknown;
  const worthIt = (i: ValuedItem) => i.valueDollars >= trivial && i.valueDollars >= (wage * i.effortMinutes) / 60;
  const eligible = items.filter(worthIt).sort((a, b) => b.valuePerMinute - a.valuePerMinute);
  const passed = levelsPassed(h, report);
  const currentLevel = [1, 2, 3, 4, 5].find((l) => !passed.includes(l)) ?? 5;
  const current = eligible.filter((i) => i.level <= currentLevel);
  const later = eligible.filter((i) => i.level > currentLevel);
  const multiple = materiality.nextCard.laterLevelJumpsAheadAtMultiple;
  const ranked: ValuedItem[] = [];
  const bestCurrent = current[0];
  for (const i of later) if (!bestCurrent || i.valuePerMinute >= multiple * bestCurrent.valuePerMinute) ranked.push(i);
  ranked.push(...current);
  ranked.push(...later.filter((i) => !ranked.includes(i)));
  return { big: ranked[0] ?? null, small: ranked.slice(1, 1 + materiality.nextCard.smallCards), currentLevel };
}
