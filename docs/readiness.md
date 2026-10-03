# Readiness audit

**Status: Proposed, not reviewed by Eli.** Written 2026-10-04 at the end of the overnight build, on branch `readiness`. Grades the app against what a fully ready consumer financial planning and coaching tool needs. Each item is Ready, Partial, or Missing, with the evidence and the work remaining. Legal items are questions, never conclusions.

Grades are one builder's reading of the code and docs on one night. "Ready" means a reviewer could check it and find it so; "Partial" means the mechanics exist and something named is missing; "Missing" means nothing stands in for it yet.

---

## 1. Math

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Independent verification, one household (Maya, M1 conventions) | Ready | `tests/workpapers/` two files, 580 of 580 cells match on every run; FI age 42 on all three strategies; `npm run tie-out:compare` is now a CI gate | Keep it green; it is the only hand tie-out |
| Independent verification, M2 depth | Missing | `docs/audits/m2-self-audit.md` test 1 partial: no hand-computed Gross and Net FI for any household; the M2 engine is checked piece by piece against the IRS worksheets in tests, not end to end by a person | Eli produces a second Maya workpaper at M2 depth (the suggested shape is in the M2 self-audit); then Jordan and Dev |
| Verification across household types | Missing | Only Maya is hand-checked. Jordan and Dev exist as example files without expected values; no couple, no self-employed, no retiree household has a workpaper | Expected values for `tests/households/jordan.json` and `dev.json`; one couple, one self-employed, one 60-year-old |
| Federal tax coverage | Partial | 2026 brackets, standard deduction, capital gains, NIIT, senior deduction, taxable Social Security, RMDs, 72(t), rule of 55, conversions, the ACA credit and IRMAA, all from the verified registry; no itemizing, no credits, no QBI, no AMT | The Taxes, Family, and Self-employed packs |
| State tax coverage | Partial | Tables for every state with single and joint columns; retirement-income exclusions, local taxes, and state credits are not modeled | State retirement-income table (Taxes pack); a yearly roll |
| Filing statuses | Partial | All four statuses run; married filing separately is two returns with the non-earned income on the self's (decision H2) and without the separate-filing quirks | Decide the quirks that matter; verify with a couple's workpaper |
| Self-employment | Partial | Self-employment tax, the half deduction, and the business entity exist; no QBI, no solo 401(k) or SEP room, no S-corp salary split | Self-employed pack |
| Couples | Partial | Built on `household-two`: both incomes, limits, FICA caps, records, owner ages, one or two returns; spousal and survivor rules read an unverified registry entry and are flagged | Verify `ss.spousalAndSurvivor` at ssa.gov; the Partner pack |
| Edge cases | Partial | `tests/edge-cases.test.ts` covers no income, only debt, age 16, age 70, spending above income, 0% promos, all-dontknow imports; age 100 gives an empty timeline rather than a message | Entry-screen validation for the age bounds; more cases as households are added |
| Historical returns (M6) | Partial, unverified data | The backtest mechanics are tested; `data/returns-history.json` was typed from memory and every result carries a flag | Replace the series from Damodaran or Shiller and set its verified date |
| Professional review | Missing | No CPA, EA, or CFP has reviewed the engine spec or a result | A paid review of the M2 engine spec and one workpaper |

## 2. Data

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Entry effort | Partial | Three modes (guided, express, paste), a CSV template with an AI-fill prompt, presets with national placeholders marked roughly, the next card ranks what to answer; not timed with a person (M3 self-audit tests 1 to 4 partial) | Time five people through the first five minutes; fix what they stall on |
| Statement upload | Missing | `docs/statement-upload-spec.md` written; nothing built | Build after the performance budget's lazy-loading rule |
| Account connections | Missing | Parking lot, after M7; would break the no-server promise as designed | A product decision before any work |
| Backup | Partial | Export and import with an undo snapshot; the backup nudge after 30 days (`foundations`) | Test the nudge with people; consider a reminder on the first export too |
| Sync across devices | Missing | Local storage only, by design (Privacy page) | A product decision; the trust page would change |
| Loss scenarios | Partial | A private window is detected and the app says so; a cleared browser loses everything not exported; the nudge is the only guard | A "last exported" line on the entry screen; export on the first complete plan |
| Data dictionary discipline | Ready | Every stored field is in `docs/data-dictionary.md` with kind, store, default; section 9 holds the Proposed additions with their specs | Eli's review of section 9 |

## 3. Trust and legal

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Disclaimer | Ready | The result screen's notice and the About page: "Educational, not individualized financial, tax, or legal advice"; the footer on every screen | Attorney review of the wording |
| Wording that stays educational | Partial | The style guide forbids verdicts; a test scans every M4 sentence for instructing phrases; the plan in words says what the plan does ("Convert about $16,100 a year"), which reads close to an instruction | Extend the scan to the optimizer's plan text and the lessons; decide whether "the plan does X" needs a softer frame |
| Rules sourced and dated | Ready | Every rule the M2 engine reads carries a source, a URL, and a verified date, listed on every result; unverified rules are refused except through the one flagged door | The rules update routine's first run |
| Privacy | Ready | No server, no network request with data, local storage only, export and delete on the Privacy page | Attorney review; a privacy policy in the legal sense if the app is published under a business |
| Coach mode | Missing (by design) | Specified only (`docs/packs/coach.md`, coaching spec 11); off by default; works through files | The attorney questions below, then the audience decision |

**Questions for a securities attorney** (no conclusions drawn here):

1. Where does educational software end and personalized investment advice begin when the software computes a plan from a specific person's numbers and describes what that plan does ("convert about $16,100 a year")? Does describing the plan's own actions, without "you should", stay on the education side?
2. Does the optimizer, which searches account and claiming choices for a stated objective, change the answer to question 1?
3. Does showing a Roth versus traditional comparison, a Social Security claiming-age comparison, or an ACA income target for a specific household count as individualized advice under the Investment Advisers Act or state equivalents, given no securities are named?
4. Does charging for the software, or for coaching alongside it, change its status?
5. Coach mode: if a coach (not a registered adviser) leaves notes on a client's numbers inside the app, what does the coach need (registration, exemption, disclosures), and what does the app need to say or do so it is not the one giving advice?
6. Is the disclaimer wording sufficient and placed where it needs to be (every result, the About page, exports)?
7. Does the tax content (a return computed from the rules) create any obligation under tax-preparer rules, given nothing is filed?
8. What records, if any, should the app or the business keep about what it showed a person, given the app keeps nothing on a server?

## 4. Users

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Onboarding | Partial | Three entry modes, the next card, the template; no first-run script; not tested with a person | Build the two-question opening (feature register rank in the top quartile); test with five people |
| Comprehension | Partial | Every number has a trace drawer; kinds are badged; the style guide is followed; no comprehension test has been run | Five-person test: can they say what the FI date means and what moves it |
| The weekly loop | Missing | `docs/coaching-spec.md` written; nothing built | Build order in the spec's section 15 |
| Retention signals | Missing | No analytics by design; the progress history and (later) the weekly record are the only local signals | Decide what to measure locally and show to the person only |
| Accessibility | Partial | An axe audit on two screens found and fixed contrast issues (`docs/accessibility-audit-2026-10.md`); keyboard reachability for tables and the Sky; no screen-reader walkthrough; the five judgment calls are open; the newer screens (Levels, What-ifs, Meaning, Risk, the trust pages) were audited only by construction | Re-run axe on every route; one screen-reader session; Eli's call on the five items |

## 5. Upkeep

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Rules updates | Partial | The registry with verified dates; `docs/rules-update-routine.md` with the November, January, monthly, and quarterly checks; no owner, no first run | Assign the owner; the first monthly report |
| Support | Missing | No way to report a problem from the app; no FAQ | A "something looks wrong" link that opens a prefilled issue, with no numbers in it |
| Error handling | Partial | The result screen catches engine errors and explains; imports list every problem; storage failures are detected; unverified rules refuse to run | A test that every screen survives a corrupt saved household |
| Performance on phones | Partial, unmeasured | `docs/performance-budget.md` with the targets; bundle 124 KB gzipped (under the 150 KB target); the optimizer and backtests run after paint but on the main thread; no phone measurement | Measure on a mid-range phone; the worker; the CI size check |

## 6. Launch

| Item | Grade | Evidence | Work remaining |
|---|---|---|---|
| Deploy safety | Partial | `deploy.yml` now gates on types, tests, and the tie-out (on `foundations`, for review); main is not protected (the preflight found this); branches cannot be deleted from a session | Protect main (require the Tests check and a pull request); merge `foundations` |
| Monitoring | Missing | No uptime check, no error reporting (by design, no data leaves the browser) | A static uptime check on the Pages URL; a local error log the person can export with a bug report |
| Documentation | Ready | README, the engine spec, the data dictionary, the decisions log, the design system, the style guide, one spec per milestone, self-audits, the session report | Eli's review of everything marked Proposed |
| Versioning | Partial | The export carries a format version and a schema version with migrations | A visible app version on the About page |

---

## The ten items that would move the most from Missing to Ready, in order

1. **A second Maya workpaper at M2 depth, then Jordan and Dev with expected values.** Everything in Level 4 rests on an engine no person has tied out end to end. Only Eli can produce the expected values.
2. **Replace the return series and verify the spousal rule.** Two unverified data items flag every Risk result and every couple's late years. Both need a session that can reach the sources.
3. **Protect main and merge the CI gate.** One setting and one merge turn deploy safety from Partial to Ready.
4. **Five people through the first five minutes, timed.** The M3 self-audit's partial tests, onboarding, and comprehension all wait on this.
5. **The attorney questions.** Eight questions above; the answers decide the plan wording, coach mode, and whether the app can be published under a business.
6. **Extend the instructing-phrase scan to the plan text and the lessons**, and decide the frame for "the plan does X". Cheap, and it is the trust line.
7. **The rules update routine's first run with an owner.** The engine refuses unverified rules; without the routine, every rule ages into a flag by 2028.
8. **Axe on every route and one screen-reader session.** Half the screens were never audited by a tool.
9. **Measure on a phone and move long work to a worker.** The budget exists; the numbers do not.
10. **A "something looks wrong" link and a visible version.** Support and monitoring are Missing, and both are small.
