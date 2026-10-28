---
id: sheet-formulas
title: "Spreadsheets: Cells, Formulas, and References"
summary: How spreadsheet formulas work, and why $A$1 behaves differently from A1 when you copy a formula.
minutes: 8
sources:
  - id: 1
    title: "Overview of formulas in Excel"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Switch between relative, absolute, and mixed references"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/switch-between-relative-absolute-and-mixed-references-dfec08cd-ae65-4f56-839e-5f0d8d0baca9
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Google Sheets function list"
    publisher: Google Docs Editors Help
    url: https://support.google.com/docs/table/25273
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Cell C2 contains =A2*B2. You copy it down to C3. What does C3 contain?
    options:
      - "=A2*B2"
      - "=A3*B3"
      - "=A3*B2"
      - An error
    answer: 1
    explanation: A2 and B2 are relative references, so they move down one row along with the formula.
  - question: "The tax rate is in cell F1. Which formula can you copy down a whole column safely?"
    options:
      - "=B2*F1"
      - "=B2*$F$1"
      - "=$B$2*F1"
      - "=B2*F$2"
    answer: 1
    explanation: $F$1 is absolute, so every copied row still points at the tax rate. B2 stays relative, so it moves to B3, B4, and so on.
  - question: What must every spreadsheet formula start with?
    options:
      - A function name
      - "An equal sign (=)"
      - A cell reference
      - "A dollar sign ($)"
    answer: 1
    explanation: The = tells the spreadsheet to calculate instead of storing the text as typed.
---

## Why spreadsheets still matter

Excel and Google Sheets are often the first place data lands, and many colleagues will only ever open a spreadsheet. A
good analyst moves comfortably between spreadsheets, SQL, and Python. The ideas are the same: a table of rows and columns,
and calculations on them.

## Cells and formulas

Every cell has an address: a column letter and a row number, like `B3`. A range covers a block of cells: `B2:B10`.

A formula calculates a value. "Formulas in Excel always begin with the equal sign."[^1] Without the `=`, the spreadsheet
just stores what you typed as text.

```
=B2*C2              price times quantity
=SUM(D2:D100)       total of a column
=AVERAGE(D2:D100)   the mean
=MEDIAN(D2:D100)    the median
```

`SUM`, `AVERAGE`, and `MEDIAN` work the same way in Google Sheets.[^3] Sheets' `AVERAGE` ignores text cells.[^3]

## References: relative, absolute, mixed

"A reference identifies a cell or a range of cells on a worksheet."[^1] References are what make spreadsheets powerful:
change an input, and every formula that uses it updates.

The tricky part is what happens when you **copy** a formula.

**Relative references** (`A1`) move with the formula. "If you copy or fill the formula across rows or down columns, the
reference automatically adjusts."[^1] Copying `=A1` from B2 down to B3 gives `=A2`.[^1] That's usually what you want:
`=B2*C2` copied down becomes `=B3*C3`, `=B4*C4`, and so on.

**Absolute references** (`$A$1`) stay put. An absolute reference "always refers to a cell in a specific location", and
when copied "the absolute reference doesn't adjust."[^1] Use them for a single fixed input, like a tax rate in `F1`:

```
=B2*$F$1     copied down  →  =B3*$F$1,  =B4*$F$1, …
```

Without the dollar signs, the copies would point at `F2`, `F3`, … which are empty, giving wrong answers with no
error message. It's one of the most common spreadsheet bugs.

**Mixed references** lock only the row or only the column. A mixed reference "has either an absolute column and relative
row, or absolute row and relative column."[^1] `=A$1` copied from A2 to B3 becomes `=B$1`.[^1]

In Excel, press **F4** while editing a reference to switch between the types.[^2]

## Good habits

- Put **inputs** (rates, targets, thresholds) in their own labelled cells and reference them with `$`. Never type the same
  number into many formulas.
- Keep **raw data** on its own sheet and do calculations elsewhere, so you can always go back to the original.
- After copying a formula, **click a few copied cells** and check their references.

## Key points

- Formulas start with `=`. Functions like `SUM`, `AVERAGE`, and `MEDIAN` take ranges like `D2:D100`.
- **Relative** (`A1`) references move when copied. **Absolute** (`$A$1`) references don't.
- Use absolute references for fixed inputs like rates. Forgetting the `$` is a classic silent bug.
