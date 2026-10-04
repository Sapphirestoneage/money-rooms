# M6 spec: Risk

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build, in the format of `m3-spec.md`, then built on branch `m6-risk`. Every product decision is logged as Proposed (decisions Q1 to Q6).

---

## 1. The idea in one paragraph

Everything before M6 runs one path: the likely band, one return every year. Real markets arrive in sequences, and the order matters most in the first years of retirement (sequence-of-returns risk, Big ERN's territory). M6 replays the plan against history: every starting year in a long-run series of real stock, bond, and cash returns, the same spending, the same rules. It reports how often the plan held, which starts broke it, and the FI date that holds in nine starts out of ten. It adds two ways to bend without breaking: guardrails spending (Guyton-Klinger), and Flex FI, which trims spending in years the market is down. None of this changes the tax math; it changes how sure the plan is.

---

## 2. The parts

### 2.1 The return series

`data/returns-history.json`: one row per calendar year with the real total return on US stocks, US 10-year Treasury bonds, and 3-month bills, and the inflation rate used to make them real, with the source, URL, and last-verified date. The engine reads it only from there. **While the series is unverified, every M6 result carries a flag saying so.**

### 2.2 Historical backtests

For each start year in the series that leaves room for the plan's horizon, the engine reruns the whole plan (working years included) with that year's and the following years' real returns in place of the band's single return. Each year's blended account return is the allocation-weighted historical return minus fees, exactly as the band's return is today.

| Output | Meaning |
|---|---|
| `successRate` | Share of start years with no shortfall through plan-to age |
| `worstStarts` | The start years that broke the plan, with the age the shortfall began |
| `medianEstate`, `worstEstate` | What is left at plan-to age across starts |
| `sturdyFiYear` | The earliest retirement year whose success rate is at least the threshold (default 90%) |

Starts whose window ends before the plan's horizon are filled with the likely band's return for the missing tail, and counted; the result says how many were filled.

### 2.3 Guardrails spending

Guyton-Klinger, simplified to the two guardrails that matter most: the initial withdrawal rate is retirement spending over assets at retirement. Each retired year, if the current withdrawal rate is above the initial rate times 1.2, spending is cut 10% for the rest of the plan; if below 0.8 times, spending rises 10%. Reported: success rate with guardrails, how many starts needed a cut, the lowest spending year across starts, the highest.

### 2.4 Flex FI

Spending trimmed by a set share (default 10%, decision G5) in every retired year whose stock return was negative. Flex FI is the earliest retirement year whose backtest success rate is at least the threshold with the trim in place. It replaces "Coming soon" on the Level 3 spectrum.

### 2.5 The sequence view

A Risk screen: the series and its status, success at the plan's own FI date, the worst starts in plain words ("Retiring in 1966 broke the plan at 81"), the sturdy FI date, guardrails, Flex FI, and the plan's own date beside each.

---

## 3. Data dictionary additions

| Field | Kind | Stored as | Default |
|---|---|---|---|
| `risk.successThresholdPercent` | Goal | Percent | 90 |
| `risk.guardrailsOn` | Decision | Boolean | Off |
| `milestones.flexFiTrimPercent` | Goal (exists, G5) | Percent | 10 |

Stored under `risk` on the household.

---

## 4. Acceptance tests

1. A backtest start year uses that year's historical returns: with a one-stock-account household, the first year's growth equals the series' real stock return for the start year less fees.
2. The success rate is the share of starts with no shortfall, and the sturdy FI date is never earlier than the deterministic FI date.
3. The worst starts list names the start year and the age the shortfall began, oldest shortfall first.
4. Guardrails cut spending 10% when the withdrawal rate crosses 1.2 times the initial rate and raise it 10% under 0.8 times, and never cut below the FAT step of the staircase.
5. Flex FI's date is the earliest year the trimmed plan holds at the threshold, and is never later than the sturdy FI date without the trim.
6. Every M6 result carries the series' source and verified date, and a flag while it is unverified.
7. Starts filled with the likely tail are counted and reported.

---

## 5. Not in M6

Bond tents and glide paths (asset location over time), Monte Carlo (the backtests use history, not draws), international series.
