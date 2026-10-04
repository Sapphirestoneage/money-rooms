# Accessibility audit, October 2026

**Status: Proposed, not reviewed by Eli.** Run 2026-10-04 (overnight build, Phase 0c) with axe-core 4 through Playwright against the built site, on both screens (Your numbers with Maya loaded and every section and one row opened; Your FI date), at 360px and 1280px, in light and dark. Rules: WCAG 2.0 and 2.1 A and AA, plus axe best practices. A second pass checked tap targets under 44px and horizontal overflow.

## Before the fixes

| Screen | Theme | Violations |
|---|---|---|
| Your numbers | Light | The Roughly pill: ochre `#B9820C` behind light text, 3.15:1 |
| Your FI date | Light | The "Needs a look" label on gentle flags: ochre text on the soft ochre background, about 3:1 |
| Your numbers | Dark | The Known pill (`#3C5E75` behind light text, 2.35:1), the quiet buttons (brand 700 text on dark paper, 2.6:1), 13 nodes |
| Your FI date | Dark | The Computed pill (light ink on `#80A2A3`), the Known pill, 8 nodes |

No overflow at 360px on either screen. No tap target under 44px except two 1px visually hidden radio inputs, whose labels are the targets (not a bug).

## What was fixed (clear bugs, tokens only)

All changes are in `ui/tokens.css`, plus two selectors in `ui/components.css` that now read the new tokens. No screen file changed.

| Change | Ratio after |
|---|---|
| New `--color-attention-ink` (`#7F5A07` light, `#E3B23F` dark) for attention as text and as the Roughly pill | Roughly pill 5.85:1; flag label 5.04:1 |
| Dark overrides: `--color-brand-700` to `#7FA8B9`, `--color-brand-500` to `#6F97A8` | Quiet button text 7.0:1; Known pill 6.33:1 |
| Dark kind colors: Known `#7FA8B9`, Look it up `#9FC0C1`, Computed `#2F4F5B` with light ink, Not for me `#96A6A9` | Computed pill 7.13:1; Look it up 8.32:1 |
| New `--color-computed-text` so the Computed pill's text follows the pill | |

**After the fixes: 0 violations on every screen, size, and theme.**

## Judgment calls (not changed)

1. **`role="listitem"` on the preset picker's buttons.** axe reports it as "needs review" (aria-allowed-role). A button inside a list is a common pattern, but the cleaner markup is a `<ul>` of `<li>` each holding a button. Low risk; change when the picker is next touched.
2. **Color-contrast "needs review" (8 to 14 nodes per screen).** These are the chart's SVG labels and text over the band fills, which axe cannot measure. The band colors were chosen for 4.5:1 against paper in both themes, but the labels that sit on a filled band should be checked by eye.
3. **The dark likely band** is now the lighter brand 700, which makes the line easier to read on dark but changes the look. If the old slate line is preferred, give the band its own dark token instead of sharing brand 700.
4. **Quiet buttons in dark** are now a light blue-grey. Same trade: readable, less subdued.
5. **The result screen's hero number** has a Computed pill beside it; with the dark pill now dark-on-dark with light text, it reads as quieter than in light. That was the intent (numbers are the hero), but worth a look on a real phone.

## Not covered by this pass

Screen reader walk-through, keyboard-only use of the dense row editor, and large text (200%) layouts. Each needs a person, not a checker.
