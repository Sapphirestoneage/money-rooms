/**
 * Preset picker (design system 5): a list of account types with plain names
 * and a one-line description. Picking one fills its fields (data dictionary 2.9).
 */

import { loadAccountPresets, type AccountPresetKey } from "../../engine";
import { el } from "../dom";

const DESCRIPTIONS: Partial<Record<AccountPresetKey, string>> = {
  checking: "Where your paycheck lands.",
  savings: "Cash you can reach any time.",
  brokerage: "Investments outside a retirement account.",
  trad401k: "Pre-tax workplace plan. Taxed when withdrawn.",
  roth401k: "After-tax workplace plan. Tax free later.",
  tradIRA: "Pre-tax IRA. Taxed when withdrawn.",
  rothIRA: "After-tax IRA. Contributions come out any time.",
  hsa: "Health savings account. Triple tax advantage.",
  creditCard: "Revolving balance, usually a high rate.",
  businessCard: "A card used for business costs.",
  studentFederal: "Federal student loan, income-driven options.",
  studentPrivate: "Student loan from a bank or lender.",
  auto: "Car loan.",
  mortgage: "Home loan.",
  personal: "Unsecured loan from a bank or app.",
  family: "Owed to a person. Often 0%.",
  medical: "Owed to a hospital or clinic.",
  otherAsset: "Anything else you own that holds value.",
  otherDebt: "Anything else you owe.",
};

export function presetPicker(onPick: (key: AccountPresetKey) => void, side?: "asset" | "debt"): HTMLElement {
  const presets = loadAccountPresets();
  const list = el("div", { class: "preset-picker", role: "list" });
  for (const [key, preset] of Object.entries(presets) as [AccountPresetKey, (typeof presets)[AccountPresetKey]][]) {
    if (side && preset.side !== side) continue;
    list.append(
      el(
        "button",
        { type: "button", class: "preset-picker__item", role: "listitem", onClick: () => onPick(key) },
        preset.label,
        el("small", {}, DESCRIPTIONS[key] ?? (preset.side === "asset" ? "An account you own." : "Something you owe.")),
      ),
    );
  }
  return list;
}
