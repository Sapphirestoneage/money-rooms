# Design system

The design system is the data dictionary for how Money Rooms looks. Every color, size, and component is defined once. Screens assemble components; they never invent styles.

The tokens live in [`ui/tokens.css`](../ui/tokens.css). This document explains how to use them.

---

## 1. Principles

1. **Calm, not alarming.** The brand is Stress Less About Money. A person's own numbers are never shown in red, and nothing on screen is a verdict. Results describe what the numbers say.
2. **Honest about certainty.** Every number shows what kind it is: known, look it up, roughly, computed, or not for me. A rough number never looks as solid as a known one.
3. **Numbers are the hero.** Big, clear, tabular figures. Labels are quiet. Decoration is rare.
4. **Every number is tappable.** If it's on screen, it can show where it came from.
5. **Consistent by construction.** If two things mean the same, they look the same, because they're the same component.

---

## 2. Color

| Token | Use |
|---|---|
| `--color-paper` | Page background |
| `--color-surface` | Cards and fields |
| `--color-ink` | Primary text |
| `--color-ink-muted` | Labels and secondary text |
| `--color-rule` | Borders and dividers |
| `--color-brand-*` | Brand accents, charts, primary buttons (900 darkest, 100 lightest) |
| `--color-attention` | "Needs a look": rough numbers, stale numbers, gentle flags (as a border or fill) |
| `--color-attention-ink` | Attention used as text, or as a pill behind light text. Darker than `--color-attention` in light so it meets 4.5:1 |
| `--color-computed-text` | The text on a Computed pill: ink on the light pill, ink on the dark pill (the pill itself changes) |
| `--color-band-best / likely / worst` | The three projection bands |

**Rules**

- Red is not in the palette. Shortfalls and flags use attention (ochre) with clear words.
- Color never carries meaning alone. Every colored state also has a label or icon.
- Text meets WCAG AA contrast (4.5:1 for body text) in both light and dark themes. The dark theme overrides `--color-brand-700`, `--color-brand-500`, and every kind color so pills and quiet buttons keep that ratio on dark surfaces (audited with axe on 2026-10-04, see `docs/accessibility-audit-2026-10.md`).

---

## 3. Type

One family, Archivo, loaded from Google Fonts with a system fallback.

| Token | Use |
|---|---|
| `--text-hero` | The headline number (the FI date) |
| `--text-xl` | Screen titles |
| `--text-lg` | Section titles, key figures |
| `--text-md` | Body text and field values |
| `--text-sm` | Labels, helper text |
| `--text-xs` | Metadata (as-of dates, sources) |

**Rules**

- All numbers use tabular figures (`font-variant-numeric: tabular-nums`) so columns line up.
- Sentence case everywhere. No all-caps labels.
- Body line length under 75 characters.

---

## 4. Spacing and layout

- A 4px grid: `--space-1` (4px) through `--space-8` (64px). No other spacing values.
- Content column: `--content-width` (720px). Data-heavy screens may use `--wide-width`.
- Mobile first. Every screen works at 360px wide.
- Respect safe areas on phones (`env(safe-area-inset-*)`).

---

## 5. Components

Every screen is built from these. New components get added here before they're built.

### Field row
The basic unit of entry. One label, one value, one kind badge.

```
Take-home pay                         $4,120 / month   [Roughly]
```

- Label on the left, value on the right, kind badge after the value.
- Tapping the row edits it. Tapping the badge explains the kind.
- Every field has an "I don't have this" option where the dictionary allows it.

### Kind badge
Small pill showing the number's kind.

| Kind | Label | Color token |
|---|---|---|
| known | Known | `--color-known` |
| lookUp | Look it up | `--color-lookup` |
| roughly | Roughly | `--color-roughly` |
| computed | Computed | `--color-computed` |
| notForMe | Not for me | `--color-notforme` |

**Every displayed number carries its kind.** Entered values show an editable badge. Results show a Computed badge, including the headline age and its range. Chart values carry their kind as a tooltip and in the chart's caption. A rough number is also written with "about" (style guide section 3).

**Tapping a badge opens the drawer** with the kind's explanation. Where the kind can be changed (an entered value), the drawer offers the choices: Known, Roughly, Look it up. Browser alert boxes are never used.

The badge's pill is small, but its tap target is at least 44px.

### Preset picker
A list of account or category types with plain names and a one-line description. Picking one fills its fields.

### Money input
Accepts "4120", "4,120", "$4,120", or "4.1k". Has a cadence selector beside it (per hour, paycheck, month, year). Shows the normalized annual amount underneath in muted text.

- The amount shows with commas once the field is left, and plain while typing.
- Changing the cadence on a number the person just typed reinterprets it ("6,000" then "per month" means 6,000 a month). Changing it on a number that was already stored converts what is shown and leaves the stored amount alone.
- The chosen cadence is remembered while the screen is open.

### Entry forms
Rules every entry screen follows, so entering numbers never fights the person.

- **Nothing jumps.** When the form refreshes itself (a row is added, a kind changes), the page stays where it was, the cursor stays in the same field, and open sections stay open.
- **Even rows.** Every input and picker is the same height (44px). In two-column layouts, fields in a row line up at the top, and labels are short enough to stay on one line.
- **New rows get the cursor.** Adding an income or an account puts the cursor in its first field.
- **Plain pickers for dates.** Month and year are two pickers, not the browser's own month control, which some browsers lack.
- **Places by name.** States are listed by name, in alphabetical order.
- **Number fields ignore the scroll wheel**, so scrolling the page never changes a value.
- **Saved as you go.** Every change is saved the moment it is made and is there on the next visit, along with the cadence chosen for each amount. If the browser cannot save, a gentle flag says so at the top of the screen.

### Headline result
The FI date in hero type, with the best and worst range beneath it in a single line:

```
Age 41
Likely in 2042. Could be as soon as 2039 or as late as 2047.
```

### Trace drawer
Opens from any computed number. Lists the inputs that produced it, ranked by how much each one moves it, each linking to its field.

### Band chart
Balance over time with three lines (best, likely, worst) using the band tokens. Labeled directly on the lines, no legend box. The chart is drawn at the width it is shown, so labels stay at least 11px on a 360px screen.

### Gentle flag
For proof-of-cash mismatches, stale numbers, payments that don't cover interest, and estimates standing in for a required number (a debt's payment before the person enters it). Attention color, one plain sentence, one action.

### Confirm panel
Shown inline, where the person tapped, before anything replaces or removes their data (loading an example, undoing an import). One plain sentence saying what will happen, then two buttons: the action in its own words ("Replace my numbers") and a way out ("Keep what I have"). Browser confirm boxes are never used.

### Drop zone
A dashed box for bringing a file into the app. It says what to drop, and holds a "Choose a file" button for people who can't or don't drag, so keyboard and touch use need nothing extra. While a file is dragged over it, the border and background change and the change is not color alone (the border turns solid). It takes one file at a time. A bad file gets a gentle flag naming the file and the problem. The app works out what the file is from what is inside it (a filled template, or a full Money Rooms export), so either kind can be dropped on either zone, or anywhere on the "Your numbers" screen, and the right card scrolls into view. The browser never leaves the app to open a dropped file.

### Paste box
Under the template drop zone, a text box for pasting a filled template straight from a chat, with one button ("Preview what I pasted"). It leads to the same preview as a dropped file. Code-block marks around the pasted text are ignored.

### Import preview
Shown under the drop zone after a template is read and before anything changes. It names the file, says plainly that nothing has changed yet, then lists: how many things each section holds, the rows that need a look (each with its row number, its name, and a plain reason; a row that could not be read is not imported, and a row that was imported but looks wrong, like a 0% rate with no end, says so), and the rows marked as not known ("to look up later"). It ends with one sentence saying what Apply does and two buttons: "Apply" and a way out ("Keep what I have"). Focus moves to Apply when the preview appears. Lists are plain text, not color alone.

### Entry screen spacing
Tight inside a section, clear space between sections. Rows are at least 44px tall (`--tap-target`) with a divider between them and no other gap. Sections sit 24px apart (`--section-gap`). Both values are tokens in `ui/tokens.css`. No screen file sets a spacing value of its own.

### Collapsible section
The entry screen's five sections (About you, Income, Spending, Accounts, Debts) each have a header that opens and closes them. The header is a real button inside the heading, with a caret that points right when closed and down when open, and `aria-expanded`. Under the title it always shows one summary line: the item count, the dollar total, how many are rough or missing, and a checkmark when the section is complete ("Debts: 7 items, $35,829, 2 rough" and a check). Complete means every required field is answered; roughly counts as answered, look-it-up does not. When the screen opens, only the first section that needs attention is open: the first with a required answer missing; if none, the first with a rough value; if none, all are closed. Closing a section hides it. Nothing is ever removed. The numbers in the summary come from the engine.

### Group header
Inside Accounts and Debts, rows are grouped under a small heading with the group's count and subtotal on the right ("Credit cards: 4 items, $15,829"). Accounts group as Cash (checking, savings), Investing (brokerage), and Retirement (401(k)s, IRAs, HSA). Debts group as Credit cards (personal and business), Student loans, then Other debts. Empty groups are not shown. The groups live in `data/entry-groups.json` and the subtotals come from the engine. Income and spending are not grouped.

### Dense row
Every item in Income, Spending, Accounts, and Debts shows as one line: its name on the left, its key number on the right, and the number's kind badge. A second line in smaller muted text appears only when there is something to say ("17%, $40/mo" on a debt, "starts Jan 2027" on an income). An item that still needs its number says so in place of the number ("Needs an amount"). Rows are at least 44px tall and are separated by a divider, with no other gap.

Tapping a row opens its fields in place. Done folds it back and returns focus to the row. Only one row is open at a time: opening another closes the first, and what was typed is already saved. A new item opens straight into its fields with the cursor in the first one. The row is a real button with `aria-expanded`, and the open editor is a labeled group. Remove sits beside Done.

### Unconfirmed income line
On the result screen, when any income is marked not confirmed, a gentle flag sits above the other flags: "Includes income not yet confirmed: Town contract." with one action, "Change my numbers". On the entry screen each income has "Is this income confirmed?" with two choices.

### Dated spending
Spending is a list of rows, added from a list of categories ("Add spending"). One total is a single row under Everything else. Opening a row shows its amount and its start and end choices, the same wording income uses, plus "Add another amount" for a cost that changes on a date. A row with a start or an end says when it counts on its second line ("starts Jul 2027").

### Promo fields
On a debt whose rate is 0% (or that already has a promo), the card shows "This rate" with two choices: "Does not end" and "Ends after a month". Choosing the second shows the month and year the promo lasts through and the rate after it. A 0% rate with no end shows a gentle flag, and so does a rate-after that is still a typical rate or blank.

### True FI card
The unlockable moment from M2 spec section 9. Locked, it says how many questions and minutes remain and lists them, each a link to its field, with a quiet "Locked" pill in the title. Unlocked, it shows the 4% rule number in muted text, the True FI number in hero type with a Computed badge, one sentence with the difference in dollars and years, the top three strategies, and two quiet buttons: "Reveal" (later "Replay the reveal") and "Share card". The number counts from the FI number to the True FI number over about a second and a half; with reduced motion on, it appears at once. The share card (in the drawer) shows years gained and the strategies, never dollar amounts unless the person turns them on.

### Plan steps
An ordered list of age ranges ("Ages 40 to 44") each followed by one to four plain sentences describing what the numbers show for those years. Divider between steps. Above it, a select for "Optimize for" with the four objectives written as the question each answers.

### Strategy row
One per strategy the optimizer can use: an On or Off pill (On is filled brand 700 with light text), the strategy's name, and under it in muted text what turning it off would do in years and dollars. "Not in this plan" when off.

### Stress list and rules list
Plain lists with a divider between items. A stress item is the case and its effect. A rules item is the rule's name linking to its official source, with source, last-verified date, and status in metadata type beneath.

### Section order control
When "Rearrange" is on (a toggle button in the screen head), every result section gets Up and Down quiet buttons in its title row, each a 44px target with an accessible label naming the section. The order is a display preference, stored separately from the plan.

### Plan details card
A collapsed details card on the entry screen holding the Level 4 drawdown inputs: cost basis per taxable account, contributions so far per Roth account, saved receipts per HSA, the first Roth year, the workplace plan's rule of 55, 457(b), and mega backdoor answers, the separation age, the heir tax rate, the number of people on the health plan, and the Medicaid expansion answer. Its title counts what is left to unlock the True FI number. Every money field carries a kind badge; every question has a "Not sure yet" answer.

### Tabs
A row of tab buttons under the screen title (Next, Small wins, The Sky), each a 44px target with `role="tab"` and `aria-selected`; the active tab carries a brand underline.

### Next card
The big card: a quiet kicker ("Next"), the item's sentence as the title in screen-title size ("Your 401(k) balance is marked roughly and could move your FI number by $41,000 (about 14 months)"), one muted line with what it is worth, how long it takes, why we are asking, and where to find it, and one primary button. Two small cards follow with the same parts at body size and a quiet button. No card appears without value, effort, and why.

### Level progress
A card naming the current level, one sentence ("You've covered 92% of what matters"), a progress bar (`role="progressbar"`) filled to the impact-weighted coverage, and a muted line listing levels passed. Above 5% materiality the screen carries a gentle flag: "Calculated at 15% materiality. Results are rougher than usual."

### Refresh card and Rough numbers card
The same card pattern: a title with the count ("4 numbers have aged", "6 numbers are rough"), one sentence naming them and the minutes, and a quiet button that opens the list in place. Each aged line shows the value, its age, and its next check, with "Still right" and "Update it"; "Confirm all that haven't changed" sits under the list. Each rough line shows its kind badge, what it could move, and a small running bar of uncertainty cleared.

### Small wins card
The running total at the top in headline size ("12 small wins: $1,340 a year, about 4 months sooner"), then one win at a time as a big card with its category as the kicker, the range and minutes in muted text, and three buttons: Done (primary), Not for me, Later. Answered wins collapse under "Already answered" with a Reopen button.

### The Sky
An SVG of circles around a center circle (you and your FI date), one per area, then one per row when zoomed in. Fill height shows coverage, the ring color shows the kind (dashed attention for missing), and size shows materiality. Each circle is a focusable button with an accessible label; Enter or Space zooms. A breadcrumb trail ("Everything › Accounts › Roth IRA") and a Zoom out button go back. Motion is a transition that reduced motion turns off. "Show as an outline" swaps in the same hierarchy as an indented list with kind badges and coverage, fully usable by keyboard and screen reader.

### Entry mode switch
Three toggle buttons at the top of Your numbers: One at a time (guided: one section per step with Back and Next), All on one form (express), Paste everything (dump: the template paste box moves to the top). The choice is remembered and can change at any time without losing anything.

### Level cards
One card per level on the Levels screen: the level's headline sentence with a Computed badge, then subtitled parts (the Rule of 5, the staircase, the runway stack, shock tests; the spectrum line and each milestone with its condition and what moves it; the estate by money type, giving, legacy projects, Legacy FI, the freedom budget, the basics). Each card ends with a collapsed details card of that level's inputs, every one with a default and a plain help line.

### Block card
One per scenario block: its name with the block's kind badge, one line per start date with the change in monthly cash flow and the FI date moved, a muted line listing its changes, and three quiet buttons (Turn off, Compare a timing, Remove). Below the list, a select adds a block; choosing a kind shows its three or four questions with the national defaults as placeholders and "Add this as a block".

### Price card
One per dream: the name with its kind badge and priority, then an ordered list in the spec's order (the cost in time, the true amount, the other side of the trade, the best timing), a small bar chart of cost in years by start age with a dot above ages that carry a marker, the markers in words, the milestones moved, and ways to lower the price. "What would you rather have?" is a question on the card, never a verdict.

### Comparison table
Payoff methods side by side: method, order, months to debt free, interest, stress-months, with a sentence beneath naming the price of peace and a Computed badge. An input above sets the extra a month.

### Ratio row
One per ratio: the name, a Computed badge (or a quiet level pill when locked), the value right-aligned in tabular figures, the sentence beneath, and a muted "How:" line with the formula.

### Lens buttons and verdict pills
Lenses are toggle buttons in a row; the open lens shows its idea and its parts beneath. A verdict pill (Applies, Partly, Unlearn) sits right of each advice line: Applies filled brand 700, Unlearn filled attention ink, Partly outlined.

### Risk cards
The return series card (source, years, verified date, and a gentle flag while unverified); the backtest card with the success rate in its title, the worst starts as sentences ("Retiring in 2041 with 1966's markets ahead: the plan ran short at 81"), and the sturdy FI date; the guardrails card; the Flex FI card with the date beside the plan's own. Every headline figure carries a Computed badge.

### Partner block and owner pickers
On About you, "Add a partner" opens a second set of person fields under a "Your partner" subheading (birth month and year, HSA eligible, Social Security claiming age). Removing the partner shows the confirm panel first and says what goes with them. Once a partner exists, each income row's editor gains a "Whose income" select (Mine, My partner's), the Income section gains an "Add partner's income" picker and marks the partner's rows "partner's", and each account editor gains a "Whose account" select (Mine, My partner's, Joint; retirement accounts never offer Joint).

### Toggle button
A button that is either on or off, for display choices like "Show future dollars". It says what it does, shows its state with a filled background and `aria-pressed`, and is a full 44px tap target. Used instead of small checkboxes.

---

## 6. Accessibility

- Visible focus on every interactive element.
- All controls reachable by keyboard.
- Charts have a text summary.
- Motion respects `prefers-reduced-motion`.
- Tap targets at least 44px.
