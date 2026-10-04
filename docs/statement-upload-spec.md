# Statement upload spec

**Status: Proposed, not reviewed by Eli.** Drafted 2026-10-04 during the overnight build. Specification only; nothing built.

---

## 1. The idea in one paragraph

People have their numbers in statements, not in their heads. Today they type them or fill the CSV template (`docs/import-template.md`). This spec adds a third door: drop a statement (PDF or CSV from a bank, brokerage, 401(k) provider, or lender) and the app reads the balance, the account type, the as-of date, and for a debt the rate and payment, then shows a preview the person confirms row by row. Everything happens in the browser; no file leaves it. The promise on the Privacy page holds.

---

## 2. What it reads

| From | Fields | Kind on import |
|---|---|---|
| Any statement | Institution name, account label, statement date (becomes the value's as-of date) | Known |
| Asset statement | Ending balance; the account type from words on the page (401(k), Roth IRA, brokerage, HSA, savings) | Balance known; type roughly until confirmed |
| Debt statement | Balance owed, interest rate (APR), minimum payment, promo end date if printed | Known where printed; lookUp where not found |
| Brokerage statement | Cost basis total when printed (Level 4) | Known |
| Pay stub | Gross pay, pay frequency, pre-tax deductions by kind, employer match | Known |

Never read: account numbers (masked or not), names, addresses, transactions. The parser skips any line that looks like an account number and never stores one.

## 3. How it reads

1. **CSV**: the existing template importer handles the template shape; a second, forgiving reader maps common bank export headers (Date, Description, Amount, Balance) to a balance and date.
2. **PDF**: text extraction in the browser (a small PDF text library, or the browser's own rendering to text where available), then the same keyword rules. Scanned PDFs without a text layer are declined with a sentence that says why and what to do (type the balance, or export a CSV).
3. **Rules, not a model**: a table of keyword patterns per field in `data/statement-patterns.json` (institution hints, type words, "Ending balance", "APR", "Minimum payment due"). Every match carries which pattern fired, so the preview can show "read as 401(k) because the page says 'Pre-Tax 401(k)'". No AI call: that would send the statement somewhere.

## 4. The preview

The same import preview component (design system 5) the CSV template uses: one row per value read, with the field, the value, the as-of date, the kind badge, and the sentence naming the pattern. Each row can be edited or dropped before "Add these". A row that would replace an existing account's balance asks which (the existing one, matched by type and institution, or a new account). Nothing is written until the person confirms.

## 5. Acceptance tests

1. A sample 401(k) statement (fixture with made-up numbers) yields one pretax account with the printed balance and the statement date as as-of.
2. A sample credit card statement yields a debt with balance, APR, and minimum payment, all known.
3. A statement containing an account number stores nothing that matches it, and the preview never shows it.
4. A scanned PDF is declined with the explanatory sentence.
5. The import preview shows the pattern that fired for every value.
6. No network request is made during an import (tested with a fetch spy).

## 6. Risks and what waits

- Statement layouts change; the pattern table needs the rules update routine (`docs/rules-update-routine.md`) applied to it too.
- PDF text extraction adds a dependency and bundle weight; see `docs/performance-budget.md` for the budget it must fit and the lazy-loading rule.
- Transactions, categorizing spending from statements, and bank connections stay in the parking lot (after M7).
