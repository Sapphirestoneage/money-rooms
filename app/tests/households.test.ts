import { describe, expect, it } from "vitest";
import { STATUSES, parse, serialize, validate, type Input } from "../core";
import a from "./households/household-a.template.json";
import b from "./households/household-b.template.json";
import { fileFromTemplate, type HouseholdTemplate } from "./households/load";

const templates: [string, HouseholdTemplate][] = [["Household A", a as unknown as HouseholdTemplate], ["Household B", b as unknown as HouseholdTemplate]];

/** Every object with a `status` key, anywhere in the file. */
function inputsIn(node: unknown, path = "", out: [string, Input<unknown>][] = []): [string, Input<unknown>][] {
  if (node === null || typeof node !== "object") return out;
  if ("status" in (node as object)) out.push([path, node as Input<unknown>]);
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) inputsIn(v, path ? `${path}.${k}` : k, out);
  return out;
}

describe.each(templates)("%s template", (_name, t) => {
  const { file, expected } = fileFromTemplate(t, "test");

  it("loads into a valid, saveable client file", () => {
    expect(validate(file as unknown as Record<string, unknown>)).toEqual([]);
    expect(parse(serialize(file)).file).toEqual(file);
    expect(file.client.label).toBe(t.label);
    expect(file.household.people.length).toBeGreaterThanOrEqual(1);
    expect(file.household.people.length).toBeLessThanOrEqual(2);
  });

  it("stores birth dates, not ages, and every input carries a known status", () => {
    for (const p of file.household.people) expect(p.birthDate.status).toBe("entered");
    const inputs = inputsIn(file.drawers.facts).concat(inputsIn(file.household));
    expect(inputs.length).toBeGreaterThan(10);
    for (const [path, i] of inputs) expect(STATUSES, path).toContain(i.status);
  });

  it("carries each fact family into the drawer its planet owns", () => {
    expect(Object.keys(file.drawers.facts.income)).toEqual(t.income.map((s) => s.id));
    expect(Object.keys(file.drawers.facts.spending)).toEqual(Object.keys(t.spending));
    expect(Object.keys(file.drawers.facts.debts)).toEqual(t.debts.map((d) => d.id));
    expect(Object.keys(file.drawers.facts.accounts)).toEqual(t.accounts.map((x) => x.id));
    expect(file.drawers.facts.safetyNet).toEqual(t.safetyNet);
  });

  it("has an expected-answers block with one entry per planet, for Eli to fill in", () => {
    expect(Object.keys(expected).filter((k) => !k.startsWith("_")).sort()).toEqual(["debt", "income", "investments", "safetyNet", "spending", "sun", "taxes"]);
  });
});

describe("Household B exercises the harder shapes", () => {
  const { file } = fileFromTemplate(b as unknown as HouseholdTemplate, "b");
  it("has two people, a composite spending bucket with detail lines, a promo debt, and a not-applicable bucket", () => {
    expect(file.household.people).toHaveLength(2);
    expect(file.drawers.facts.spending["accommodation"]?.monthly.lines.length).toBeGreaterThan(0);
    expect(file.drawers.facts.spending["therapy"]?.monthly.total.status).toBe("notApplicable");
    expect(file.drawers.facts.debts["promoCard"]?.promo?.endDate.value).toBe("2027-06");
  });
});
