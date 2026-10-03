# Tie-out conventions

How the hand-calculated workpaper and the engine agree on method, so a mismatch means a real difference and not a convention gap. The Maya tie-out (tests/workpapers/) passed under these on 2026-10-03.

Settings that apply only to the tie-out are imposed in `tests/tie-out/maya-tie-out.ts` and are never used by the app.

1. Today's dollars, likely band, one row per year. Tax brackets and limits are held constant in today's dollars.
2. Mid-year timing: a year's growth = starting balance x rate, plus that year's net flows x half the rate.
3. Age in a year = year minus birth year. Penalty-free retirement withdrawals start at age 60 (approximates 59 and a half).
4. For the tie-out, Social Security is a fixed $20,000 a year from 67 (today's dollars) and is not taxed, via the optional socialSecurityOverride field.
5. M1 taxes: federal brackets and standard deduction, FICA on wages, state as a flat effective rate on wages minus pretax contributions (NY = 5% placeholder), and the 10% early withdrawal penalty. No capital gains tax in M1.
6. Savings waterfall per docs/engine-spec.md section 4, with the strategy chosen per household. Pretax tax savings are looped until settled, with an exact final step. HSA and traditional IRA steps don't apply to Maya (not HSA-eligible; IRA income limits not yet verified).
7. Withdrawal order when short: cash above a 6-month reserve, taxable, pretax (grossed up for tax and penalty), Roth, then the reserve.
8. Fixed-rate debt payments are nominal, so they shrink each year in today's dollars. Real loan rate = (1 + nominal) / (1 + inflation) - 1.
9. Pretax withdrawals are grossed up until the after-tax amount covers the need, finishing with one exact step.
10. Retirement spending = housing + food + transportation + discretionary x life-phase multiplier (100% to 74, 85% from 75, 70% from 85) + healthcare placeholder ($7,200 a year before 65, $3,600 from 65).
11. Placeholder values must match the data files exactly before comparing.
12. Roth 401(k) contributions go to their own account at the Roth 401(k) preset's fee. When drawing from Roth money, the Roth 401(k) is drawn before the Roth IRA (higher fee first).
13. M1 limitation (flagged): Roth withdrawals are treated as tax- and penalty-free at any age. In reality only contributions are; earnings withdrawn before 59 and a half are taxed and penalized. M2 applies the ordering rules using contribution basis. Until then, early-retirement results that lean on Roth money are optimistic, and the result screen says so when a plan draws Roth money before 59 and a half.

## Notes on how the engine applies these

These do not change any item above. They record where a convention lives in the code, so the wording and the engine can be checked against each other.

- **Item 1.** The workpaper's first row is the full year 2026. The tie-out sets the plan date to January 2026 so the engine has no stub period. The app itself starts in the current month (decision E8).
- **Item 4.** `socialSecurityOverride` is a test-only setting on the timeline (`testSettings.socialSecurityOverride`), not a field of the stored household. The app always computes the benefit.
- **Item 5.** The flat 5% for New York is a substitute tax table passed in by the tie-out, with no state standard deduction. It also applies to pretax withdrawals in retirement, which is how the workpaper's Tax401k column is built. The app uses each state's brackets and standard deduction (decision E9).
- **Item 10.** The healthcare placeholder is the test-only setting `testSettings.retirementHealthcare`. The app has no sourced healthcare line yet (open question O3).
