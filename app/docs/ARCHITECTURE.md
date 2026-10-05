# Architecture: hub and spoke

## 1. The shape

One Sun, seven planets. The Sun is the hub: it holds the core facts (the household, birth dates, filing status, state) and the published outputs of every planet. The planets are Income, Spending, Debt, Safety Net, Investments and Accounts, Taxes, and Life Plan. A moon is a subtopic inside a planet (a 401(k) inside Investments, a promo rate inside Debt) and never has outputs of its own: it publishes through its planet.

## 2. The rules

1. **Planets publish outputs to the Sun and read only published outputs.** A planet never reads another planet's internals: not its raw inputs, not its working values, not its code. If Debt needs take-home pay, it reads Income's published `monthlyTakeHome` from the hub. If it needs something Income does not publish, that is a contract change (see `CONTRACTS.md`), not an import.
2. **Every fact has exactly one owner planet.** Any planet can read anything the hub publishes; only the owner writes the fact. The owner is named in `DATA_MODEL.md` for every entity and field.
3. **Real changes enter only through the Ledger.** A change to a fact (new value, new status, new as-of date) is a ledger entry: who, when, what, why. The Ledger routes each entry to the fact's owner planet, which applies it. Nothing else writes facts, which is how "only the owner writes" is enforced rather than hoped for.
4. **The simulator runs in a copy-on-write sandbox.** A scenario reads real data live (it always sees the current facts) and writes only to its own overlay. Nothing in a sandbox changes reality until an explicit **Promote** action turns a sandbox change into ledger entries. Scenarios never overwrite facts (`DATA_MODEL.md` section 4).
5. **Every planet uses five stations**, in order:
   - **capture**: take inputs in, with their status and metadata, as a rough total or detail lines;
   - **enrich**: fill what can be derived or defaulted (solve take-home from gross, apply a preset's typical rate), marking every default as estimated;
   - **analyze**: compute the planet's metrics through the registry;
   - **recommend**: turn metrics into the planet's lines on the one-page plan;
   - **publish**: put the contract's outputs on the hub.
   A planet is done when all five stations work for every input status (`DONE.md`).

## 3. How a value moves

```
coach enters a number
  -> Ledger entry (routed to the owner planet)
    -> owner planet, capture station (status, as-of, source, precision)
      -> enrich (derived fields, flagged defaults)
        -> analyze (metrics registry: only downstream metrics recompute)
          -> recommend (one-pager lines)
            -> publish (the hub)
              -> every other planet reads the published outputs
```

The metrics registry (`core/registry.ts`) is the dependency graph. Each metric declares its inputs and what to do when one is missing: **wait** (show which inputs are needed), **default** (use a flagged default and mark the result estimated), or **zero** (only when a missing value is safely zero). A metric never throws and never breaks a metric downstream of it; a missing input flows through as a "waiting" or "estimated" state.

## 4. The Simulate leg

A scenario is a sandbox: an overlay of changes on top of the live facts. Reading a value in a sandbox returns the overlay's value if one exists, otherwise the live fact. Writing in a sandbox writes the overlay only. The metrics registry runs the same way inside a sandbox, so every metric can be seen "as if" without touching reality. **Promote** turns chosen overlay entries into ledger entries, which then go to the owners like any other change. Promote is explicit, named, and logged.

## 5. The Measure and Learn legs

Measure is the published outputs of every planet, read from the hub, laid out as the one-page plan. Learn is curated reading linked from a planet or a moon; it reads nothing and writes nothing.

## 6. What this rules out

- A planet importing another planet's module.
- A screen computing a number.
- A stored derived value.
- A scenario that edits a fact in place.
- A metric that throws.
