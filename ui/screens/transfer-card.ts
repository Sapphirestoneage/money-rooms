/**
 * Save and restore: export the household as a versioned JSON file, import one
 * (with a snapshot taken first so it can be undone).
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

export function transferCard(ctx: TransferContext): HTMLElement {
  const status = el("div", { class: "stack" });

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

  const fileInput = el("input", { type: "file", accept: "application/json,.json", class: "visually-hidden", id: uid("import") });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importFromJson(text);
    clear(status);
    if (!result.ok) {
      status.append(gentleFlag(`That file could not be imported. ${result.problems.join(" ")}`));
      fileInput.value = "";
      return;
    }
    const takenAt = new Date().toISOString();
    ctx.store.saveSnapshot(ctx.household(), takenAt);
    ctx.replace(result.household);
    fileInput.value = "";
  });

  const render = () => {
    clear(status);
    const snapshot = ctx.store.loadSnapshot();
    if (snapshot) {
      status.append(
        gentleFlag(`An import replaced your numbers. The copy from before it is kept until you clear it.`, {
          label: "Undo the import",
          onClick: () => {
            ctx.replace(snapshot.household);
            ctx.store.clearSnapshot();
          },
        }),
      );
    }
  };
  render();

  return el(
    "section",
    { class: "card" },
    el("div", { class: "card__title" }, el("h2", {}, "Save and restore")),
    el("p", { class: "muted" }, ctx.store.isPersistent()
      ? "Every change is saved in this browser as you make it, and is here when you come back. Export a file to keep a copy or move to another device. Importing replaces what is here, after saving a copy you can go back to."
      : "This browser is not keeping what you enter. Export a file to keep your numbers, and import it next time."),
    el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button button--quiet", onClick: download }, "Export my numbers"),
      el("label", { class: "button button--quiet", for: fileInput.id }, "Import a file"),
      fileInput,
    ),
    status,
  );
}
