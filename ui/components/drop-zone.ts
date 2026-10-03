/**
 * Drop zone (design system 5): a dashed box for bringing one file into the app,
 * with a "Choose a file" button inside it for keyboard and touch.
 * The file is handed to the caller. It is read in the browser and goes nowhere else.
 */

import { el, uid } from "../dom";

export interface DropZoneOptions {
  /** What to drop, in plain words: "Drop your Money Rooms file here". */
  text: string;
  /** The file picker's filter, like ".csv,text/csv". */
  accept: string;
  onFile(file: File): void;
  /** Called with a plain sentence when the drop can't be used (more than one file). */
  onProblem(sentence: string): void;
}

/** True when a drag carries files (and not, say, selected text). */
function carriesFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

export function dropZone(o: DropZoneOptions): HTMLElement {
  const fileInput = el("input", { type: "file", accept: o.accept, class: "visually-hidden", id: uid("file") });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) o.onFile(file);
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
    o.onFile(file);
  });

  // A file dropped beside every zone must not make the browser leave the app and open the file.
  const guard = (e: DragEvent) => {
    if (!zone.isConnected) {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
      return;
    }
    const overAZone = e.target instanceof Element && e.target.closest(".drop-zone") !== null;
    if (carriesFiles(e) && !overAZone) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    }
  };
  window.addEventListener("dragover", guard);
  window.addEventListener("drop", guard);

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
