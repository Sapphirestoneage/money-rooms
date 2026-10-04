# The module checklist

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 (answers batch, Part 2). Decision A5. Enforced by `tests/module-checklist.test.ts`: a module flagged `on` that lacks any item fails CI. A module flagged `beta` or `off` is reported, not failed.

---

Before a module's flag moves to `on`, every row holds. The manifest carries the evidence, so the test can read it.

| # | Item | Evidence in the manifest | What the test checks |
|---|---|---|---|
| 1 | **Spec.** A document that says what the module answers, who it is for, when it unlocks, what it reads and adds, what is new in the engine, and its acceptance tests. | `checklist.spec` | The file exists. |
| 2 | **Manifest.** Complete and valid (`docs/module-contract.md` section 3). | the manifest itself | `loadModules()` accepts it. |
| 3 | **Golden household test.** An example household the module runs on, with hand-checked expected values asserted in a test. | `tests.goldenHousehold`, `tests.acceptance` | The household file and every acceptance test file exist, and at least one test file imports the golden household. |
| 4 | **Wording scan.** Every sentence the module shows describes and never instructs. | `copy` (content files) and the module's engine sentences | Each `copy` file exists; `tests/wording.test.ts` reads the registry and scans them, plus the engine sentences the module's test exposes. |
| 5 | **axe on its screens.** Zero violations in light and dark, at 360px and desktop. | `checklist.axe {date, routes}` | Present, dated, and covering every route in `adds.screens`. |
| 6 | **Decision-log entry.** The module's existence and its core changes are decisions in `docs/decisions.md`. | `checklist.decision` | The id appears as a row in the decision log. |
| 7 | **Docs updated.** The pack spec, the dictionary (if fields were added), and the contract list it. | `checklist.docs` | Every listed file exists and mentions the module's id or name. |

## Standing (2026-10-04)

| Module | Flag | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| core | on | yes | yes | yes | yes | yes (2026-10-04 audit) | yes | yes |
| small-wins | on | yes | yes | yes | yes | yes (2026-10-04 audit) | yes | yes |
| debt-freedom | beta | yes | yes | yes | yes | yes (2026-10-04) | yes | yes |
| dependents | beta | yes (family pack) | yes | yes (Rosa) | engine sentences | yes (no screen of its own) | yes | yes |
| home | beta | yes (home pack) | yes | yes (Rosa) | engine sentences | yes | yes | yes |
| family-loans | beta | yes (debt pack) | yes | yes (Rosa) | engine sentences | yes | yes | yes |
| lump-sum | beta | yes (debt pack) | yes | yes (Rosa) | engine sentences | yes (What-ifs) | yes | yes |
| hard-season | beta | yes (divorce pack, kindness rules) | yes | yes (Rosa) | engine sentences | yes (What's next) | yes | yes |
| safety | beta | yes (divorce pack) | yes | none needed | its own copy | yes (Privacy, the curtain) | yes | yes |

The gate is the test, not this table; the table is a reading of it on the day it was written.
