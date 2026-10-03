/**
 * Helpers for building values with metadata (data dictionary 2.1).
 * Every stored value goes through one of these so the metadata is never forgotten.
 */

import type { Answer, Confidence, IsoDate, Meta, NotForMe, Value } from "./types";

export function value<T>(v: T, meta: Meta): Value<T> {
  return { value: v, asOf: meta.asOf, source: meta.source, confidence: meta.confidence };
}

/** Something the person typed. Defaults to known. */
export function userValue<T>(
  v: T,
  asOf: IsoDate,
  confidence: Exclude<Confidence, "notForMe" | "computed"> = "known",
): Value<T> {
  return value(v, { asOf, source: "user", confidence });
}

/** Something copied from a statement. */
export function statementValue<T>(v: T, asOf: IsoDate): Value<T> {
  return value(v, { asOf, source: "statement", confidence: "known" });
}

/** Something a preset filled in (2.9). The person can override it. */
export function presetValue<T>(v: T, asOf: IsoDate): Value<T> {
  return value(v, { asOf, source: "preset", confidence: "known" });
}

/** Something that came from a named assumption set (section 4). */
export function assumptionValue<T>(v: T, asOf: IsoDate): Value<T> {
  return value(v, { asOf, source: "assumptionSet", confidence: "roughly" });
}

/** Something the engine derived. */
export function computedValue<T>(v: T, asOf: IsoDate): Value<T> {
  return value(v, { asOf, source: "computed", confidence: "computed" });
}

/** The "I don't have this" answer (2.8). */
export function notForMe(asOf: IsoDate): NotForMe {
  return { value: null, asOf, source: "user", confidence: "notForMe" };
}

export function isAnswered<T>(answer: Answer<T>): answer is Value<T> {
  return answer.confidence !== "notForMe";
}

/** Returns the stored value, or the fallback when the answer is "not for me". */
export function valueOr<T>(answer: Answer<T>, fallback: T): T {
  return isAnswered(answer) ? answer.value : fallback;
}
