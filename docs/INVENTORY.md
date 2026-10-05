# Inventory of the existing code (for the v1 coach edition in /app)

Written 2026-10-05 from branch `messy-oct4` (the newest state: the M1 skeleton on `main` plus the unmerged M2 to M6 work on pull requests 1 to 5). Nothing here was changed or deleted; v1 is built in `/app` and reads from this code only where this inventory says a function is safe to reuse.

"Correct" below means one of three things, stated each time: **tied out** (matches Eli's hand workpapers cell by cell), **tested** (unit tests pass but no hand tie-out exists), or **proposed** (built to a spec Eli has not reviewed, or leaning on a registry rule still marked unverified).

## 1. Layout

| Path | What it is | Size |
|---|---|---|
| `engine/` | Pure functions: data in, results out. No DOM, no storage. | about 13,000 lines |
| `ui/` | Screens, components, a Web Worker client, local storage. Never calculates. | about 6,500 lines |
| `data/` | Every rule value, preset, and content file as JSON: tax tables, the rules registry, presets, categories, items, small wins, module manifests. | 24 files |
| `tests/` | 61 test files, 644 tests; the Maya workpapers (`tests/workpapers/`) and the tie-out harness (`tests/tie-out/`). | |
| `docs/` | Data dictionary, engine spec, M2 to M6 specs, pack specs, decisions log, module contract, audits. | |

## 2. Engine, by folder

### engine/model (the data model and values)
| Function | Reusable for v1? | Correct? |
|---|---|---|
| `value`, `userValue`, `statementValue`, `presetValue`, `assumptionValue`, `computedValue`, `notForMe`, `isAnswered`, `valueOr` (values.ts) | **Yes, as the pattern.** Every number carries `asOf`, `source`, `confidence`. v1 needs a richer status set (empty, unknown, rough, entered, verified, none, not applicable) and precision, so v1 defines its own `Input` type modeled on this rather than importing it. | Tested. |
| `parseYearMonth`, `monthsBetween`, `ageInYears`, `ageAtYearEnd`, `addMonths`, `stubFraction` (dates.ts) | **Yes, import directly.** Birth date to age arithmetic is exactly what v1's "store birth date, not age" needs. | Tested. |
| `annualFrom`, `fromAnnual`, `annualFromMonthly`, `percentOfPay` (normalize.ts) | **Yes, import directly.** Cadence conversion for monthly gross and take-home. | Tested. |
| `loadAccountPresets`, `getAccountPreset`, `assetFromPreset`, `debtFromPreset` (presets.ts) | Yes for the preset list (tax bucket, liquidity tier, typical rate). The v1 Investments planet's "balances by tax bucket and liquidity tier" can reuse the preset vocabulary. | Tested; the typical rates are placeholders marked `lookUp`. |
| `loadTaxTables`, `stateTable`, `stateColumnFor` (tax-tables.ts) | **Yes.** 2026 federal tables and 51 state tables, sourced in `data/tax/2026.json`. | Federal verified against Rev. Proc. 2025-32; state tables from the Tax Foundation (secondary), `verified: null`. |
| `RuleLedger`, `rule`, `loadRules`, `ruleAppliesIn` (rules.ts) | **Yes.** The registry pattern (every rule with source, URL, last-verified date, sunset) is the right home for v1's Taxes planet; `getUnverified` plus a flag is the door for rules not yet confirmed. | Tested. Three rules are unverified (dependent care credit phase-down, below-market loans, PA compensation). |
| `exportHousehold`, `importFromJson`, `migrateHousehold`, `validateHousehold` (transfer.ts) | **Pattern only.** v1 has its own file shape (four drawers, schema version, migration), so it defines its own export, but the shape of validate-then-migrate is the one to copy. | Tested. |
| `householdFromExample`, `emptyHousehold`, `missingLevelOneAnswers`, `resolveAssumptions`, assumption sets (`data/assumption-sets.json`) | Assumption sets, yes: three bands (worst, likely, best) map onto v1's unrealistic, likely, realistic cases. The household shape itself is the v2 shape and not v1's. | Tested; band values are proposed placeholders. |

### engine/tax
| Function | Reusable? | Correct? |
|---|---|---|
| `taxFromBrackets`, `marginalRateFromBrackets` (brackets.ts) | **Yes, import directly.** Progressive bracket arithmetic; nothing product-specific. | Tested. |
| `computeFederalTax`, `computeSelfEmploymentTax`, `payrollTaxesForPerson` (federal.ts) | **Yes for Taxes v1 (federal plus FICA).** Standard deduction, brackets, FICA with the wage base, SE tax with the 92.35% factor and the deductible half. | **Tied out** through Maya under M1 conventions (580 cells, two files). |
| `computeFederalTaxM2` (federal-m2.ts) | Later (Taxes v2). Adds capital gains stacking, taxable Social Security, the senior deduction, NIIT, the child tax credit, the dependent care credit, QBI. | Tied out through Maya's M2 plans (280 and 300 cells); the credits tie to Rosa within $5; the dependent care credit leans on an unverified rule. |
| `computeStateTax` (state.ts) | **Yes.** Brackets from federal AGI with optional add-backs and a local tax line. | Tested; state tables are secondary-sourced. Pennsylvania's add-backs lean on an unverified rule. |

### engine/social-security
| `averageIndexedMonthlyEarnings`, `primaryInsuranceAmount`, `claimingFactor`, `spousalFactor`, `survivorFactor`, `annualBenefit`, `estimateEarningsRecord` | Later for v1 (Life Plan). The arithmetic is standard and parameterized from `data/social-security/`. | Tested; PIA and claiming factors verified against SSA; the survivor schedule is verified from secondary sources and flagged. |

### engine/projection (the year-by-year plan)
| Function | Reusable? | Correct? |
|---|---|---|
| `debtYear`, `nominalRateFor`, `realRate`, `estimatedMinimumPaymentAnnual` (debts.ts) | **Yes, import directly** for the Debt planet's schedule, promo rates, and real-dollar conversion. | Tested; the promo-month blend is tested on a dated case. |
| `blendedRealReturn`, `growBalance` (accounts.ts) | Yes, for growing a balance at a blended real return. | Tested. |
| `toNominal`, `nominalFactor` (display.ts) | Yes: real by default, nominal at display time, which is v1's rule too. | Tested. |
| `incomeForYear`, `spendingForYear`, `periodShare`, `endReached` (income.ts, spending.ts) | Pattern, yes: dated rows that start and end, prorated by month. v1's Life Plan events can reuse the end-rule idea (date, age, retirement, a dependent's age). | Tested. |
| `runTimeline`, `runFor`, `findFiDate`, `project` (timeline.ts, fi.ts) | **Not for v1's first cards.** One 1,600-line function that does everything (waterfall, drawdown, taxes, health care, Social Security, two people). The Simulate leg will want a smaller event timeline built on the same primitives. | Tied out (M1 and M2) for Maya; everything beyond Maya is tested, not tied out. |
| `contributionLimits` (limits.ts) | **Yes** for "remaining room under legal limits" in the Investments planet: 2026 limits by age from the registry. | Verified against IRS notices. |
| `healthcareLine`, `acaPremiumCredit`, `irmaa`, `povertyLine` (healthcare.ts) | Later (Taxes v2, ACA). | Tested; the ACA rule is marked watch (the enhanced subsidies expired). |
| `requiredMinimumDistribution`, `seppPayment`, `drawRoth`, `ruleOf55Applies` (drawdown.ts) | Later. | Tested; rules verified. |

### engine/optimizer, engine/flow, engine/meaning, engine/risk, engine/history, engine/modules
| Area | Reusable? | Correct? |
|---|---|---|
| `optimize`, `strategyToggles`, `stressTest`, `seppCommitment` (optimizer) | Not for v1 (coach-operated one-page plan has no optimizer in scope). | Tested; dominance-checked against Maya's hand plans. |
| `materialityReport`, `nextCard`, `smallWins`, `agedValues` (flow) | The staleness clocks (`datedValues`, `agedValues`) are a good pattern for v1's as-of metadata and the "needs a refresh" state. The rest belongs to the self-serve flow. | Tested. |
| `ratios`, `drafttLens`, `fourPercentLens`, `adviceTranslator` (meaning) | **`drafttLens` is the DRAFTT scorecard** (shares of take-home by Debt, Retirement, Accommodation, Food, Transportation, Taxes, Therapy). Reuse the definition and the category mapping; v1's Sun computes it from published outputs. `ratios` has savings rate, the gap, years of spending saved, runway, debt-to-income, housing share, effective tax rate, real hourly wage. | Tested on Maya; the DRAFTT thresholds are proposed. |
| `ruleOfFive`, `runway`, `staircase`, `mustPays`, `fullMonthlySpending`, `debtPaymentsAnnual`, `firstYearGapAnnual` (levels/resilience.ts) | **Yes, closely.** `ruleOfFive` is age divided by 5 as months of spending, with stability multipliers; `runway` gives months at full spending and at each staircase step (DRAFTT, FAT, couch mode); v1's Safety Net planet publishes exactly these. The "full spending" basis counts the home reserve and leaves out a pausable loan payment (decision A11, a question open with Eli). | Tested; the age divisor and multipliers come from `data/resilience.json` (proposed). Rosa's Rule of 5 ties to Eli's figures. |
| `comparePayoffMethods`, `payoffOrder`, `simulate`, `payoffDebts` (whatifs/payoff.ts) | **Yes, import directly** for the Debt planet: avalanche, snowball, peace-first (by stress rating), months to debt free, interest, stress-months, per-debt payoff month, promo rates honored. The debt-free date and "freed cash flow by month" fall out of `simulate`'s `paidOffMonth`. | Tested; the golden household's dates are hand-checked (`tests/modules/debt-freedom.test.ts`). |
| `backtest`, `sturdyFiYear`, `guardrailsAdjuster` (risk) | Later. | Tested; the return series is verified (Damodaran plus BLS CPI-U). |
| `snapshotFrom`, `addSnapshot`, `trendSentence` (history) | Pattern for v1's session snapshots (one per session, capped). | Tested. |
| `loadModules`, `validateManifest`, `activeModules` (modules/registry.ts) | Pattern for a plugin registry, not needed in v1. | Tested. |
| `lumpSumComparison`, `familyLoans`, `hardSeasonView`, `debtFreedomView` (modules) | `familyLoans` (gift exclusion, below-market flag, flexibility) and `lumpSumComparison` (a lump sum from a loan, taxable, or retirement, side by side) are candidate Debt and Investments outputs later. | Tested; tie to Rosa within $5 on the parts that use verified rules. |

### engine/transfer
| `parseCsv`, `readTemplate`, `exportTemplate` | Pattern for a CSV import of a client's numbers, later. | Tested. |

## 3. UI

Nothing in `ui/` is reused by v1: it is a self-serve app (levels, next card, what-ifs, result screen with an optimizer) and v1 is a coach-operated console. Two things are worth copying as patterns: `ui/tokens.css` (every color, type size, spacing, and radius as a token; the UI rules test fails on any hard-coded color) and `ui/store.ts` (a storage adapter with a schema version, a snapshot before import, and preferences kept apart from the plan). `ui/workers/engine.worker.ts` shows how long work leaves the main thread.

## 4. Data

| File | Reusable? |
|---|---|
| `data/tax/2026.json`, `data/rules-registry.json` | **Yes.** The only sourced rule values in the repo; the Taxes planet reads them through `RuleLedger`. |
| `data/account-presets.json`, `data/spending-categories.json` | Yes: the account vocabulary (tax bucket, liquidity) and the spending buckets, including the FAT and DRAFTT categories. |
| `data/resilience.json` | Yes: the Rule of 5 divisor, stability multipliers, the staircase steps. Proposed values. |
| `data/assumption-sets.json`, `data/life-phases.json` | Yes for the assumptions drawer's three cases. Proposed values. |
| `data/social-security/`, `data/healthcare.json`, `data/life-expectancy-tables.json` | Later. |
| `data/items.json`, `data/small-wins.json`, `data/ratios.json`, `data/materiality.json`, `data/modules/`, `data/feature-register.json`, `data/scenario-blocks.json`, `data/milestones.json` | Self-serve content; `ratios.json` carries the DRAFTT definition worth copying. |

## 5. What looks wrong or unsettled (so v1 does not inherit it unknowingly)

1. **Three registry rules are unverified** (dependent care credit phase-down, below-market loans, Pennsylvania compensation). Every result that uses one is flagged. v1's Taxes v1 (federal plus FICA) does not touch them.
2. **State tax tables are secondary-sourced** (Tax Foundation, `verified: null` on every state). Fine for an estimate; say so on the one-pager.
3. **The timeline meets a small cash shortfall with a penalized pretax draw** before touching the reserve or a pausable payment (decision A18, open question). v1's Simulate leg should decide this explicitly.
4. **The Rule of 5 basis** (home reserve in, pausable loan payment out) is decision A11, open with Eli. v1's Safety Net contract should state its basis.
5. **The next card values a defaulted Level 1 question at the whole FI number** (`engine/flow/items.ts`). Not reused by v1; recorded in `docs/audits/rosa-walkthrough.md`.
6. **Proposed placeholder values** throughout `data/` (assumption bands, resilience multipliers, DRAFTT thresholds, health care costs, unemployment table). Each is marked in its file; none is a sourced rule.

## 6. The short list v1 imports from `engine/`

`dates.ts`, `normalize.ts`, `brackets.ts`, `federal.ts` (M1 federal and FICA), `state.ts`, `debts.ts`, `accounts.ts`, `display.ts`, `limits.ts`, `whatifs/payoff.ts`, `levels/resilience.ts` (Rule of 5, runway, staircase), `tax-tables.ts`, `rules.ts`, and the data files they read. Everything else is pattern or later.
