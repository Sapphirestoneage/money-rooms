/**
 * "What would you have to do?" (M2 spec section 3): the year-by-year plan in
 * plain English, grouped into runs of years that do the same thing. Describes
 * what the numbers show; never instructs. Pure: a timeline in, sentences out.
 */

import type { TimelineResult, YearRow } from "../projection/timeline";
import type { DrawdownPolicy } from "../projection/policy";

export interface PlanStep {
  fromAge: number;
  toAge: number;
  fromYear: number;
  toYear: number;
  lines: string[];
}

const money = (n: number) => `$${Math.round(n / 100) * 100 >= 1000 ? (Math.round(n / 100) * 100).toLocaleString("en-US") : Math.round(n).toLocaleString("en-US")}`;

/** The source most of a year's withdrawals came from, in words. */
function mainSource(r: YearRow, accounts: TimelineResult["accounts"]): string | null {
  let best: { label: string; bucket: string; amount: number } | null = null;
  for (const [id, amount] of Object.entries(r.withdrawals)) {
    const a = accounts.find((x) => x.id === id);
    if (!a || a.kind !== "asset" || amount <= 0) continue;
    if (!best || amount > best.amount) best = { label: a.label.replace(" (added by the engine)", ""), bucket: a.taxBucket ?? "", amount };
  }
  if (!best) return null;
  const word = best.bucket === "taxable" ? "taxable savings" : best.bucket === "cash" ? "cash" : best.bucket === "pretax" ? `the ${best.label}` : best.bucket === "roth" ? "Roth money" : "the HSA";
  return word;
}

/** A signature for the year's shape: what it lives on, whether it converts, harvests, takes a 72(t) or an RMD, and claims. */
function signature(r: YearRow, accounts: TimelineResult["accounts"], ssStart: number | null): string {
  const m = r.m2;
  return [
    r.retired ? "retired" : "working",
    mainSource(r, accounts) ?? "income",
    m && m.conversion > 0 ? "convert" : "",
    m && m.harvested > 0 ? "harvest" : "",
    m && m.sepp > 0 ? "sepp" : "",
    m && m.rmd > 0 ? "rmd" : "",
    m?.healthcare.acaPctFpl !== null && m?.healthcare.acaPctFpl !== undefined && r.age < 65 ? "aca" : "",
    ssStart !== null && r.year >= ssStart ? "ss" : "",
  ].join("|");
}

/** The plan as steps of consecutive years that look alike. */
export function planSteps(t: TimelineResult, policy: DrawdownPolicy): PlanStep[] {
  const ssStart = t.rows.find((r) => r.socialSecurity > 0)?.year ?? null;
  const steps: PlanStep[] = [];
  let group: YearRow[] = [];
  let sig = "";
  const flush = () => {
    if (!group.length) return;
    const first = group[0]!;
    const last = group[group.length - 1]!;
    const n = group.length;
    const avg = (f: (r: YearRow) => number) => group.reduce((s, r) => s + f(r), 0) / n;
    const lines: string[] = [];
    if (first.retired) {
      const src = mainSource(first, t.accounts);
      if (src) lines.push(`Spending comes from ${src}.`);
      const conv = avg((r) => r.m2?.conversion ?? 0);
      if (conv >= 500) {
        const from = t.accounts.find((a) => a.kind === "asset" && a.taxBucket === "pretax")?.label.replace(" (added by the engine)", "") ?? "pretax savings";
        lines.push(`About ${money(conv)} a year moves from the ${from} to Roth as a conversion.`);
      }
      const harvest = avg((r) => r.m2?.harvested ?? 0);
      if (harvest >= 500) lines.push(`About ${money(harvest)} of gains a year is realized and rebought while it falls in the 0% bracket.`);
      const sepp = avg((r) => r.m2?.sepp ?? 0);
      if (sepp >= 500) lines.push(`72(t) payments of about ${money(sepp)} a year come out penalty free.`);
      const rmd = avg((r) => r.m2?.rmd ?? 0);
      if (rmd >= 500) lines.push(`Required distributions of about ${money(rmd)} a year come out of pretax accounts.`);
      const aca = first.m2?.healthcare.acaPctFpl;
      if (aca !== null && aca !== undefined && first.age < 65 && policy.acaTarget !== "off") {
        lines.push(`Income stays near ${money(avg((r) => r.m2?.magiAca ?? 0))} a year, about ${Math.round(aca)}% of the poverty line, which keeps the marketplace credit.`);
      } else if (first.age < 65 && first.m2 && first.m2.healthcare.total > 0) {
        lines.push(`Health insurance costs about ${money(avg((r) => r.m2?.healthcare.total ?? 0))} a year after any credit.`);
      }
      if (ssStart !== null && first.year >= ssStart && (steps.length === 0 || first.year === ssStart)) lines.push(`Social Security pays about ${money(avg((r) => r.socialSecurity))} a year.`);
      const pen = avg((r) => r.m2?.penalized ?? 0);
      if (pen >= 500) lines.push(`About ${money(pen)} a year of withdrawals pays the 10% additional tax.`);
    } else {
      lines.push("Work income continues and savings follow the plan as entered.");
    }
    steps.push({ fromAge: first.age, toAge: last.age, fromYear: first.year, toYear: last.year, lines });
    group = [];
  };
  for (const r of t.rows) {
    const s = signature(r, t.accounts, ssStart);
    if (s !== sig && group.length) flush();
    sig = s;
    group.push(r);
  }
  flush();
  // Claiming gets its own line at the start of the step it begins in.
  if (ssStart !== null) {
    const claimAge = ssStart - (t.rows[0]!.year - t.rows[0]!.age);
    const step = steps.find((s) => s.fromYear === ssStart);
    if (step) step.lines.unshift(`Social Security starts at ${claimAge}.`);
  }
  return steps;
}

/** The plan as text lines ("Ages 40 to 44: ..."). */
export function planText(t: TimelineResult, policy: DrawdownPolicy): string[] {
  return planSteps(t, policy).map((s) => `${s.fromAge === s.toAge ? `Age ${s.fromAge}` : `Ages ${s.fromAge} to ${s.toAge}`}: ${s.lines.join(" ")}`);
}

/** The strategies a policy uses, named for the reveal and the share card (M2 spec section 9). */
export function strategiesUsed(policy: DrawdownPolicy, t: TimelineResult): string[] {
  const out: string[] = [];
  if (t.rows.some((r) => (r.m2?.conversion ?? 0) > 0)) out.push("Roth conversion ladder");
  if (t.rows.some((r) => (r.m2?.harvested ?? 0) > 0)) out.push("0% gain harvesting");
  if (policy.acaTarget !== "off" && t.rows.some((r) => r.retired && r.age < 65)) out.push("ACA credits");
  if (t.rows.some((r) => (r.m2?.sepp ?? 0) > 0)) out.push("72(t) payments");
  if (policy.ruleOf55) out.push("Rule of 55");
  if (policy.withdrawalOrder !== "conventional") out.push(policy.withdrawalOrder === "proportional" ? "Proportional withdrawals" : "Bracket-based withdrawals");
  if (policy.claimingAge) out.push(`Claiming Social Security at ${policy.claimingAge.years}`);
  if (policy.contributionType !== "asEntered") out.push(policy.contributionType === "roth" ? "Roth contributions at work" : policy.contributionType === "traditional" ? "Traditional contributions at work" : "Split contributions at work");
  return out;
}
