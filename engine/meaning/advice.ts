/**
 * The Advice Translator (docs/m4-spec.md section 2.4): common advice, each
 * with a rule that reads the household and says applies, partly, or unlearn,
 * with one sentence built from the person's numbers. Never instructs.
 */

import adviceFile from "../../data/advice.json";
import engineDefaults from "../../data/engine-defaults.json";
import type { Household } from "../model";
import { resolveAssumptions } from "../model";
import { ruleOfFive, runway } from "../levels/resilience";
import { fiNumbers } from "../optimizer/fi-numbers";
import { optimize } from "../optimizer/search";
import { resolveBand } from "../projection/bands";
import { defaultDeps, runFor, type Deps } from "../projection/fi";
import { requireComplete } from "../projection/timeline";
import { ratioInputs, type RatioInputs } from "./ratios";

export type Verdict = "applies" | "partly" | "unlearn";

export interface AdviceVerdict {
  id: string;
  statement: string;
  verdict: Verdict;
  sentence: string;
}

const money = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;

export function adviceTranslator(h: Household, deps: Deps = defaultDeps(), inputs: RatioInputs = ratioInputs(h, deps)): AdviceVerdict[] {
  const accounts = h.accounts.kind === "rows" ? h.accounts.rows : [];
  const debts = accounts.filter((a) => a.side === "debt");
  const highInterest = debts.filter((a) => a.side === "debt" && (a.promo ? a.promo.rateAfter.value : a.rate.value) > engineDefaults.highInterestThresholdPercent.value);
  const hasRoth = accounts.some((a) => a.side === "asset" && a.taxBucket.value === "roth");
  const hasPretax = accounts.some((a) => a.side === "asset" && a.taxBucket.value === "pretax");
  const hasMatch = h.self.income.kind === "rows" && h.self.income.rows.some((s) => s.employerMatch);
  const resolved = resolveAssumptions(h.assumptions);
  const floor = resolved.socialSecurityPolicy.value[0];
  const out: AdviceVerdict[] = [];
  for (const a of adviceFile.advice) {
    let verdict: Verdict = "partly";
    let sentence = "";
    switch (a.rule) {
      case "ruleOfFive": {
        const r = ruleOfFive(h);
        verdict = "unlearn";
        sentence = `Your Rule of 5 target is ${r.targetMonths.toFixed(1)} months (${money(r.targetDollars)}) at your age and income stability, not a flat three to six. Saving ${money(r.saveMonthly)} a month gets there.`;
        break;
      }
      case "highInterestOnly":
        if (!debts.length) { verdict = "unlearn"; sentence = "You have no debt, so this one is not about you."; }
        else if (highInterest.length) { verdict = "partly"; sentence = `Only debt above ${engineDefaults.highInterestThresholdPercent.value}% comes before saving in your plan: ${highInterest.map((d) => d.name?.value ?? d.preset).join(", ")}. The employer match comes before even that; the rest of your debt sits behind investing.`; }
        else { verdict = "unlearn"; sentence = `None of your debt is above ${engineDefaults.highInterestThresholdPercent.value}%, so in your plan investing comes first and the debt is paid on schedule.`; }
        break;
      case "matchThenStrategy":
        verdict = hasMatch ? "partly" : "partly";
        sentence = hasMatch ? `Your plan captures the full match first. After that, your ${h.savingsStrategy.value === "maxTaxFreeGrowth" ? "tax-free growth strategy fills a Roth IRA before the rest of the 401(k)" : h.savingsStrategy.value === "maxTaxSavingsNow" ? "tax-savings strategy fills the traditional 401(k) to its limit" : "entered-only strategy keeps what you entered and sends the rest to a Roth IRA, then taxable"}.` : `There is no match in your plan, so the 401(k) competes with the HSA, a Roth IRA, and taxable savings by your strategy (${h.savingsStrategy.value}).`;
        break;
      case "earlyAccess": {
        const ways: string[] = [];
        if (hasRoth) ways.push("Roth contributions come out tax and penalty free at any age");
        if (hasPretax) ways.push("72(t) payments and the rule of 55 can reach a 401(k) without the penalty");
        if (h.plans?.some((p) => p.planType === "457bGovernmental")) ways.push("a governmental 457(b) owes no penalty after you leave");
        verdict = ways.length ? "unlearn" : "partly";
        sentence = ways.length ? `${ways.join("; ")}. Your plan's optimizer uses these where they help.` : "With no retirement accounts yet, there is nothing to touch early; the rules that make early access possible are in the plan for when there is.";
        break;
      }
      case "grossVsNet": {
        const o = optimize(h, { objective: "earliestFi" }, deps);
        const n = fiNumbers(h, o, runFor(requireComplete(h), resolveBand(resolved, "likely"), deps, Infinity));
        verdict = "partly";
        sentence = n.netFi === null ? `25 times your spending is ${money(n.grossFi)}; the plan is not fully funded yet, so the real number is still open.` : `25 times your spending is ${money(n.grossFi)}, the gross number. With taxes, health care, Social Security, and the drawdown counted, ${money(n.netFi)} is enough: the net number.`;
        break;
      }
      case "policyBand":
        verdict = "partly";
        sentence = `Your worst band already pays ${Math.round(floor * 100)}% of the scheduled benefit (the current-law floor from the Trustees Report); the likely band pays it in full. Zeroing it would be hidden padding.`;
        break;
      case "bracketNowVsLater": {
        const rate = inputs.year1 && inputs.year1.gross > 0 ? (inputs.year1.taxes / inputs.year1.gross) * 100 : null;
        verdict = "partly";
        sentence = rate === null ? "It depends on today's bracket against the one you'll draw down in." : `It depends on today's rate against the drawdown rate. Yours is about ${Math.round(rate)}% all in this year; the optimizer's contribution-type knob tests traditional, Roth, and split against your own drawdown.`;
        break;
      }
      case "homeBlock":
        verdict = "partly";
        sentence = "Neither renting nor buying is a rule. A home block on the What-ifs screen prices the move in cash flow and FI date for your numbers.";
        break;
      case "oneTotal": {
        const rows = h.spending.kind === "rows" ? h.spending.rows : [];
        const oneTotal = rows.length === 1 && rows[0]!.category === "everythingElse";
        verdict = oneTotal ? "applies" : "partly";
        sentence = oneTotal ? "Your spending is one total. Splitting it into categories sharpens the retirement baseline, which decides your date." : `Your spending is already in ${rows.length} rows; the proof of cash on the entry screen says whether the total holds.`;
        break;
      }
      case "runwayStack": {
        const r = runway(h);
        verdict = "partly";
        sentence = `Cash is one layer. Your runway counts ${r.layers.map((l) => l.label.toLowerCase()).join(", ")}: about ${Math.round(r.totalMonths)} months in all, not only the cash.`;
        break;
      }
    }
    out.push({ id: a.id, statement: a.statement, verdict, sentence });
  }
  return out;
}
