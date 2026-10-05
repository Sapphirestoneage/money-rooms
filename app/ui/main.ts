/**
 * The coach console (card 1): the client picker, export and import to a folder the coach chooses,
 * snapshots, and undo of the last import. Reads app/core. Never calculates.
 */

import { ClientManager, browserStorage, type IsoDate } from "../core";

const today = (): IsoDate => new Date().toISOString().slice(0, 10);

function el(tag: string, attrs: Record<string, unknown> = {}, ...children: (Node | string | null)[]): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "onClick") node.addEventListener("click", v as EventListener);
    else if (k === "onChange") node.addEventListener("change", v as EventListener);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null) node.append(c);
  return node;
}

function boot(): void {
  const root = document.getElementById("app");
  if (!root) return;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  if (!storage) {
    root.append(el("p", { class: "notice" }, "This browser is not keeping anything between visits (a private window does this). The console needs a normal window."));
    return;
  }
  const manager = new ClientManager(browserStorage(storage), today);
  let notice: string | null = null;

  const say = (text: string) => { notice = text; render(); };

  async function exportCurrent(): Promise<void> {
    const text = manager.exportJson();
    const name = manager.exportFileName();
    const picker = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<{ createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }> }> }).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({ suggestedName: name, types: [{ description: "Money Rooms client file", accept: { "application/json": [".json"] } }] });
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
        say(`Saved ${name} to the folder you chose.`);
        return;
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = el("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    say(`Downloaded ${name}. Move it to your clients folder.`);
  }

  function importFile(file: File): void {
    void file.text().then((text) => {
      try {
        const result = manager.importJson(text);
        say(`${result.replaced ? "Replaced" : "Opened"} ${result.file.client.label} from the file${result.migrated.length ? ` (migrated from schema ${result.migrated[0]})` : ""}. A snapshot of what was open was kept first.`);
      } catch (error) {
        say(`Nothing was changed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  function render(): void {
    root!.replaceChildren();
    const current = manager.current();
    const clients = manager.list();
    const label = el("input", { class: "input", type: "text", id: "new-label", placeholder: "A nickname, never a legal name", autocomplete: "off" }) as HTMLInputElement;
    const create = el("button", { type: "button", class: "button button--primary", onClick: () => { try { manager.create(label.value); say(`Created and opened ${label.value.trim()}.`); } catch (error) { say(error instanceof Error ? error.message : String(error)); } } }, "Create and open");
    const fileInput = el("input", { class: "visually-hidden", type: "file", accept: ".json,application/json", id: "import-file", onChange: (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importFile(f); } }) as HTMLInputElement;

    root!.append(
      el("div", { class: "console" },
        el("h1", {}, "Money Rooms, coach console"),
        el("p", { class: "muted" }, "Client files live in a folder you choose, outside this app. This browser keeps a working copy of the open client only."),
        notice ? el("p", { class: "notice", role: "status" }, notice) : null,
        el("section", { class: "card", "aria-label": "Open client" },
          el("h2", {}, current ? `Open: ${current.client.label}` : "No client open"),
          current ? el("p", { class: "muted" }, `Created ${current.client.createdAt}, last changed ${current.updatedAt}. Schema ${current.schemaVersion}. ${current.snapshots.length} ${current.snapshots.length === 1 ? "snapshot" : "snapshots"}.`) : el("p", { class: "muted" }, "Create a client or import a file to begin."),
          el("div", { class: "row" },
            current ? el("button", { type: "button", class: "button", onClick: () => void exportCurrent() }, "Export to a file") : null,
            el("button", { type: "button", class: "button", onClick: () => fileInput.click() }, "Import a file"),
            current ? el("button", { type: "button", class: "button", onClick: () => { const r = manager.undoLastImport(); say(r ? "The last import was undone." : "There is no import to undo."); } }, "Undo last import") : null,
            current ? el("button", { type: "button", class: "button", onClick: () => { manager.snapshot("manual"); say("Snapshot taken."); } }, "Take a snapshot") : null,
            current ? el("button", { type: "button", class: "button", onClick: () => { manager.close(); say("Closed."); } }, "Close") : null,
          ),
          fileInput,
        ),
        el("section", { class: "card", "aria-label": "Clients" },
          el("h2", {}, "Clients"),
          clients.length
            ? el("ul", { class: "list" }, ...clients.map((c) => el("li", {}, el("span", {}, `${c.label} `, el("span", { class: "muted" }, `(changed ${c.updatedAt})`)), el("span", { class: "row" }, el("button", { type: "button", class: "button", disabled: current?.client.id === c.id ? "true" : null, onClick: () => { manager.open(c.id); say(`Opened ${c.label}. A session snapshot was taken.`); } }, current?.client.id === c.id ? "Open now" : "Open")))))
            : el("p", { class: "muted" }, "No clients yet."),
          el("div", { class: "field" }, el("label", { for: "new-label" }, "New client"), label),
          el("div", { class: "row" }, create),
        ),
        el("section", { class: "card", "aria-label": "Snapshots" },
          el("h2", {}, "Snapshots"),
          current && current.snapshots.length
            ? el("ul", { class: "list" }, ...manager.snapshots().slice(0, 10).map((s) => el("li", {}, el("span", {}, `${s.takenAt}, ${s.reason === "beforeImport" ? "before an import" : s.reason === "sessionStart" ? "session start" : "manual"}`))))
            : el("p", { class: "muted" }, "A snapshot is taken before every import and at the start of each session, and kept with the client's file."),
        ),
      ),
    );
  }

  render();
}

boot();
