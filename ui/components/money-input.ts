/**
 * Money input (design system 5): accepts "4120", "4,120", "$4,120", or "4.1k",
 * has a cadence selector, shows the normalized annual amount underneath, and
 * carries the value's kind badge. The engine normalizes; this component only
 * formats and relays.
 */

import { annualFrom, fromAnnual, type Cadence, type PayFrequency } from "../../engine";
import { el, uid } from "../dom";
import { dollars, parseMoney } from "../format";

export interface MoneyInputOptions {
  label: string;
  /** Stored annual amount, or null when blank. */
  annual: number | null;
  /** Cadences offered. Defaults to month and year. */
  cadences?: readonly Cadence[];
  initialCadence?: Cadence;
  /** Needed when "paycheck" is offered. */
  payFrequency?: () => PayFrequency;
  /** Needed when "hour" is offered. */
  hoursPerWeek?: () => number | null;
  onChange: (annual: number | null) => void;
  /** The value's kind badge, shown beside the label. */
  badge?: HTMLElement;
  /** True when the value is rough, so the annual line reads "About ...". */
  rough?: () => boolean;
  /** Extra words after the annual amount, like "(estimate)". */
  note?: () => string;
  placeholder?: string;
}

const CADENCE_LABEL: Record<Cadence, string> = { hour: "per hour", paycheck: "per paycheck", month: "per month", year: "per year" };

export function moneyInput(o: MoneyInputOptions): HTMLElement {
  const cadences = o.cadences ?? ["month", "year"];
  let cadence: Cadence = o.initialCadence ?? cadences[0] ?? "year";
  const id = uid("money");

  const context = () => ({
    ...(o.payFrequency ? { payFrequency: o.payFrequency() } : {}),
    ...(o.hoursPerWeek && o.hoursPerWeek() !== null ? { hoursPerWeek: o.hoursPerWeek() as number } : {}),
  });

  const input = el("input", {
    id,
    class: "input input--money",
    type: "text",
    inputmode: "decimal",
    placeholder: o.placeholder ?? "0",
    autocomplete: "off",
  });
  const select = el("select", { class: "select", "aria-label": `${o.label} cadence` });
  for (const c of cadences) select.append(el("option", { value: c, selected: c === cadence }, CADENCE_LABEL[c]));
  const normalized = el("div", { class: "money-input__normalized", "aria-live": "polite" });

  const safeAnnual = (amount: number): number | null => {
    try {
      return annualFrom(amount, cadence, context());
    } catch {
      return null;
    }
  };

  const showNormalized = (annual: number | null) => {
    if (annual === null) {
      normalized.textContent = "";
      return;
    }
    const about = o.rough?.() ? "About " : "";
    const note = o.note?.() ?? "";
    normalized.textContent = `${about}${dollars(annual)} a year${note ? ` ${note}` : ""}`;
  };

  const setFromAnnual = (annual: number | null) => {
    if (annual === null) {
      input.value = "";
      showNormalized(null);
      return;
    }
    try {
      const shown = fromAnnual(annual, cadence, context());
      input.value = Number.isInteger(shown) ? String(shown) : shown.toFixed(2);
    } catch {
      input.value = "";
    }
    showNormalized(annual);
  };

  setFromAnnual(o.annual);

  input.addEventListener("input", () => {
    const amount = parseMoney(input.value);
    if (amount === null) {
      o.onChange(null);
      showNormalized(null);
      return;
    }
    const annual = safeAnnual(amount);
    o.onChange(annual);
    showNormalized(annual);
  });

  select.addEventListener("change", () => {
    const amount = parseMoney(input.value);
    cadence = select.value as Cadence;
    if (amount === null) return;
    const annual = safeAnnual(amount);
    o.onChange(annual);
    showNormalized(annual);
  });

  return el(
    "div",
    { class: "field" },
    el("div", { class: "field__label-row" }, el("label", { for: id }, o.label), o.badge ?? null),
    el("div", { class: "money-input" }, input, select, normalized),
  );
}
