/**
 * Backup nudge card (design system 5): the numbers live only in this browser,
 * so after 30 days without an export the card asks for one. Reads display
 * preferences for the last export and the snooze. Never calculates.
 */

import { exportFileName, exportToJson, type Household } from "../../engine";
import { el } from "../dom";
import type { Store } from "../store";
import { todayIso } from "../store";
import { saveTextFile } from "./drop-zone";

export const BACKUP_NUDGE_DAYS = 30;

const daysBetween = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** True when the household has anything worth keeping. */
function hasNumbers(h: Household): boolean {
  return h.self.income.kind !== "unanswered" || h.spending.kind !== "unanswered" || h.accounts.kind !== "unanswered";
}

/** Whether the nudge is due today: numbers exist, no export in 30 days (or ever), and no snooze in force. */
export function backupNudgeDue(h: Household, store: Store, today: string = todayIso()): boolean {
  if (!hasNumbers(h)) return false;
  const prefs = store.loadPrefs();
  if (prefs.backupSnoozedUntil && prefs.backupSnoozedUntil > today) return false;
  if (!prefs.lastExportAt) return true;
  return daysBetween(prefs.lastExportAt, today) >= BACKUP_NUDGE_DAYS;
}

export function backupNudge(h: () => Household, store: Store, onChange: () => void): HTMLElement | null {
  const today = todayIso();
  if (!backupNudgeDue(h(), store, today)) return null;
  const prefs = store.loadPrefs();
  const last = prefs.lastExportAt;
  const sentence = last
    ? `Your numbers live only in this browser. The last copy you saved was ${daysBetween(last, today)} days ago.`
    : "Your numbers live only in this browser. No copy has been saved yet.";
  const exportNow = () => {
    saveTextFile(exportFileName(today), exportToJson(h(), today), "application/json");
    store.savePrefs({ ...store.loadPrefs(), lastExportAt: today });
    onChange();
  };
  const later = () => {
    const until = new Date(Date.parse(`${today}T00:00:00Z`) + BACKUP_NUDGE_DAYS * 86_400_000).toISOString().slice(0, 10);
    store.savePrefs({ ...store.loadPrefs(), backupSnoozedUntil: until });
    onChange();
  };
  return el(
    "section",
    { class: "card backup-nudge", "aria-label": "Save a copy of your numbers" },
    el("p", {}, sentence, " A saved file is the only way to get them back on another device or after this browser is cleared."),
    el(
      "div",
      { class: "row-actions" },
      el("button", { type: "button", class: "button", onClick: exportNow }, "Export my numbers"),
      el("button", { type: "button", class: "button button--quiet", onClick: later }, "Not now"),
    ),
  );
}
