# M2 tie-out conventions

Adds to `tests/tie-out-conventions.md`, replacing items where they conflict. The M2 workpapers (`tests/workpapers/maya-m2-planA.csv`, `maya-m2-planB.csv`) are built on these. Settings that apply only to this tie-out are imposed in `tests/tie-out/maya-m2-tie-out.ts` through the test-only `m2TieOut` setting and are never used by the app. Written 2026-10-04 from Eli's batch instructions.

1. Savings strategy: Max tax savings now. Working years identical to the M1 tie-out.
2. State tax: flat 5%. Working years on wages minus pretax contributions; retired years on federal AGI (ordinary income + gains + taxable Social Security).
3. Federal tax in retirement: ordinary brackets after the $16,100 standard deduction; long-term gains 0% up to $49,450 of taxable income, 15% above.
4. Taxable account: basis tracked from contributions (opening basis $0); sales realize gain at the average-cost ratio; no dividend tax while working; no gain harvesting.
5. Roth IRA: contribution basis tracked; conversions tracked by year. Order inside the Roth: contributions (free), conversions oldest first (free after 5 tax years; earlier = 10% penalty under 60, no tax), then earnings (ordinary tax + 10% under 60; free from 60 once the 5-year rule is met).
6. Traditional 401(k) before 60: ordinary tax + 10% penalty. No 72(t), no rule of 55.
7. Health care before 65 when retired: benchmark $7,200 minus the ACA credit. Poverty line $15,650 held constant. 2026 applicable percentages: 100-133% 2.10%; 133-150% 3.14 to 4.19%; 150-200% 4.19 to 6.60%; 200-250% 6.60 to 8.44%; 250-300% 8.44 to 9.96%; 300-400% 9.96%; outside 100-400% no credit. No Medicaid or Essential Plan modeling. From 65: $3,600 flat. ACA MAGI = AGI + nontaxable Social Security.
8. Social Security: $20,000 from 67; taxable portion by provisional income, single thresholds $25,000 and $34,000.
9. Required distributions from 75 by the Uniform Lifetime Table; surplus to taxable.
10. Cash reserve: 6 months of (spending + the M1 health care placeholder: $7,200 before 65, $3,600 after).
11. Taxes, penalties, and premiums paid from withdrawals, solved until settled.
12. Plan A: cash above reserve, taxable, traditional 401(k), Roth (contributions, conversions, earnings), reserve. No conversions.
13. Plan B: cash above reserve, taxable, Roth contributions, conversions (seasoned, then unseasoned), traditional 401(k), Roth earnings, reserve. Each retired year before 60, convert up to MAGI of $31,300 (200% of the poverty line) after counting other income, capped at the 401(k) balance. Conversions mid-year.
14. Everything else follows tests/tie-out-conventions.md.

## Notes on how the engine applies these

- **Items 1, 14.** The tie-out runs the engine under `conventions: "m2"` with the same flat-5% state table, the same January 2026 plan date, and the same Social Security override as the M1 tie-out. Working years match the M1 run to the dollar because the M2 waterfall's extra steps (deductible IRA, 457(b), mega backdoor) do not apply, and the tie-out setting keeps the Roth IRA step (item 1) where the app's M2 engine would use the deductible IRA at Maya's income.
- **Item 3.** The 2026 brackets, the $16,100 standard deduction, and the $49,450 top of the 0% gains bracket come from `data/rules-registry.json` (`fed.brackets.2026`, `fed.standardDeduction.2026`, `fed.ltcgZeroTop.2026`), unchanged.
- **Item 5.** The engine's Roth ordering (`drawRoth`) and its penalty-free age of 59 and a half (penalized at 59, free at 60 in whole years) match the item. The five-year earnings clock starts at the first Roth year, which the engine sets five years before the plan date for an account with no history; Maya's Roth IRA opens in 2026, so the clock is met by 2031 either way.
- **Item 7.** The `m2TieOut` setting replaces the app's health care line: before 65 it is the stated benchmark less the credit from `acaPremiumCredit` on the year's MAGI (poverty line from `health.fpl.2026`, $15,650; applicable percentages from `health.acaPtc.2026`), with no out-of-pocket line and no Medicaid branch; from 65 it is the flat amount. The app's line adds out-of-pocket costs and prices Medicare with IRMAA (open item O3).
- **Item 8.** The override benefit flows through the M2 federal return, so the taxable portion follows the provisional-income thresholds (`ss.taxationThresholds`), and MAGI for the credit adds back the untaxed part.
- **Item 10.** The reserve under the setting counts the placeholder, not the computed line. It is not binding for Maya (her cash never exceeds six months).
- **Item 11.** Under the setting the premium is recomputed on the year's MAGI inside the settle loop, so premium, taxes, and withdrawals converge together. The app's M2 engine prices the year's premium on the prior year's MAGI (advance credit) and does not settle it within the year; see the reconciliation log for the product question this raises.
- **Item 12.** Plan A is the engine's default policy (`defaultPolicy()`): the conventional order, no conversions.
- **Item 13.** Plan B is a policy with `conversionTarget: "fillToAcaTarget"`, `acaTarget: 200`, and the new withdrawal order `rothLayersFirst` (cash, taxable, Roth contributions and conversions, pretax, Roth earnings). The MAGI budget $31,300 is 200% of the poverty line from the registry. The engine converts whenever the budget has room, which after 60 never happens for Maya because her pretax draws already exceed it, and never after 65 because the ACA budget stops; so "before 60" holds without a separate rule. Conversions move mid-year (half a year's growth on the moved amount), as all flows do.
