# Rules registry verification, October 2026

**Status: Proposed, not reviewed by Eli.** Done 2026-10-03 during the overnight build (Phase 0a). Every entry in `data/rules-registry.json` was opened at its official source, confirmed or corrected, given the official URL, and dated. This log records each change: old value, new value, source.

## What could and could not be reached

| Source | Reachable from the build session | Used for |
|---|---|---|
| irs.gov (revenue procedures, notices, publications, topic pages) | Yes | Brackets, deductions, capital gains, limits, phase-outs, 72(t), rule of 55, Roth ordering, NIIT, Social Security taxation, senior deduction, RMD age 73, ACA table |
| cms.gov | Yes | Medicare Part B premium and the full IRMAA tables |
| healthcare.gov | Yes | 2026 poverty guidelines (48 states and DC) |
| ssa.gov | No (blocks automated requests) | Wage base, POMS IRMAA page: kept, marked unverified |
| hhs.gov, aspe.hhs.gov | No | Poverty guidelines for Alaska and Hawaii: not entered |
| congress.gov, govinfo.gov, uscode.house.gov, law.cornell.edu | No (network policy) | Statute text for the senior deduction rate and the SECURE 2.0 RMD ages: kept, marked for Eli |

## Corrections and additions, entry by entry

| Rule | Was | Now | Source (official) |
|---|---|---|---|
| `fed.standardDeduction.2026` | Values unverified, no URL | Same values confirmed: $16,100 single and separate, $32,200 joint, $24,150 head of household. Added the extra deduction for aged or blind: $1,650, or $2,050 if unmarried | Rev. Proc. 2025-32, section 4.14 |
| `fed.brackets.2026` | Placeholder text "Full tables to be entered" | Full seven-bracket tables for all four filing statuses. They match `data/tax/2026.json` exactly | Rev. Proc. 2025-32, section 4.01, Tables 1 to 4 |
| `fed.ltcgZeroTop.2026` | Single $49,450 and joint $98,900 only | Confirmed, and added head of household $66,200 and married separate $49,450 | Rev. Proc. 2025-32, section 4.03 |
| `fed.ltcgBrackets.2026` (new) | Not in the registry | 0%, 15%, 20% brackets for all four statuses. 15% tops: $545,500 single, $613,700 joint, $306,850 separate, $579,600 head of household | Rev. Proc. 2025-32, section 4.03 |
| `limits.2026` | Values unverified | All confirmed: $24,500 elective, $8,000 catch-up at 50, $11,250 at 60 to 63, $7,500 IRA, $1,100 IRA catch-up, HSA $4,400 self and $8,750 family, $1,000 HSA catch-up. Added the $150,000 Roth catch-up wage threshold | Notice 2025-67; Rev. Proc. 2025-19 section 2.01; IRC 223(b)(3) |
| `limits.totalAdditions.2026` | null | $72,000 (415(c)); catch-ups sit on top | Notice 2025-67; IRS COLA table |
| `limits.iraDeductionPhaseout.2026` | null | Covered by a plan: $81,000 to $91,000 single and head of household; $129,000 to $149,000 joint; $0 to $10,000 separate. Not covered but spouse is: $242,000 to $252,000 | Notice 2025-67 |
| `limits.rothIraIncome.2026` | null | $153,000 to $168,000 single and head of household; $242,000 to $252,000 joint; $0 to $10,000 separate | Notice 2025-67 |
| `limits.457b.2026` | null | $24,500, with the same catch-ups, separate from the 401(k)/403(b) limit (the two statutory limits are adjusted and listed separately) | Notice 2025-67; IRS COLA table |
| `access.sepp72t` | Unverified | Confirmed: three methods, rate up to the greater of 5% or 120% of the federal mid-term rate, longer of 5 years or to 59 and a half, retroactive penalty on modification, one-time switch to the RMD method | Notice 2022-6, sections 3.01 and 3.02 |
| `access.ruleOf55` | Unverified | Confirmed: 55 (50 for public safety), qualified plans only, not IRAs | IRS exceptions to the 10% additional tax (table) |
| `access.457bNoPenalty` (new) | Not in the registry | Governmental 457(b) distributions are not subject to the 10% additional tax except rolled-in amounts | IRS exceptions table; IRC 72(t)(9) |
| `access.rothOrdering` | Unverified | Confirmed: contributions, then conversions first-in first-out (taxable part first), then earnings; five-year clock per conversion; qualified distributions after five years and 59 and a half | Publication 590-B (2025) |
| `health.fpl.2026` (new) | Not in the registry | $15,960 for one, plus $5,680 per extra person, through $55,720 for eight (48 states and DC). Alaska and Hawaii not entered | HHS guidelines as shown on HealthCare.gov |
| `health.acaPtc.2026` | Table "to be entered" | Full applicable percentage table: 2.10% under 133% of poverty, 3.14% to 4.19% (133 to 150), 4.19% to 6.60% (150 to 200), 6.60% to 8.44% (200 to 250), 8.44% to 9.96% (250 to 300), 9.96% flat (300 to 400). Nothing above 400%: the cliff is back. Required contribution percentage 9.96% | Rev. Proc. 2025-25, section 3 |
| `health.irmaa.2026` | First tier and standard premium only | Full six-tier Part B and Part D tables for single and joint, plus the three married-separate tiers; Part B deductible $283; Part A deductible $1,736. Standard premium $202.90 confirmed | CMS fact sheet, 2026 Medicare Parts A and B Premiums and Deductibles (2025-11-14) |
| `ss.taxationThresholds` | Unverified | Confirmed $25,000 and $34,000 (single, head of household), $32,000 and $44,000 (joint), $0 for married separate living together, 50% and 85% inclusion | IRS FAQ Social Security Income; Publication 915 |
| `fed.seniorDeduction` | Unverified | $6,000 per person, phase-out above $75,000 single and $150,000 joint, 2025 through 2028, on top of the standard deduction: confirmed. The 6% phase-out rate is from the statute and is not restated on the IRS page: **Eli to confirm** | IRS OBBBA deductions page |
| `rmd.startAge` | Unverified | Age 73 and the April 1 first deadline confirmed. The 72 (born through 1950) and 75 (born 1960 or later) rules are from SECURE 2.0 section 107, not restated on the IRS page: **Eli to confirm** | IRS RMD topic page |
| `fed.niit` | Unverified | Confirmed 3.8% above $200,000 single and head of household, $250,000 joint; added $125,000 married separate | IRS Tax Topic 559 |
| `ss.wageBase.2026` (new) | Only in `data/tax/2026.json` | $184,500 carried over, **unverified** (ssa.gov blocked). URL: https://www.ssa.gov/cola/factsheets/2026.html | SSA 2026 COLA fact sheet |
| `ss.trustFund.2026` | Verified 2026-10-02 | Unchanged | 2026 Trustees Report |

## Change to the M1 tax file

`data/tax/2026.json`: the married-filing-separately Roth IRA phase-out was null. It is now $0 to $10,000 (Notice 2025-67). The retirement limits source now points at the notice itself. All federal brackets and the standard deduction in that file were re-checked against Rev. Proc. 2025-32 and match.

## For Eli to check (could not be reached from here)

1. https://www.ssa.gov/cola/factsheets/2026.html: wage base $184,500.
2. https://aspe.hhs.gov/topical-subjects/poverty-economic-mobility/poverty-guidelines: the 2026 guidelines, including Alaska and Hawaii, and which year's guidelines the 2026 premium credit uses.
3. The senior deduction phase-out rate (6% of MAGI over the threshold), Pub. L. 119-21 section 70103.
4. SECURE 2.0 section 107: RMD age 75 for people born in 1960 or later.
5. https://secure.ssa.gov/poms.nsf/lnx/0601101020: the SSA POMS IRMAA page, as a second source for the CMS table.

## Rules not yet in the registry that M2 will need

- Medicaid expansion states (for the 138% lower bound). Source: Medicaid.gov or KFF; not entered.
- State treatment of retirement income and Social Security (strategy B10). Not entered.
- The federal mid-term rate for 72(t) (changes monthly). The engine will take it as an input with a default.

## Added 2026-10-04 (answers batch, Part 3: Rosa)

| Rule | Status | What was confirmed |
|---|---|---|
| `fed.childTaxCredit.2026` | Verified at irs.gov | $2,200 per child under 17, $1,700 refundable, full credit to $200,000 ($400,000 joint). The $50 per $1,000 phase-out rate is from IRC 24(b)(2), not on the page. |
| `fed.qbiDeduction.2026` | Verified at irs.gov | 20% of QBI net of the deductible half of SE tax, limited to 20% of taxable income less net capital gain. Thresholds not modeled. |
| `fed.giftExclusion.2026` | Verified at irs.gov | $19,000 per donee in 2026. |
| `fed.dependentCareCredit.2026` | Unverified, flagged | Only the under-13 rule is on the IRS page. The 50% maximum, the phase-down to 35% above $15,000 and to 20% above $75,000, the $3,000 and $6,000 caps, and the $7,500 FSA cap are from the 2025 amendment and the 2026 Form 2441 instructions; confirm there. |
| `fed.belowMarketLoans` | Unverified, flagged | The statute host is blocked from the build session. $10,000 and $100,000 from IRC 7872 as known. Informational only. |
| `state.PA.compensation` | Unverified, flagged | pa.gov is blocked from the build session. 3.07% matches the Tax Foundation table; the 401(k) treatment, no half-SE deduction, and the 1% local default are from the PA PIT Guide as known. |

Rosa's figures tie to Eli's sheet within $5 on every line that uses a verified rule; the two lines that use the unverified dependent care credit (the $1,050 credit; the $450 and $90 it loses in the liquidation comparison) tie to his figures where he used the same 35% rate.
