/**
 * The engine off the main thread (docs/performance-budget.md rule 2, decisions S2 and A3). The page
 * posts a job; the worker runs it and posts progress as each stage finishes, then the result.
 * Three jobs: the three-band FI search the result screen's headline needs, the optimizer with its
 * toggles, stress test, and 72(t) commitment, and the Risk screen's backtests and sturdy dates.
 * Pure engine calls only: no DOM, no storage. `runEngineJob` is shared by the worker and the
 * main-thread fallback.
 */

import {
  backtest,
  defaultDeps,
  findFiDate,
  flexAdjuster,
  guardrailsAdjuster,
  optimize,
  project,
  requireComplete,
  resolveAssumptions,
  resolveBand,
  seppCommitment,
  strategyToggles,
  stressTest,
  sturdyFiYear,
  type Backtest,
  type Household,
  type Objective,
  type OptimizerResult,
  type ProjectionResult,
  type SeppCommitment,
  type StressCase,
  type ToggleEffect,
} from "../../engine";

export type SturdyFiYear = ReturnType<typeof sturdyFiYear>;

export type EngineJob =
  | { id: number; kind: "project"; household: Household }
  | { id: number; kind: "optimize"; household: Household; objective: Objective }
  | { id: number; kind: "backtests"; household: Household; thresholdPercent: number; trimPercent: number; minHistoryYears: number };

export type EngineStage = "projecting" | "searching" | "toggles" | "stress" | "commitment" | "fiDate" | "backtest" | "guardrails" | "flex" | "sturdy" | "flexSturdy";

export type EngineProgress = { id: number; stage: EngineStage };
export type ProjectDone = { id: number; kind: "project"; done: true; projection: ProjectionResult };
export type OptimizeDone = { id: number; kind: "optimize"; done: true; optimized: OptimizerResult; toggles: ToggleEffect[]; stress: StressCase[]; commitment: SeppCommitment | null };
export type BacktestsDone = {
  id: number;
  kind: "backtests";
  done: true;
  fiYear: number | null;
  fiAge: number | null;
  plain: Backtest | null;
  guard: Backtest | null;
  flex: Backtest | null;
  sturdy: SturdyFiYear | null;
  flexSturdy: SturdyFiYear | null;
};
export type EngineFailed = { id: number; error: string };
export type EngineMessage = EngineProgress | ProjectDone | OptimizeDone | BacktestsDone | EngineFailed;

/** Runs one job, reporting each stage then the result (or the error). */
export function runEngineJob(job: EngineJob, report: (m: EngineMessage) => void): void {
  const { id } = job;
  try {
    switch (job.kind) {
      case "project": {
        report({ id, stage: "projecting" });
        report({ id, kind: "project", done: true, projection: project(job.household) });
        return;
      }
      case "optimize": {
        report({ id, stage: "searching" });
        const optimized = optimize(job.household, { objective: job.objective });
        report({ id, stage: "toggles" });
        const toggles = strategyToggles(job.household, optimized.best.policy);
        report({ id, stage: "stress" });
        const stress = stressTest(job.household, optimized.best.policy);
        let commitment: SeppCommitment | null = null;
        if (optimized.best.policy.sepp) {
          report({ id, stage: "commitment" });
          commitment = seppCommitment(job.household, optimized);
        }
        report({ id, kind: "optimize", done: true, optimized, toggles, stress, commitment });
        return;
      }
      case "backtests": {
        report({ id, stage: "fiDate" });
        const h = job.household;
        const band = resolveBand(resolveAssumptions(h.assumptions), "likely");
        const fi = findFiDate(requireComplete(h), band, defaultDeps());
        const fiYear = fi.retirementYear;
        const o = { minHistoryYears: job.minHistoryYears };
        let plain: Backtest | null = null;
        let guard: Backtest | null = null;
        let flex: Backtest | null = null;
        let sturdy: SturdyFiYear | null = null;
        let flexSturdy: SturdyFiYear | null = null;
        if (fiYear !== null) {
          report({ id, stage: "backtest" });
          plain = backtest(h, fiYear, o);
          report({ id, stage: "guardrails" });
          guard = backtest(h, fiYear, { ...o, spendingAdjuster: guardrailsAdjuster() });
          report({ id, stage: "flex" });
          flex = backtest(h, fiYear, { ...o, spendingAdjuster: flexAdjuster(job.trimPercent) });
          report({ id, stage: "sturdy" });
          sturdy = sturdyFiYear(h, fiYear, job.thresholdPercent, o);
          report({ id, stage: "flexSturdy" });
          flexSturdy = sturdyFiYear(h, fiYear, job.thresholdPercent, { ...o, spendingAdjuster: flexAdjuster(job.trimPercent) });
        }
        report({ id, kind: "backtests", done: true, fiYear, fiAge: fi.fiAge, plain, guard, flex, sturdy, flexSturdy });
        return;
      }
    }
  } catch (error) {
    report({ id, error: error instanceof Error ? error.message : String(error) });
  }
}

// In a worker there is no document: messages come in and go out. Imported on the main thread as a module, nothing runs.
const inWorker = typeof self !== "undefined" && typeof document === "undefined";
if (inWorker) {
  const scope = self as unknown as { onmessage: ((e: MessageEvent<EngineJob>) => void) | null; postMessage(m: EngineMessage): void };
  scope.onmessage = (e: MessageEvent<EngineJob>) => runEngineJob(e.data, (m) => scope.postMessage(m));
}
