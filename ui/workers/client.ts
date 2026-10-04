/**
 * The page's side of the engine worker: one shared worker for every screen, created on first
 * use, with a main-thread timeout fallback where workers are unavailable or the worker fails.
 * Messages are routed to the job that asked by id. UI plumbing only; no calculations.
 */

import { runEngineJob, type EngineJob, type EngineMessage } from "./engine.worker";

type Listener = (m: EngineMessage) => void;

let worker: Worker | null | undefined;
const pending = new Map<number, { job: EngineJob; listener: Listener }>();
let lastId = 0;

/** A fresh job id; screens compare it against incoming messages to ignore stale jobs. */
export function nextJobId(): number {
  lastId += 1;
  return lastId;
}

function deliver(m: EngineMessage): void {
  const entry = pending.get(m.id);
  if (!entry) return;
  if (!("stage" in m)) pending.delete(m.id);
  entry.listener(m);
}

function runOnMainThread(job: EngineJob): void {
  window.setTimeout(() => runEngineJob(job, deliver), 30);
}

function ensureWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === "undefined") return null;
  try {
    const w = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<EngineMessage>) => deliver(e.data);
    w.onerror = () => {
      // The worker is gone: finish every waiting job on the main thread and stay there from now on.
      worker = null;
      for (const { job } of pending.values()) runOnMainThread(job);
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** Runs a job in the worker (or, failing that, in a timeout on the main thread), delivering progress and the result to `onMessage`. */
export function runInEngineWorker(job: EngineJob, onMessage: Listener): void {
  pending.set(job.id, { job, listener: onMessage });
  const w = ensureWorker();
  if (w) {
    w.postMessage(job);
    return;
  }
  runOnMainThread(job);
}
