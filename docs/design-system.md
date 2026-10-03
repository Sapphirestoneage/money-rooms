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

### Preset picker
A list of account or category types with plain names and a one-line description. Picking one fills its fields.

### Money input
Accepts "4120", "4,120", "$4,120", or "4.1k". Has a cadence selector beside it (per hour, paycheck, month, year). Shows the normalized annual amount underneath in muted text.

### Headline result
The FI date in hero type, with the best and worst range beneath it in a single line:

```
Age 41
Likely in 2042. Could be as soon as 2039 or as late as 2047.
```

### Trace drawer
Opens from any computed number. Lists the inputs that produced it, ranked by how much each one moves it, each linking to its field.

### Band chart
Balance over time with three lines (best, likely, worst) using the band tokens. Labeled directly on the lines, no legend box.

### Gentle flag
For proof-of-cash mismatches, stale numbers, and payments that don't cover interest. Attention color, one plain sentence, one action.

---

## 6. Accessibility

- Visible focus on every interactive element.
- All controls reachable by keyboard.
- Charts have a text summary.
- Motion respects `prefers-reduced-motion`.
- Tap targets at least 44px.
