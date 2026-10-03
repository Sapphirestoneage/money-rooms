/**
 * Save and restore: export the household as a versioned JSON file, import one
 * by dropping it on the drop zone or choosing it (with a snapshot taken first
 * so it can be undone).
 */

import { exportFileName, exportToJson, importFromJson, type Household } from "../../engine";
import { dropZone, saveTextFile } from "../components/drop-zone";
import { gentleFlag } from "../components/gentle-flag";
import { clear, el } from "../dom";
import type { Store } from "../store";
import { todayIso } from "../store";

export interface TransferContext {
  household: () => Household;
  store: Store;
  replace(h: Household): void;
}

export function transferCard(ctx: TransferContext): HTMLElement {
  const status = el("div", { class: "stack", "aria-live": "polite" });
  const flag = (sentence: string) => {
    clear(status);
    status.append(gentleFlag(sentence));
  };

  const download = () => {
    const today = todayIso();
    saveTextFile(exportFileName(today), exportToJson(ctx.household(), today), "application/json");
  };

  /** Reads one file and imports it, the same way whether it was dropped or chosen. */
  const importFile = async (file: File): Promise<void> => {
    clear(status);
    let text: string;
    try {
      text = await file.text();
    } catch {
      flag(`"${file.name}" could not be read. Try choosing it again.`);
      return;
    }
    if (/\.csv$/i.test(file.name)) {
      flag(`"${file.name}" looks like a template. Drop it on "Import from a template" below.`);
      return;
    }
    const result = importFromJson(text);
    if (!result.ok) {
      flag(`"${file.name}" could not be imported. ${result.problems.join(" ")}`);
      return;
    }
    ctx.store.saveSnapshot(ctx.household(), new Date().toISOString());
    ctx.replace(result.household);
  };

  const zone = dropZone({
    text: "Drop your Money Rooms file here",
    accept: "application/json,.json",
    onFile: (file) => void importFile(file),
    onProblem: flag,
  });

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
