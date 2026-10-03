/**
 * Money input (design system 5): accepts "4120", "4,120", "$4,120", or "4.1k",
 * has a cadence selector, shows the normalized annual amount underneath, and
 * carries the value's kind badge. The engine normalizes; this component only
 * formats and relays.
 *
 * Ease-of-use rules:
 * - The amount is shown with commas once the field is left, and plain while typing.
 * - Changing the cadence on a number the person just typed reinterprets it
 *   ("6,000" then "per month" means 6,000 a month). Changing it on a number
 *   that was already stored converts the display and leaves the stored amount alone.
 * - The chosen cadence is reported so the screen can remember it.
 */

import { annualFrom, fromAnnual, type Cadence, type PayFrequency } from "../../engine";
import { el, uid } from "../dom";
import { amountForInput, dollars, parseMoney } from "../format";

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
  /** Called when the person picks a different cadence, so the screen can remember it. */
  onCadenceChange?: (cadence: Cadence) => void;
  /** The value's kind badge, shown beside the label. */
  badge?: HTMLElement;
  /** True when the value is rough, so the annual line reads "About ...". */
  rough?: () => boolean;
  /** Extra words after the annual amount, like "(estimate)". */
  note?: () => string;
  /** A stable name for this field, so focus can be restored after the screen refreshes. */
  key?: string;
  placeholder?: string;
}

const CADENCE_LABEL: Record<Cadence, string> = { hour: "per hour", paycheck: "per paycheck", month: "per month", year: "per year" };

export function moneyInput(o: MoneyInputOptions): HTMLElement {
  const cadences = o.cadences ?? ["month", "year"];
  const wanted = o.initialCadence ?? cadences[0] ?? "year";
  let cadence: Cadence = cadences.includes(wanted) ? wanted : (cadences[0] ?? "year");
  /** The stored annual amount this field currently represents. */
  let annualNow: number | null = o.annual;
  /** True once the person has typed since the amount was last shown from storage. */
  let typed = false;
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
    "data-key": o.key,
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

  const showNormalized = () => {
    if (annualNow === null) {
      normalized.textContent = cadence === "hour" && o.hoursPerWeek && o.hoursPerWeek() === null ? "Enter hours per week to see the yearly amount" : "";
      return;
    }
    const about = o.rough?.() ? "About " : "";
    const note = o.note?.() ?? "";
    normalized.textContent = `${about}${dollars(annualNow)} a year${note ? ` ${note}` : ""}`;
  };

  /** Shows the stored annual amount at the current cadence. */
  const showFromAnnual = () => {
    if (annualNow === null) {
      input.value = "";
    } else {
      try {
        input.value = amountForInput(fromAnnual(annualNow, cadence, context()));
      } catch {
        input.value = "";
      }
    }
    showNormalized();
  };

  showFromAnnual();

  input.addEventListener("input", () => {
    typed = true;
    const amount = parseMoney(input.value);
    annualNow = amount === null ? null : safeAnnual(amount);
    o.onChange(annualNow);
    showNormalized();
  });

  // Tidy the number once the person leaves the field.
  input.addEventListener("blur", () => {
    const amount = parseMoney(input.value);
    if (amount !== null) input.value = amountForInput(amount);
  });

  select.addEventListener("change", () => {
    cadence = select.value as Cadence;
    o.onCadenceChange?.(cadence);
    const amount = parseMoney(input.value);
    if (typed && amount !== null) {
      // The person just typed this number: the new cadence says what it means.
      annualNow = safeAnnual(amount);
      o.onChange(annualNow);
      showNormalized();
    } else {
      // The number came from storage: keep the amount, show it at the new cadence.
      showFromAnnual();
    }
  });

  return el(
    "div",
    { class: "field" },
    el("div", { class: "field__label-row" }, el("label", { for: id }, o.label), o.badge ?? null),
    el("div", { class: "money-input" }, input, select, normalized),
  );
}
