/**
 * The optimizer off the main thread (docs/performance-budget.md, rule 2). The page posts a household
 * and an objective; the worker runs the search, the strategy toggles, and the stress test, posting
 * progress as each finishes, then the results. Pure engine calls only: no DOM, no storage.
 */

import { optimize, strategyToggles, stressTest, type Household, type Objective, type OptimizerResult, type StressCase, type ToggleEffect } from "../../engine";

export interface OptimizerRequest {
  id: number;
  household: Household;
  objective: Objective;
}

export type OptimizerProgress = { id: number; stage: "searching" | "toggles" | "stress" };
export type OptimizerDone = { id: number; done: true; optimized: OptimizerResult; toggles: ToggleEffect[]; stress: StressCase[] };
export type OptimizerFailed = { id: number; error: string };
export type OptimizerMessage = OptimizerProgress | OptimizerDone | OptimizerFailed;

/** Runs the whole job, reporting each stage. Shared by the worker and the main-thread fallback. */
export function runOptimizerJob(req: OptimizerRequest, report: (m: OptimizerMessage) => void): void {
  try {
    report({ id: req.id, stage: "searching" });
    const optimized = optimize(req.household, { objective: req.objective });
    report({ id: req.id, stage: "toggles" });
    const toggles = strategyToggles(req.household, optimized.best.policy);
    report({ id: req.id, stage: "stress" });
    const stress = stressTest(req.household, optimized.best.policy);
    report({ id: req.id, done: true, optimized, toggles, stress });
  } catch (error) {
    report({ id: req.id, error: error instanceof Error ? error.message : String(error) });
  }
}

// In a worker there is no document: messages come in and go out. Imported on the main thread as a module, nothing runs.
const inWorker = typeof self !== "undefined" && typeof document === "undefined";
if (inWorker) {
  const scope = self as unknown as { onmessage: ((e: MessageEvent<OptimizerRequest>) => void) | null; postMessage(m: OptimizerMessage): void };
  scope.onmessage = (e: MessageEvent<OptimizerRequest>) => runOptimizerJob(e.data, (m) => scope.postMessage(m));
}
