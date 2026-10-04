# Expansion packs

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, docs only, on branch `packs-specs`. Nothing here is built.

A pack is a bundle of questions, engine pieces, and screens for one situation, switched on when the situation applies. Levels (M3 spec section 2) add depth for everyone; packs add breadth for some. A pack never duplicates a stored fact (every field it adds goes in the data dictionary first), never calculates in the UI, and unlocks on a condition the engine can read from the household, never on a purchase.

Each spec follows the format of `docs/m3-spec.md`: the idea in one paragraph, who it is for, when it unlocks, the questions it adds (mapped to the dictionary), the engine pieces it reuses, what is new, acceptance tests, and what waits. Every product decision in a pack is Proposed until Eli reviews it.

| Pack | Who | Unlocks when | New engine capability needed |
|---|---|---|---|
| [Earn more](earn-more.md) | Anyone whose gap is small or whose real hourly wage is low | Level 1 complete | No (reuses blocks, ratios, the FI search) |
| [Self-employed](self-employed.md) | Self-employed and side-gig earners, business owners | A self-employed or side-gig stream exists | **Yes**: QBI, solo 401(k) and SEP room, S-corp salary, estimated taxes |
| [Home](home.md) | Renters deciding, owners with a mortgage, anyone refinancing or moving | A mortgage exists or the home block is tried | **Yes**: a home as an account with an appreciation band, mortgage interest and property tax, sale and rent-vs-buy over the plan |
| [Partner](partner.md) | Households of two | A partner is entered | Partly: separate retirement dates, the partner's claiming age in the optimizer, mortality before plan-to age |
| [Family](family.md) | Parents and those planning for a child | A kid block exists or a dependent is entered | **Yes**: dependents on the return (child tax credit, head of household), 529 accounts, 529-to-Roth |
| [Move](move.md) | Anyone considering another state or country | A geo-arbitrage block is tried or the state changes | Partly: dated state changes exist in the engine; abroad needs the foreign earned income exclusion and a non-US tax placeholder |
| [Health](health.md) | Anyone retiring before 65, anyone with a chronic cost, anyone near Medicare | Level 2 complete, or retirement before 65 | Partly: COBRA, a health-cost phase, long-term care are new; ACA and IRMAA exist |
| [Taxes](taxes.md) | Anyone with a Level 4 plan who wants the return behind it | Level 4 unlocked | Partly: itemizing, tax-loss harvesting with lots, state retirement-income rules are new; the rest exists |
| [Debt freedom](debt-freedom.md) | Anyone with debt above the mortgage | A debt exists | No (reuses the payoff engine, blocks, small wins) |
| [Coach](coach.md) | A person working with a coach, or a coach with clients | Switched on by the person, never by default | **Yes**: a shared read-only view, notes that never change a number, a second export shape (depends on the audience decision in the roadmap's parking lot) |

## Rules every pack follows

1. The pack's fields are in `docs/data-dictionary.md` section 9 (or a new section) before any code.
2. The pack's rule values (rates, limits, thresholds) are in `data/rules-registry.json` with a source and a verified date, or they are not used.
3. A pack's result is a view on the one engine. It never keeps a second number.
4. The Maya tie-out (M1 conventions) is untouched by every pack; a pack's engine pieces run only when its condition holds.
5. Wording: results describe what the numbers show. A pack never instructs.
