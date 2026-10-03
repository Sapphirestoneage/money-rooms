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
| `--color-attention` | "Needs a look": rough numbers, stale numbers, gentle flags |
| `--color-band-best / likely / worst` | The three projection bands |

**Rules**

- Red is not in the palette. Shortfalls and flags use attention (ochre) with clear words.
- Color never carries meaning alone. Every colored state also has a label or icon.
- Text meets WCAG AA contrast (4.5:1 for body text) in both light and dark themes.

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

### Toggle button
A button that is either on or off, for display choices like "Show future dollars". It says what it does, shows its state with a filled background and `aria-pressed`, and is a full 44px tap target. Used instead of small checkboxes.

---

## 6. Accessibility

- Visible focus on every interactive element.
- All controls reachable by keyboard.
- Charts have a text summary.
- Motion respects `prefers-reduced-motion`.
- Tap targets at least 44px.
