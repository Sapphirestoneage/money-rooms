/**
 * Save and restore: export the household as a versioned JSON file, import one
 * by dropping it on the drop zone or choosing it (with a snapshot taken first
 * so it can be undone).
 */

import { exportFileName, exportToJson, importFromJson, type Household } from "../../engine";
import { gentleFlag } from "../components/gentle-flag";
import { clear, el, uid } from "../dom";
import type { Store } from "../store";
import { todayIso } from "../store";

export interface TransferContext {
  household: () => Household;
  store: Store;
  replace(h: Household): void;
}

/** True when a drag carries files (and not, say, selected text). */
function carriesFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

export function transferCard(ctx: TransferContext): HTMLElement {
  const status = el("div", { class: "stack", "aria-live": "polite" });

  const download = () => {
    const today = todayIso();
    const blob = new Blob([exportToJson(ctx.household(), today)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: exportFileName(today) });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /** Reads one file and imports it, the same way whether it was dropped or chosen. */
  const importFile = async (file: File): Promise<void> => {
    clear(status);
    let text: string;
    try {
      text = await file.text();
    } catch {
      status.append(gentleFlag(`"${file.name}" could not be read. Try choosing it again.`));
      return;
    }
    const result = importFromJson(text);
    if (!result.ok) {
      status.append(gentleFlag(`"${file.name}" could not be imported. ${result.problems.join(" ")}`));
      return;
    }
    ctx.store.saveSnapshot(ctx.household(), new Date().toISOString());
    ctx.replace(result.household);
  };

  const fileInput = el("input", { type: "file", accept: "application/json,.json", class: "visually-hidden", id: uid("import") });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) void importFile(file);
  });

  // The drop zone: drop a file on it, or use the button inside it.
  const zone = el(
    "div",
    { class: "drop-zone" },
    el("p", { class: "drop-zone__text" }, "Drop your Money Rooms file here"),
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
      clear(status);
      status.append(gentleFlag("Drop one file at a time."));
      return;
    }
    void importFile(file);
  });

  // A file dropped beside the zone must not make the browser leave the app and open the file.
  const guard = (e: DragEvent) => {
    if (!zone.isConnected) {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
      return;
    }
    if (carriesFiles(e) && !(e.target instanceof Node && zone.contains(e.target))) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    }
  };
  window.addEventListener("dragover", guard);
  window.addEventListener("drop", guard);

  const snapshot = ctx.store.loadSnapshot();
  if (snapshot) {
    status.append(
      gentleFlag("An import replaced your numbers. The copy from before it is kept until you clear it.", {
        label: "Undo the import",
        onClick: () => {
          ctx.replace(snapshot.household);
          ctx.store.clearSnapshot();
        },
      }),
    );
  }

  return el(
    "section",
    { class: "card" },
    el("div", { class: "card__title" }, el("h2", {}, "Save and restore")),
    el("p", { class: "muted" }, ctx.store.isPersistent()
      ? "Every change is saved in this browser as you make it, and is here when you come back. Export a file to keep a copy or move to another device. Importing replaces what is here, after saving a copy you can go back to."
      : "This browser is not keeping what you enter. Export a file to keep your numbers, and import it next time."),
    zone,
    el("div", { class: "row-actions" }, el("button", { type: "button", class: "button button--quiet", onClick: download }, "Export my numbers")),
    status,
  );
}
