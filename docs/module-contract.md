# The module contract

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 (answers batch, Part 2, branch `modules-oct4`). Decision A5. Enforced by `engine/modules/registry.ts` and `tests/modules.test.ts`.

---

## 1. Why

Money Rooms will keep growing: ten pack specs, a coaching spec, 244 features in the register. Without a contract every feature reaches into the data model, adds a card where it likes, and the app becomes the pile v1 became. The contract makes every feature beyond the core a module with a manifest the app can read, a test can check, and Eli can review in one page.

## 2. What is core and what is a module

The **core** is the engine, the data model (the dictionary), the design system, and Level 1: the five required questions, the FI date in three bands, the result screen, and the next card. The core has a manifest too (`data/modules/core.json`), marked `core: true`, so the complexity budget can count its cards alongside the modules'; it has no kill criteria.

Everything else is a **module**: a level's room, a pack, a lens group, a tab. A module has exactly one manifest at `data/modules/<id>.json`. The first two are `small-wins` (an existing feature, re-registered to prove the fit) and `debt-freedom` (the first pack, built as a module, flagged beta).

## 3. The manifest

Every field is required unless marked optional. The registry validates each manifest on load and throws on a bad one, so an invalid module cannot ship.

| Field | What it holds |
|---|---|
| `id` | Lower-case letters, digits, hyphens. The file name without `.json`. |
| `name` | What the screen calls it. |
| `job` | One sentence beginning `answers: `. If the job cannot be said in one sentence, it is two modules. |
| `reads` | The dictionary fields the module reads, as paths from the household record (`self.birthDate`, `accounts[].rate`). Every path starts at a key of the household record. |
| `adds.fields` | New dictionary fields the module introduces. Each one is proposed in `docs/data-dictionary.md` section 9 first (CLAUDE.md: never invent fields). |
| `adds.cards` | Cards the module shows, each with its `level` (1 to 5) and `screen`. Counted by the complexity budget. |
| `adds.lenses`, `adds.metrics`, `adds.items` | Lenses (M4), engine measures, and next-card items the module brings, by id. |
| `adds.screens` | Hash routes the module owns (`#/m/<id>` by convention). The router renders a module screen only through the registry. |
| `adds.concepts` | Each new idea a screen has to teach, as `{screen, concept}`. At most one per screen per module (budget rule 3). |
| `placement` | `level`, `tier`, `pack` or `lensGroup` (whichever apply), and `screen`: the screen the module is reached from. Its screens' parent in the route table. |
| `unlock` | A machine-checkable condition with its plain text: `always`, `hasDebt` (optionally excluding a mortgage), `hasAccounts`, or `hasField` with a path. |
| `engine.capabilities` | Engine functions the module leans on, by name. |
| `engine.coreChanges` | Anything the module needed changed in the engine, the data model, or the shell, each line beginning `core change:`. A module with no core changes is the goal; one with core changes is reviewed as a core change. |
| `flag` | `off`, `beta`, or `on` (section 4). |
| `killCriteria` | `measure`, `threshold`, and `action`: the usage measure, the level that triggers the action, and whether the module merges into something or is removed. Null only for the core. |
| `tests.goldenHousehold` | The example household file the module's acceptance test runs on (or null for a docs-only module). |
| `tests.acceptance` | The test files. |
| `files` | The source files the module owns. The contract test scans them: every household field they touch must be in `reads` or `adds.fields`. |
| `copy` | Content files whose sentences the wording scan covers (`tests/wording.test.ts`). |
| `checklist` | `spec`, `decision`, `axe {date, routes}`, `docs`: the module checklist's evidence (`docs/module-checklist.md`). |
| `replaces` | What the module takes the place of when its cards would overfill a level (budget rule 5). |

## 4. Flags

A module's flag lives only in its manifest in `data/modules/`, nowhere else. `off` never shows. `beta` shows only while the beta setting is on; the setting is a display preference, kept with the other display preferences in the browser, never with the plan. `on` shows for everyone. Whether a module shows for a household is flag and unlock together: `activeModules(household, {beta})`.

The About screen has a collapsed section, "Modules and beta features", that lists every module with its flag and its job and holds the beta switch. It is the only settings surface for modules.

## 5. What a module may and may not do

- It reads only the fields in `reads` and the fields it adds. The test scans its files.
- It adds a field only through the dictionary (section 9 proposal first), then lists it in `adds.fields`.
- It adds no color, type, spacing, or radius of its own: `ui/tokens.css` only, like everything else (`tests/ui-rules.test.ts`).
- It adds a screen only by listing the route in `adds.screens` and registering a renderer in `ui/modules/index.ts` under its id. The router (`ui/main.ts`) knows no module by name; it asks the registry which module owns a route and whether it is active.
- It adds a card to a level only by listing it in `adds.cards`; the Levels screen asks the registry for a level's module cards.
- Its engine code is pure, in `engine/modules/<id>.ts`, and every sentence it writes for a person comes out of the engine as data so the wording scan can read it.
- It states its own kill criteria before it ships, so removing it later is a decision already made, not an argument.

## 6. How the app discovers modules

`engine/modules/registry.ts` loads every `data/modules/*.json` (one glob, no list to maintain), validates each, and answers: which modules exist, which are active for a household, whether a route belongs to a module. `ui/routes.ts` builds the route table from the core's routes plus each module's screens, with the module's placement screen as parent. `ui/modules/index.ts` maps module ids to their screen and level-card renderers. Nothing else in the app knows a module's name.

## 7. Enforcement

| Rule | Where it fails |
|---|---|
| A manifest is complete and well formed | `loadModules()` throws; `tests/modules.test.ts` |
| Every module screen has a renderer and every renderer a manifest | `tests/modules.test.ts` |
| A module's files touch only the fields it declares | `tests/modules.test.ts` (static scan) |
| The complexity budget holds with every module counted | `tests/complexity-budget.test.ts` |
| A module flagged `on` has every checklist item | `tests/module-checklist.test.ts` (CI fails) |
| No module adds a color | `tests/ui-rules.test.ts` |
| Module copy describes, never instructs | `tests/wording.test.ts` reads each manifest's `copy` and the module's engine sentences |

## 8. Open questions for Eli

1. Should `beta` be a per-module switch as well as one global switch? One switch is simpler; the manifest list on About shows what it turns on.
2. The field scan is static (it looks for `h.<field>` and `household.<field>` in the module's files). A module that reaches a field through a helper is not caught. Is that enough for now, with review as the backstop?
3. Kill criteria name a usage measure, but the app collects no usage data by design. Until it does, the measure is something Eli judges from the five timed people and the beta feedback. Is that the intended meaning?
