---
id: sheet-functions
title: "Spreadsheets: IF, COUNTIF, SUMIFS, and Lookups"
summary: The spreadsheet functions analysts use most, and how each one maps to SQL you already know.
minutes: 9
practice:
  - sql-price-bands
sources:
  - id: 1
    title: "IF function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/if-function-69aed7c9-4e8a-4755-a9bc-aa8bbff73be2
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "COUNTIF function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/countif-function-e0de10c6-f885-4e71-abb4-1f464816df34
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "SUMIFS function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/sumifs-function-c9e748f5-7ea7-455d-9406-611cebce642b
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "XLOOKUP function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-6d10-43e6-84f9-88eae8bf5929
    accessed: 2026-10-28
    verified: true
  - id: 5
    title: "VLOOKUP function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/vlookup-function-0bbc8083-26fe-4963-8ab8-93a18ad188a1
    accessed: 2026-10-28
    verified: true
  - id: 6
    title: "TRIM function"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/trim-function-410388fa-c5df-49c6-b16c-9e5630b479f9
    accessed: 2026-10-28
    verified: true
  - id: 7
    title: "Google Sheets function list"
    publisher: Google Docs Editors Help
    url: https://support.google.com/docs/table/25273
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which formula counts how many cells in B2:B100 say "Delivered"?
    options:
      - "=SUM(B2:B100,\"Delivered\")"
      - "=COUNTIF(B2:B100,\"Delivered\")"
      - "=IF(B2:B100=\"Delivered\")"
      - "=COUNT(\"Delivered\")"
    answer: 1
    explanation: COUNTIF(range, criteria) counts the cells in the range that meet the criterion, like COUNT(*) with a WHERE in SQL.
  - question: You use VLOOKUP but leave out the last argument. What can go wrong?
    options:
      - Nothing, exact match is the default
      - It defaults to an approximate match, which can return a wrong row without any error
      - It always returns #N/A
      - It searches the last column
    answer: 1
    explanation: VLOOKUP's default is TRUE (approximate match). For IDs and names, always use FALSE for an exact match, or use XLOOKUP, whose default is exact.
  - question: Which SQL idea is closest to XLOOKUP?
    options:
      - GROUP BY
      - JOIN (looking up a matching row in another table)
      - ORDER BY
      - LIMIT
    answer: 1
    explanation: XLOOKUP finds the matching row in another range and returns a value from it, just as a JOIN brings in columns from a matching row.
---

## Functions you'll use every week

You already know these ideas from SQL and Python. This lesson shows their spreadsheet names. The examples use Excel's
syntax. Google Sheets has the same functions.[^7]

| Spreadsheet | SQL equivalent |
|---|---|
| `IF` | `CASE WHEN … THEN … ELSE … END` |
| `COUNTIF` | `COUNT(*) … WHERE` |
| `SUMIFS` | `SUM(…) … WHERE … AND …` |
| `XLOOKUP` / `VLOOKUP` | `JOIN` to get a value from another table |
| `TRIM` | `TRIM(…)` |

## IF: a decision in one cell

`IF` lets you "make logical comparisons between a value and what you expect", so it can have "two results".[^1] The
syntax is `IF(logical_test, value_if_true, [value_if_false])`.[^1]

```
=IF(D2>=100, "Large", "Small")
```

You can put an `IF` inside another `IF` for more than two outcomes, but nested `IF`s get hard to read quickly. A small
lookup table of bands (see XLOOKUP below) is often clearer.

## COUNTIF and SUMIFS: conditional totals

`COUNTIF` counts "the number of cells that meet a criterion": `COUNTIF(range, criteria)`.[^2]

```
=COUNTIF(B2:B100, "Delivered")
```

`SUMIFS` "adds all of its arguments that meet multiple criteria".[^3] The range to add comes **first**, followed by
pairs of a criteria range and a criterion:[^3]

```
=SUMIFS(D2:D100, B2:B100, "Delivered", C2:C100, "Manila")
```

That's the revenue of delivered orders from Manila, like `SUM(total) … WHERE status = 'Delivered' AND city = 'Manila'`.

## Lookups: XLOOKUP and VLOOKUP

Lookups bring a value in from another table: a product's price, a customer's city.

**XLOOKUP** finds things "in a table or range by row":[^4]

```
=XLOOKUP(A2, Products!A:A, Products!C:C, "Not found")
```

Read it as: find `A2` in the product ID column and return the matching value from the price column. If nothing matches,
show "Not found". Exact match is the default, and without an `if_not_found` value a missing match shows `#N/A`.[^4]
XLOOKUP isn't available in Excel 2016 or 2019.[^4]

**VLOOKUP** is older and still everywhere: `VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])`.[^5]
Two traps:

- "The value you want to look up must be in the first column of the range."[^5]
- If you leave out `range_lookup`, it defaults to `TRUE`, an **approximate** match.[^5] For IDs and names, that can
  silently return the wrong row. Always write `FALSE` for an exact match:

```
=VLOOKUP(A2, Products!A:C, 3, FALSE)
```

## TRIM: invisible spaces

`TRIM` "removes all spaces from text except for single spaces between words".[^6] Microsoft suggests it for "text that
you have received from another application that may have irregular spacing".[^6] Extra spaces are a common reason why a
lookup fails even though the values look identical.

## Key points

- `IF` is the spreadsheet `CASE`. `COUNTIF` and `SUMIFS` are conditional `COUNT` and `SUM`.
- Lookups are the spreadsheet `JOIN`. Prefer `XLOOKUP`, and use `FALSE` with `VLOOKUP`.
- When a lookup fails on values that look equal, suspect extra spaces and `TRIM`.
