import { describe, expect, it } from "vitest";
import { PLANETS, applyChange, entered, entriesFor, newClientFile, ownerOf, writeAs, type Change } from "../core";

const change = (path: string, to: unknown): Change => ({ path, to, by: "coach", why: "test", at: "2026-10-05" });

describe("one owner per fact (DATA_MODEL.md section 2)", () => {
  it("routes every fact family to exactly one of the planets", () => {
    expect(ownerOf("household.people.0.birthDate")).toBe("sun");
    expect(ownerOf("client.label")).toBe("sun");
    expect(ownerOf("drawers.facts.income.job.grossMonthly")).toBe("income");
    expect(ownerOf("drawers.facts.spending.food.monthly")).toBe("spending");
    expect(ownerOf("drawers.facts.debts.card.balance")).toBe("debt");
    expect(ownerOf("drawers.facts.safetyNet.monthsToClose")).toBe("safetyNet");
    expect(ownerOf("drawers.facts.accounts.k401.balance")).toBe("investments");
    expect(ownerOf("drawers.goals.0.targetDate")).toBe("lifePlan");
    expect(ownerOf("drawers.assumptions.active")).toBe("sun");
    expect(ownerOf("drawers.scenarios.0.label")).toBe("sun");
    for (const p of ["client", "household", "drawers.facts.income"]) expect(PLANETS).toContain(ownerOf(p));
  });

  it("refuses a path no planet owns, pointing at the data model", () => {
    expect(() => ownerOf("drawers.facts.pets.dog")).toThrow(/No planet owns drawers\.facts\.pets\.dog/);
    expect(() => ownerOf("somewhere.else")).toThrow(/DATA_MODEL/);
  });
});

describe("the Ledger applies changes", () => {
  it("records from, to, who, why, when, and the owner, and never mutates the input file", () => {
    const file = newClientFile("Test", "2026-10-01", "t1");
    const { file: next, entry } = applyChange(file, change("drawers.facts.income.job", { id: "job", personId: "self", label: "Job", type: entered("salary"), grossMonthly: entered(6000), takeHomeMonthly: entered(4500), stability: entered("steady") }));
    expect(file.ledger).toEqual([]);
    expect(file.drawers.facts.income["job"]).toBeUndefined();
    expect(next.drawers.facts.income["job"]?.grossMonthly.value).toBe(6000);
    expect(next.ledger).toHaveLength(1);
    expect(entry).toMatchObject({ at: "2026-10-05", by: "coach", path: "drawers.facts.income.job", from: undefined, why: "test", owner: "income" });
    expect(next.updatedAt).toBe("2026-10-05");

    const { file: third, entry: e2 } = applyChange(next, change("drawers.facts.income.job.grossMonthly", entered(6500)));
    expect(e2.from).toEqual(entered(6000));
    expect(e2.to).toEqual(entered(6500));
    expect(third.drawers.facts.income["job"]?.grossMonthly.value).toBe(6500);
    expect(next.drawers.facts.income["job"]?.grossMonthly.value).toBe(6000);
    expect(third.ledger.map((e) => e.id)).toEqual(["l1-2026-10-05", "l2-2026-10-05"]);
  });

  it("refuses to change the file's own bookkeeping through the Ledger", () => {
    const file = newClientFile("Test", "2026-10-01", "t1");
    for (const path of ["schemaVersion", "app", "ledger", "snapshots", "updatedAt", "ledger.0.why"]) {
      expect(() => applyChange(file, change(path, 9))).toThrow(/not a fact/);
    }
  });

  it("lists entries by owner", () => {
    let file = newClientFile("Test", "2026-10-01", "t1");
    file = applyChange(file, change("household.state", entered("NY"))).file;
    file = applyChange(file, change("drawers.facts.safetyNet.monthsToClose", entered(18))).file;
    expect(entriesFor(file, "sun").map((e) => e.path)).toEqual(["household.state"]);
    expect(entriesFor(file, "safetyNet").map((e) => e.path)).toEqual(["drawers.facts.safetyNet.monthsToClose"]);
    expect(entriesFor(file, "taxes")).toEqual([]);
  });
});

describe("planets write only what they own (ARCHITECTURE.md rule 3)", () => {
  it("lets the owner write and refuses every other planet", () => {
    const file = newClientFile("Test", "2026-10-01", "t1");
    const c = change("drawers.facts.debts.card.balance", entered(1200));
    expect(writeAs("debt", file, c).file.ledger[0]?.owner).toBe("debt");
    for (const p of PLANETS.filter((x) => x !== "debt")) expect(() => writeAs(p, file, c)).toThrow(new RegExp(`${p} cannot write drawers\\.facts\\.debts\\.card\\.balance: it belongs to debt`));
  });
});
