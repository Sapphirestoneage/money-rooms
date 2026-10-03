# Tax tables

One file per tax year: `<year>.json`.

Each file must include:

- `source`: the IRS publication or state revenue page the numbers came from, with a link
- `retrieved`: the date the numbers were copied
- Federal ordinary brackets and standard deduction by filing status
- FICA rates and the Social Security wage base
- Contribution limits (401(k), IRA, HSA, catch-up)
- State effective rates (M1) or state brackets (M2)

Engine code never contains a tax rate. If a number isn't in a file here with a source, the engine doesn't use it.

These tables are created in M1 by Claude Code from official sources and reviewed by Eli before use.
