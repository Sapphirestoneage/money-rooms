/**
 * Import from a template (docs/import-template.md): drop or choose a filled
 * template, see a preview of what it holds, and apply it only on a tap.
 * The file is read in this browser and is never sent anywhere.
 * The engine does the reading and checking; this file only shows the result.
 */

import { exportTemplate, readTemplate, templateFileName, type TemplatePreview, type TemplateSection } from "../../engine";
import promptText from "../../templates/ai-fill-prompt.txt?raw";
import templateText from "../../templates/money-rooms-template.csv?raw";
import { dropZone, handleFiles, saveTextFile } from "../components/drop-zone";
import { gentleFlag } from "../components/gentle-flag";
import { clear, el } from "../dom";
import { todayIso } from "../store";
import type { TransferContext } from "./transfer-card";

const SECTION_LABELS: readonly (readonly [TemplateSection, string, string, string])[] = [
  ["profile", "About you", "answer", "answers"],
  ["income", "Income", "source", "sources"],
  ["spending", "Spending", "amount", "amounts"],
  ["account", "Accounts", "account", "accounts"],
  ["debt", "Debts", "debt", "debts"],
  ["optional", "Sharpeners", "answer", "answers"],
];

export function templateCard(ctx: TransferContext): HTMLElement {
  const status = el("div", { class: "stack", "aria-live": "polite" });
  const flag = (sentence: string) => {
    clear(status);
    status.append(gentleFlag(sentence));
  };

  const showPreview = (fileName: string, preview: TemplatePreview) => {
    clear(status);
    const counts = el("ul", { class: "import-preview__counts" });
    for (const [section, label, one, many] of SECTION_LABELS) {
      const unit = preview.counts[section] === 1 ? one : many;
      counts.append(el("li", {}, el("span", {}, label), el("span", { class: "import-preview__count" }, `${preview.counts[section]} ${unit}`)));
    }

    const list = (title: string, intro: string, notes: TemplatePreview["needsALook"], sentence: (n: TemplatePreview["needsALook"][number]) => string) =>
      notes.length === 0
        ? null
        : el(
            "div",
            { class: "import-preview__group" },
            el("h4", {}, `${title} (${notes.length})`),
            el("p", { class: "muted" }, intro),
            el("ul", { class: "import-preview__notes" }, ...notes.map((n) => el("li", {}, sentence(n)))),
          );

    const apply = el("button", { type: "button", class: "button" }, "Apply");
    apply.addEventListener("click", () => {
      ctx.store.saveSnapshot(ctx.household(), new Date().toISOString());
      ctx.replace(preview.household);
    });
    const cancel = el("button", { type: "button", class: "button button--quiet" }, "Keep what I have");
    cancel.addEventListener("click", () => clear(status));

    status.append(
      el(
        "div",
        { class: "import-preview", role: "group", "aria-label": "Import preview" },
        el("h3", {}, fileName === "What you pasted" ? "What you pasted holds" : `What "${fileName}" holds`),
        el("p", { class: "muted" }, "Nothing has changed yet."),
        counts,
        list("Needs a look", "A row that could not be read is not imported. Fix these in the file and drop it again, or enter them by hand after.", preview.needsALook, (n) =>
          n.line > 0 ? `Row ${n.line}, ${n.label}: ${n.reason}.` : `${n.label}: ${n.reason}.`),
        list("To look up later", "These were marked as not known, so they are left blank.", preview.toLookUp, (n) => (n.label === n.reason ? `${n.label}.` : `${n.label}: ${n.reason}.`)),
        el("p", {}, "Apply replaces the numbers you have now. A copy of them is kept first, so you can undo it."),
        el("div", { class: "row-actions" }, apply, cancel),
      ),
    );
    window.setTimeout(() => apply.focus(), 0);
  };

  /** Shows what a template holds, whether it was dropped anywhere, chosen, or pasted. Nothing is applied here. */
  const readText = (name: string, text: string): void => {
    clear(status);
    const preview = readTemplate(text, todayIso());
    if (preview.fileProblems.length > 0) flag(`"${name}" could not be read as a template. ${preview.fileProblems.join(" ")}`);
    else showPreview(name, preview);
    status.scrollIntoView({ block: "center" });
  };
  handleFiles("template", readText);

  const zone = dropZone({ text: "Drop a filled template here, or anywhere on this page", onProblem: flag });

  // Pasting: an AI usually returns the template as text in a chat, not as a file.
  const pasteBox = el("textarea", { class: "input paste-box", rows: 4, id: "template-paste", placeholder: "section,item,field,value,cadence,kind,as_of,notes", spellcheck: false });
  const pasteButton = el("button", { type: "button", class: "button button--quiet" }, "Preview what I pasted");
  pasteButton.addEventListener("click", () => {
    if (pasteBox.value.trim() === "") flag("Paste the filled template into the box first.");
    else readText("What you pasted", pasteBox.value);
  });
  const paste = el(
    "div",
    { class: "stack" },
    el("label", { class: "field__label", for: "template-paste" }, "Or paste the filled template here"),
    pasteBox,
    el("div", { class: "row-actions" }, pasteButton),
  );

  return el(
    "section",
    { class: "card" },
    el("div", { class: "card__title" }, el("h2", {}, "Import from a template")),
    el(
      "p",
      { class: "muted" },
      "A template is a spreadsheet with one row per number. Fill it in yourself, or give it and the prompt to an AI that knows your finances and drop what it returns here. The file is read in this browser and is never sent anywhere.",
    ),
    el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button button--quiet", onClick: () => saveTextFile("money-rooms-template.csv", templateText, "text/csv") }, "Get the template"),
      el("button", { type: "button", class: "button button--quiet", onClick: () => saveTextFile("ai-fill-prompt.txt", promptText, "text/plain") }, "Get the AI prompt"),
    ),
    zone,
    paste,
    el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button button--quiet", onClick: () => saveTextFile(templateFileName(todayIso()), exportTemplate(ctx.household()), "text/csv") }, "Export as template"),
    ),
    status,
  );
}
