# Rosa: the messy-financials walkthrough

**Status: Proposed, not reviewed by Eli.** Run 2026-10-04 (answers batch, Part 3, branch `messy-oct4`) on the built site at 360px with Rosa (`tests/households/rosa.json`, fictional and anonymized) loaded and the beta switch on: entry, the result screen, What's next, Levels (Level 2), the Debt freedom room, What-ifs (payoff methods and the lump-sum card), Meaning, Privacy, then hard season on and the safety features. axe: 0 violations on every screen. Her hand-checked numbers are in `tests/rosa.test.ts`.

The question asked was: where does the app give Rosa a misleading or unkind result? Each finding says whether it was fixed in this batch or recorded for Eli.

## Fixed in this batch

1. **The engine raided the 401(k) to cover a $2,054 gap.** With the brokerage absent, the year's shortfall was met by a $2,741 pretax draw with the 10% penalty, because the $12,000 of cash sits inside the protected reserve. With the brokerage present it sells $2,054 of brokerage instead. Not changed in the engine (decision A18, a question for Eli); made visible: the Levels card and hard season now say the year runs short and that the loan payment comes first.
2. **"Save $1,757 a month" to a person whose year runs $2,054 short.** The Rule of 5 card asked for a saving rate the plan cannot produce. Now a flag under it says the year runs about $2,054 short before any saving, so the target waits, and that stability comes first on What's next, starting with the loan payment that can flex.
3. **"$4,242 a month (debt payments included)"** on the Rule of 5 card while the flexible loan payment is left out (decision A11). The copy now says "payments that cannot pause included".
4. **"sideGig income is marked roughly."** The next card and the Refresh card used the raw income type id when a stream has no name. They now use the plain name ("Side gig income").
5. **"Your home (410,000) is not counted"** without a dollar sign. Fixed.
6. **"$-980 a year is left to save"** on the Meaning screen. The engine's ratio formatter put the sign after the dollar sign; now "-$980". The sentence itself still reads as if a negative amount were "left to save"; see recorded item 3.
7. **"Job loss would leave 0.0 months of runway"** in the hard-season suggestion. Now "no runway at all".
8. **The hard-season switch did nothing on the screens already open** (the first walkthrough pass). The card reloads the page after the switch so every screen reads the setting.

## Recorded for Eli (not changed)

1. **The HSA question is "worth $665,928 (about 142 months)".** The next card values every unanswered Level 1 question at the whole FI number (`engine/flow/items.ts`, "a required level-one answer is worth the whole FI number"). HSA eligibility has a default and is not required; showing it as worth her entire FI number is misleading. Proposed: value a defaulted question at the sensitivity of its default, not the FI number.
2. **Term life "$739,000 to $1.2M" counts the $230,000 family loan as a debt that would pass to others.** A 0% loan from her parents with forgiveness possible is not a debt her child would be left with in the usual sense. Proposed: leave a family loan marked forgiveness-possible out of the term life range, or say it is included.
3. **The gap ratio's sentence** ("After spending and debt payments, -$980 a year is left to save") and **"Your net worth covers -2.2 years of spending"** read as arithmetic, not as a person's situation. Proposed sentences for a negative value: "After spending and debt payments the year runs $980 short" and "Debts exceed assets by about $X; years of spending saved starts once that turns."
4. **The three payoff orders are identical for one debt.** The Debt freedom room and the What-ifs payoff card show three rows that say the same thing (November 2045, $0 of interest, 1,150 stress-months) and "the price of peace: $0". Proposed: with one debt, one line and no comparison.
5. **"Savings rate 6%. That is most of your pay is spoken for."** The sentence template drops a word. Content fix in `data/ratios.json`.
6. **The as-is plan pays the 10% penalty for ten years** ("About $9,700 a year of withdrawals pays the 10% additional tax", ages 55 to 64) because the headline plan uses the conventional order with no strategies. That is what "as you're set up today" means, and the True FI reveal exists to show the better plan; for Rosa the reveal is locked behind five drawdown questions, so the penalty is the only plan she sees. Proposed: a one-line note under the headline when the as-is plan pays penalties for more than a year, naming the True FI reveal.
7. **The lump-sum card says the family loan's FI age is 56, the 401(k)'s 58, the brokerage's 57.** True as modeled (the loan is already in her plan), but a reader could take 56 as "the loan is best". The card's note says each FI age is the plan with that source used and the others untouched; a sentence that the loan's stress rating (5 of 5) is the price not shown in the FI age would be kinder.
8. **Shock tests say "your runway falls 1 months short"** (grammar) and the unemployment line still carries the placeholder note that the state table is unverified. Both pre-existing.
9. **Zombie readiness "5 months. At full spending you'd last 2"** sits above everything on Level 2 for a person in a hard season. With hard season on, the Levels screen still leads with it. Proposed: in a hard season, the Level 2 card leads with the runway stack and the staircase (the stability items), not the readiness headline.

## What Rosa sees that is right

- Her FI date (age 56, likely 2044, a range of 2040 to 2052) with the home named as left out and its reserve counted.
- Every flag she should see: the home, the dependent care credit's unverified phase-down, Pennsylvania's unverified rule, the engine-added Roth IRA.
- The dated changes on the timeline: childcare ends in 2029, the child tax credit in 2033, head of household in 2035.
- The lump-sum card: the 401(k) nets $56,376 of $85,000, the brokerage $29,634 of $30,000, $28,990 lost in all; the loan's gift exclusion ($19,000 from each parent) and the below-market note, with "it is the lender's tax, not yours".
- Hard season suggested from the loan's stress rating and the shocks, never switched on; when on, the first item is reducing the loan payment, the second is the size of the gap, and no item is a spending cut.
- The safety features: tab title "Notes" with a plain icon, the quick-exit button, the passcode curtain with the honest line that it is a curtain, not encryption.
