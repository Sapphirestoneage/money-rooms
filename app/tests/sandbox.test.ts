import { describe, expect, it } from "vitest";
import { Sandbox, applyChange, entered, newClientFile, readerFor, rough, type ClientFile, type Scenario } from "../core";

function fileWithJob(): ClientFile {
  const file = newClientFile("Test", "2026-10-01", "t1");
  return applyChange(file, { path: "drawers.facts.income.job", to: { id: "job", personId: "self", label: "Job", type: entered("salary"), grossMonthly: entered(6000), takeHomeMonthly: entered(4500), stability: entered("steady") }, by: "coach", why: "setup", at: "2026-10-01" }).file;
}

describe("the copy-on-write sandbox (ARCHITECTURE.md section 4)", () => {
  it("reads live data through, and a write stays in the sandbox", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Raise" });
    expect(box.get("drawers.facts.income.job.grossMonthly")).toEqual(entered(6000));
    box.set("drawers.facts.income.job.grossMonthly", entered(7000));
    expect(box.get("drawers.facts.income.job.grossMonthly")).toEqual(entered(7000));
    expect(live.file.drawers.facts.income["job"]?.grossMonthly).toEqual(entered(6000));
    expect(live.file.ledger).toHaveLength(1);
  });

  it("sees a live change made after the sandbox was opened, unless the sandbox shadows that path", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Raise" });
    box.set("drawers.facts.income.job.grossMonthly", entered(7000));
    live.file = applyChange(live.file, { path: "drawers.facts.income.job.takeHomeMonthly", to: entered(4800), by: "coach", why: "paystub", at: "2026-10-02" }).file;
    live.file = applyChange(live.file, { path: "drawers.facts.income.job.grossMonthly", to: entered(6100), by: "coach", why: "paystub", at: "2026-10-02" }).file;
    expect(box.get("drawers.facts.income.job.takeHomeMonthly")).toEqual(entered(4800));
    expect(box.get("drawers.facts.income.job.grossMonthly")).toEqual(entered(7000));
  });

  it("a whole entity replaced in the sandbox shadows the paths under it", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "New job" });
    box.set("drawers.facts.income.job", { id: "job", personId: "self", label: "New job", type: entered("salary"), grossMonthly: rough(9000), takeHomeMonthly: rough(6500), stability: entered("steady") });
    expect(box.get("drawers.facts.income.job.grossMonthly")).toEqual(rough(9000));
    expect(box.get("drawers.facts.income.job.label")).toBe("New job");
    box.unset("drawers.facts.income.job");
    expect(box.get("drawers.facts.income.job.label")).toBe("Job");
  });

  it("the sandbox stores a copy, not a reference", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Copy" });
    const v = entered(7000);
    box.set("drawers.facts.income.job.grossMonthly", v);
    v.value = 1;
    expect(box.get("drawers.facts.income.job.grossMonthly")).toEqual(entered(7000));
  });

  it("a metric reads through the sandbox and sees the what-if, while the real file is untouched", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Raise" });
    box.set("drawers.facts.income.job.grossMonthly", entered(7000));
    expect(readerFor(() => live.file).read("drawers.facts.income.job.grossMonthly")).toMatchObject({ value: 6000 });
    expect(readerFor(() => live.file, box).read("drawers.facts.income.job.grossMonthly")).toMatchObject({ value: 7000 });
  });

  it("round-trips to a saved scenario and back", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Raise" });
    box.set("drawers.facts.income.job.grossMonthly", entered(7000));
    const scenario: Scenario = box.toScenario("2026-10-05");
    expect(scenario).toEqual({ id: "s1", label: "Raise", createdAt: "2026-10-05", changes: [{ path: "drawers.facts.income.job.grossMonthly", value: entered(7000) }] });
    const again = Sandbox.fromScenario(() => live.file, scenario);
    expect(again.get("drawers.facts.income.job.grossMonthly")).toEqual(entered(7000));
    expect(again.changes()).toEqual(scenario.changes);
  });

  it("promote turns chosen overlay entries into Ledger entries, and only those", () => {
    const live = { file: fileWithJob() };
    const box = new Sandbox(() => live.file, { id: "s1", label: "Raise and move" });
    box.set("drawers.facts.income.job.grossMonthly", entered(7000));
    box.set("household.state", entered("PA"));
    const promoted = box.promote(live.file, "2026-10-05", "Client confirmed the raise", ["drawers.facts.income.job.grossMonthly"]);
    expect(live.file.drawers.facts.income["job"]?.grossMonthly).toEqual(entered(6000));
    expect(promoted.drawers.facts.income["job"]?.grossMonthly).toEqual(entered(7000));
    expect(promoted.household.state.status).toBe("empty");
    const entry = promoted.ledger.at(-1)!;
    expect(entry).toMatchObject({ by: "promote", path: "drawers.facts.income.job.grossMonthly", from: entered(6000), to: entered(7000), owner: "income" });
    expect(entry.why).toBe("Client confirmed the raise (promoted from scenario Raise and move)");
    expect(box.changes().map((c) => c.path)).toEqual(["household.state"]);

    const all = box.promote(promoted, "2026-10-06", "Moved");
    expect(all.household.state).toEqual(entered("PA"));
    expect(all.ledger).toHaveLength(3);
    expect(box.changes()).toEqual([]);
  });
});
