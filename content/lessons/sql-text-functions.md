---
id: sql-text-functions
title: Working with Text in SQL
summary: Join text, change case, take parts of strings, and clean up messy values.
minutes: 6
practice:
  - sql-full-names
  - sql-sku-codes
sources:
  - id: 1
    title: "SQL Language Expressions (Operators)"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-In Scalar SQL Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_corefunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: "What does first_name || ' ' || last_name produce for Maria Santos?"
    options:
      - "MariaSantos"
      - "Maria Santos"
      - "Maria || Santos"
      - An error
    answer: 1
    explanation: "|| joins text, and the ' ' in the middle adds the space."
  - question: What does SUBSTR('Electronics', 1, 3) return?
    options:
      - "Ele"
      - "lec"
      - "El"
      - "Electronics"
    answer: 0
    explanation: In SQL, the first character is position 1, and 3 is the length.
  - question: Which function finds where 'Set' appears inside a product name?
    options:
      - "LENGTH"
      - "REPLACE"
      - "INSTR"
      - "UPPER"
    answer: 2
    explanation: INSTR returns the position of the first match, or 0 if it isn't found.
---

## Joining text with ||

In SQLite, "the `||` operator is 'concatenate' - it joins together the two strings of its operands."[^1]

```sql
SELECT first_name || ' ' || last_name AS full_name
FROM customers;
```

Remember the `' '` for the space. Other databases use different syntax for the same job: MySQL uses a `CONCAT()` function,
and SQL Server uses `+`.

## Common text functions

| Function | What it does | Example | Result |
|---|---|---|---|
| `UPPER(x)` | converts letters to capitals[^2] | `UPPER('books')` | `BOOKS` |
| `LOWER(x)` | converts letters to lowercase[^2] | `LOWER('USA')` | `usa` |
| `LENGTH(x)` | "the number of Unicode codepoints"[^2] (characters) | `LENGTH('Yoga Mat')` | `8` |
| `SUBSTR(x, start, len)` | part of a text: begins at the start-th character and is len characters long[^2] | `SUBSTR('Electronics', 1, 3)` | `Ele` |
| `INSTR(x, y)` | position of the first `y` in `x`, "or 0 if Y is nowhere found"[^2] | `INSTR('Mug Set', 'Set')` | `5` |
| `REPLACE(x, y, z)` | replaces "every occurrence of string Y" with Z[^2] | `REPLACE('Air-Fryer', '-', ' ')` | `Air Fryer` |
| `TRIM(x)` | removes characters (spaces by default) from both ends[^2] | `TRIM('  Books ')` | `Books` |

**Positions start at 1 in SQL.** "The left-most character of X is number 1."[^2] That's different from Python, where the first
character is at position 0.

## Nesting functions

Functions can be combined. The inner one runs first:

```sql
SELECT product_name,
       UPPER(SUBSTR(category, 1, 3)) || '-' || product_id AS sku   -- e.g. ELE-1
FROM products;
```

## Text functions for cleaning

Real data often has inconsistent text: `'books'`, `'Books '`, `'BOOKS'`. Normalizing it before comparing or grouping
avoids splitting one category into three:

```sql
SELECT LOWER(TRIM(category)) AS clean_category, COUNT(*)
FROM products
GROUP BY clean_category;
```

The practice shop's data is already clean, but this pattern is everyday work in real projects. You'll practise cleaning
messy text in the Python Lab.

## Key takeaways

- `||` joins text in SQLite (other databases may use `CONCAT`).
- `UPPER`, `LOWER`, `LENGTH`, `SUBSTR`, `INSTR`, `REPLACE`, `TRIM` cover most text tasks.
- SQL text positions start at **1**.
- Use `LOWER(TRIM(...))` to make messy text consistent before grouping or comparing.
