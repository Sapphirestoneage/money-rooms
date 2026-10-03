/**
 * Drop zone (design system 5): a dashed box for bringing one file into the app,
 * with a "Choose a file" button inside it for keyboard and touch.
 * The file is handed to the caller. It is read in the browser and goes nowhere else.
 */

import { el, uid } from "../dom";

export interface DropZoneOptions {
  /** What to drop, in plain words: "Drop your Money Rooms file here". */
  text: string;
  /** Called with a plain sentence when the drop can't be used (more than one file, or a file that can't be read). */
  onProblem(sentence: string): void;
}

/** What a dropped file can be: a filled template (CSV) or a full Money Rooms export (JSON). */
export type FileKind = "template" | "full";
type TextHandler = (name: string, text: string) => void;
const handlers: Partial<Record<FileKind, TextHandler>> = {};

/** A card says "hand me files of this kind". The newest card of each kind wins. */
export function handleFiles(kind: FileKind, handler: TextHandler): void {
  handlers[kind] = handler;
}

/** Sends text to the card that reads it, judged by what is inside, not by the file's name. */
export function routeText(name: string, text: string): void {
  const kind: FileKind = text.trimStart().startsWith("{") ? "full" : "template";
  handlers[kind]?.(name, text);
}

/** Reads a file in the browser and sends it to the card that reads it. Nothing leaves the browser. */
export async function routeFile(file: File, onProblem: (sentence: string) => void): Promise<void> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    onProblem(`"${file.name}" could not be read. Try choosing it again.`);
    return;
  }
  routeText(file.name, text);
}

/** One listener for the whole window: a file dropped anywhere on a screen with a drop zone is taken in. */
let windowListening = false;
function listenOnWindow(): void {
  if (windowListening) return;
  windowListening = true;
  const overAZone = (e: DragEvent) => e.target instanceof Element && e.target.closest(".drop-zone") !== null;
  window.addEventListener("dragover", (e) => {
    if (!carriesFiles(e) || overAZone(e)) return;
    // Never let the browser leave the app to open the file.
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = document.querySelector(".drop-zone") ? "copy" : "none";
  });
  window.addEventListener("drop", (e) => {
    if (!carriesFiles(e) || overAZone(e)) return;
    e.preventDefault();
    if (!document.querySelector(".drop-zone")) return;
    const file = e.dataTransfer?.files[0];
    if (file) void routeFile(file, () => undefined);
  });
}

/** True when a drag carries files (and not, say, selected text). */
function carriesFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

export function dropZone(o: DropZoneOptions): HTMLElement {
  listenOnWindow();
  const fileInput = el("input", { type: "file", accept: ".csv,.json,.txt,text/csv,text/plain,application/json", class: "visually-hidden", id: uid("file") });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) void routeFile(file, o.onProblem);
  });

  const zone = el(
    "div",
    { class: "drop-zone" },
    el("p", { class: "drop-zone__text" }, o.text),
    el("p", { class: "muted" }, "or"),
    el("label", { class: "button button--quiet", for: fileInput.id }, "Choose a file"),
    fileInput,
  );

  let depth = 0;
  const setActive = (on: boolean) => zone.classList.toggle("drop-zone--active", on);
  zone.addEventListener("dragenter", (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    depth += 1;
    setActive(true);
  });
  zone.addEventListener("dragover", (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  zone.addEventListener("dragleave", () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) setActive(false);
  });
  zone.addEventListener("drop", (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    depth = 0;
    setActive(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    const file = files[0];
    if (!file) return;
    if (files.length > 1) {
      o.onProblem("Drop one file at a time.");
      return;
    }
    void routeFile(file, o.onProblem);
  });

  return zone;
}

/** Hands the person a file to save. Made in the browser from text the app already holds. */
export function saveTextFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
