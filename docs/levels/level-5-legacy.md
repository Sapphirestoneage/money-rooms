# Level 5: Legacy

**Status:** Specified ahead of time. Estate math builds on M2; legacy projects build on M5.
**Owner:** Eli. **Drafted:** 2026-10-02.

---

## 1. The idea

Once you can do anything you want, legacy is the next big thing. FI isn't the finish line; it's the freedom to build something that outlasts you. Level 5 asks two questions: what will your money leave behind, and what do you want to build with your freedom? Then it prices both, in money and in time, so a person can see how much breathing room a legacy needs.

Level 5 comes in two editions, with the bucket list as the bridge between them.

**Unlock:** the legacy view (section 7).

---

## 2. The bridge: the bucket list

Level 3's dreams are the bucket list: things to do while you're here. Some dreams outlast you (a scholarship, a book, a business that keeps going, a family home). Any dream can be tagged **legacy**, which moves it into Level 5's projects (section 4) while keeping its price card.

---

## 3. Legacy: money edition

What your money leaves behind, and how it lands.

**The estate view.** The balance at plan-to age in each band, shown **after heirs' taxes**, because a dollar isn't a dollar to an heir:

| Money type | How it lands for heirs |
|---|---|
| Roth accounts | Tax-free to heirs (inherited Roth rules still apply) |
| Pretax accounts | Taxed at the heir's rate, usually within 10 years (SECURE Act) |
| Taxable accounts | Basis steps up at death, so built-up gains aren't taxed |
| Cash | As is |

The heir tax rate defaults to 22% and is editable. This is why the M2 optimizer's "biggest estate" objective often favors Roth conversions.

**The basics checklist** (a side quest, played like Small wins): beneficiaries named on every account, a will, a healthcare proxy, a power of attorney. Each item is yes, no, or unsure, with a plain explanation of what happens without it. No legal advice, and a note to see a professional for anything beyond the basics.

**Giving.**
- **Annual giving:** an amount per year, flowing through the spending category for giving.
- **Giving forever:** to give a set amount every year indefinitely, the engine shows the endowment it takes, using the plan's sustainable withdrawal rate. ("$5,000 a year, forever, takes about $125,000.")
- **Tax-smart giving** (from M2): bunching with a donor-advised fund, and qualified charitable distributions from IRAs from 70½.

---

## 4. Legacy: Hamiltonian edition

What you want to build with your freedom. The theme is planting seeds: working on things whose payoff you may never see.

**Legacy projects.** Each project is a row:

| Field | Example |
|---|---|
| Name | "Write a book" |
| What it is | Book, mentoring, scholarship, community project, family support, a business that outlives you, creative work, other |
| Money | One-off and annual cost, in today's dollars |
| Time | Hours per week |
| Start age | 40 |
| Horizon | A number of years, or forever |

**Theming rule.** Any Hamilton references use only Alexander Hamilton's own historical writings, which are in the public domain, never the musical's lyrics. Theming stays optional and can be turned off (the Hamilton theme was parked for the main app in September 2026; this edition is where it lives if turned on).

---

## 5. Breathing room: Legacy FI

Freedom to build a legacy needs room in two currencies.

**Money: Legacy FI.** A new milestone on the Level 3 spectrum: the earliest date your plan stays funded through plan-to age **and** pays for every legacy project's money.

> **Legacy FI at 46.** Your plan funds the scholarship ($5,000 a year, forever) and the book ($8,000 to publish), and stays funded through 95.

**The breathing-room slider.** How much margin above the FI number to set aside for legacy, as a share (default 10%) or a dollar amount. Each step shows how it moves Legacy FI.

**Time: the freedom budget.** After FI, the hours a job used to take become free. The app shows the weekly time budget with legacy projects placed in it:

> After FI you'd have about 45 free hours a week. Your legacy projects use 15. That leaves 30 for everything else.

If projects ask for more hours than the person has (for example, during Barista FI), the app says so plainly.

---

## 6. Where Legacy sits

Legacy FI joins the milestone line, usually last:

> Coast FI 36. FI 42. Fat FI 49. **Legacy FI 46.**

(It can come before Fat FI if legacy projects cost less than the Fat FI lifestyle.)

---

## 7. The unlock: the legacy view

Three parts on one screen:
1. **Money edition:** the estate after heirs' taxes, in each band, plus giving.
2. **Hamiltonian edition:** legacy projects on a timeline, each with its money and time.
3. **Legacy FI:** the date, the breathing room, and the freedom budget.

---

## 8. Items in this level

| Tier | Items |
|---|---|
| Easy wins | Name beneficiaries; tag one dream as legacy |
| Intermediate | Add a legacy project with money and time; set annual giving |
| Advanced | Breathing-room slider; heir tax rate; giving forever |
| Expert | Donor-advised fund bunching; qualified charitable distributions; estate-maximizing strategy (M2 optimizer) |

---

## 9. New fields for the data dictionary

| Field | Kind | Default |
|---|---|---|
| Legacy tag on a dream | Goal | Off |
| Legacy projects (list: name, type, money, hours per week, start age, horizon) | Goal | None |
| Breathing room | Goal | 10% of the FI number |
| Heir tax rate | Assumption | 22% |
| Annual giving | Goal | From the giving spending category |
| Basics checklist (beneficiaries, will, healthcare proxy, power of attorney) | Fact | Unsure |
| Hamilton theming | Preference | Off |

---

## 10. Acceptance tests

1. The estate view applies Roth, pretax (heir rate), taxable (step-up), and cash treatment correctly for a hand-checked household.
2. "Giving forever" equals the annual amount divided by the plan's sustainable withdrawal rate.
3. Legacy FI is the earliest year the plan stays funded and every legacy project's money is covered.
4. The freedom budget flags when legacy hours exceed available hours.
5. Tagging a dream as legacy moves it to Level 5 without losing its price card.
6. With Hamilton theming on, every quote is from Hamilton's public-domain writings and carries its source.
