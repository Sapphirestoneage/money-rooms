/**
 * Style guide: results describe what the numbers show and never instruct (readiness item 6, 2026-10-04).
 * This scan covers every sentence the engine writes for a person (the plan in words, the year's actions,
 * the ratio and lens sentences, the Advice Translator's own lines) and the content files behind the cards
 * (items, small wins). Quoted popular advice (the Advice Translator's statements) is exempt: it is the
 * thing being examined, labeled as such. Button labels are exempt by the style guide (they say what happens).
 */

import { describe, expect, it } from "vitest";
import items from "../data/items.json";
import ratios from "../data/ratios.json";
import wins from "../data/small-wins.json";
import { adviceTranslator, defaultDeps, defaultPolicy, findFiDate, householdFromExample, optimize, planText, requireComplete, resolveAssumptions, resolveBand, type ExampleHouseholdFile } from "../engine";
import maya from "./households/maya.json";

/** Modal instructions anywhere, and imperative verbs at the start of a sentence or title. */
const MODAL = /\b(you should|you must|you need to|you have to|you ought to|be sure to|make sure)\b/i;
const IMPERATIVE_START = /(^|[.!?]\s+)(cancel|switch|move|ask|get|join|use|keep|turn|convert|take|live|harvest|sell|buy|check|max|pay|save|open|start|stop|put|invest|consider|try|avoid|never|don't|do not|always)\b/i;

function offenders(sentences: readonly string[]): string[] {
  return sentences.filter((s) => MODAL.test(s) || IMPERATIVE_START.test(s));
}

const h = householdFromExample(maya as ExampleHouseholdFile, "2026-10-04");

describe("engine sentences describe, never instruct", () => {
  it("the plan in words, under the default policy and a strategy-rich policy", () => {
    const hh = requireComplete(h);
    const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
    const deps = defaultDeps();
    const plain = findFiDate(hh, band, deps);
    const rich = optimize(h, { objective: "biggestEstate" }, deps).best;
    const lines = [...planText(plain.timeline, defaultPolicy()), ...planText(rich.result.timeline, rich.policy)];
    expect(lines.length).toBeGreaterThan(3);
    expect(offenders(lines)).toEqual([]);
  });

  it("the year-by-year actions", () => {
    const rich = optimize(h, { objective: "biggestEstate" }, defaultDeps()).best;
    const actions = rich.result.timeline.rows.flatMap((r) => r.m2?.actions ?? []);
    expect(actions.length).toBeGreaterThan(0);
    expect(offenders(actions)).toEqual([]);
  });
});

describe("content files describe, never instruct", () => {
  it("ratio sentences and lens ideas", () => {
    const sentences = [...ratios.ratios.map((r) => r.sentence), ...ratios.lenses.map((l) => l.idea)];
    expect(offenders(sentences)).toEqual([]);
  });
  it("small wins titles and notes", () => {
    const text = (wins as { wins: { title: string; note?: string }[] }).wins.flatMap((w) => [w.title, ...(w.note ? [w.note] : [])]);
    expect(offenders(text)).toEqual([]);
  });
  it("item reasons", () => {
    const text = (items as { items: { why?: string }[] }).items.flatMap((i) => (i.why ? [i.why] : []));
    expect(offenders(text)).toEqual([]);
  });
  it("the Advice Translator's own sentences (its quoted statements are the advice under examination and are exempt)", () => {
    const own = adviceTranslator(h).map((v) => v.sentence);
    expect(own.length).toBeGreaterThan(5);
    expect(offenders(own)).toEqual([]);
  });
});
