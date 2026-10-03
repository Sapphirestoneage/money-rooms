# Money Rooms

Free, comprehensive financial planning software from **Stress Less About Money**.

Built for people in their 20s working toward early retirement. Money Rooms runs one continuous projection from today through the end of life, so the retirement target is shaped by how the money will actually be drawn down, not by a rule of thumb.

## Status

**Version 2.** A ground-up rebuild on a new foundation.
**Current milestone:** M1, the walking skeleton. See [`docs/roadmap.md`](docs/roadmap.md).

Version 1 (`sapphirestoneage/Personalfinance`) stays online as a reference. Ideas from it get ported into v2 once the foundation can hold them.

## How it's built

Money Rooms is built in layers. Each layer only reads from the layers below it.

```
  Views (ui/)              Show data and results. Never calculate.
  Meaning and actions      Ratios, lenses, next steps. (Later milestones)
  Engine (engine/)         The projection. Pure math, no screens.
  Flow                     What gets asked, and when.
  Relevance rules          Which fields exist for this person.
  Data model (data/)       Every field, defined once.
  Purpose (docs/)          Who it's for and what they leave with.
```

### The seven rules

1. **Each layer reads only from the layers below it.** A screen can read the engine. The engine never reads a screen.
2. **Every fact is entered once and stored once.** Rooms are views of the same data, never copies of it.
3. **Store the parts, compute the totals.** Birth date, not age. Income streams, not total income.
4. **Screens never calculate.** All math lives in `engine/`.
5. **Every number traces back to its inputs.** If a number can't be traced, it doesn't ship.
6. **Real dollars inside.** The engine works in today's dollars. Nominal is a display toggle only.
7. **Every value has a date.** Anything that can change gets an as-of date, or a start and end.

## Folders

| Folder | What lives there |
|---|---|
| `docs/` | The specs: data dictionary, engine spec, decisions, design system, style guide, roadmap |
| `data/` | Field values that aren't code: account presets, assumption sets, spending categories, tax tables |
| `engine/` | The projection. No screen code, no styling |
| `ui/` | Screens, components, and the design tokens |
| `tests/` | Example households with known answers, checked on every change |

## Working on this project

- **Docs before code.** If a field isn't in [`docs/data-dictionary.md`](docs/data-dictionary.md), it doesn't exist yet. Add it to the dictionary first.
- **One milestone at a time.** Nothing from a later milestone gets built early, no matter how good the idea is. Good ideas go in the parking lot in the roadmap.
- **Decisions get logged.** Anything settled goes in [`docs/decisions.md`](docs/decisions.md) with a date and a reason.
- **Tests stay green.** Every example household must still produce its expected answer before a change is merged.
- **Small commits.** One logical change per commit, with a plain-English message.

## Docs index

| Document | Answers |
|---|---|
| [`data-dictionary.md`](docs/data-dictionary.md) | What does the app know, and how is each piece stored? |
| [`engine-spec.md`](docs/engine-spec.md) | How does the projection turn inputs into answers? |
| [`decisions.md`](docs/decisions.md) | What's settled, what's proposed, and why? |
| [`roadmap.md`](docs/roadmap.md) | What gets built in what order, and what's parked? |
| [`design-system.md`](docs/design-system.md) | How does everything look? |
| [`style-guide.md`](docs/style-guide.md) | How does everything read? |
| [`kickoff-prompt.md`](docs/kickoff-prompt.md) | The message that starts a Claude Code session on M1 |

---

Money Rooms is educational software, not individualized financial, tax, or legal advice.
