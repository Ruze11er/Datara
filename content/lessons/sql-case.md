---
id: sql-case
title: "If-Then Logic: CASE and COALESCE"
summary: Turn numbers into categories, count conditionally side by side, and replace missing values.
minutes: 8
practice:
  - sql-price-bands
  - sql-band-counts
  - sql-status-by-payment
  - sql-email-or-placeholder
sources:
  - id: 1
    title: "SQL Language Expressions (The CASE expression)"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "9.18. Conditional Expressions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/functions-conditional.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Built-In Scalar SQL Functions (coalesce, ifnull)"
    publisher: SQLite
    url: https://www.sqlite.org/lang_corefunc.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Built-in Aggregate Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_aggfunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: A product costs 20. What does CASE WHEN price < 50 THEN 'A' WHEN price < 25 THEN 'B' ELSE 'C' END return?
    options:
      - "A"
      - "B"
      - "C"
      - "NULL"
    answer: 0
    explanation: CASE returns the first WHEN that is true. 20 < 50 is checked first, so the answer is 'A'. Order your conditions carefully.
  - question: What does a CASE expression return when no WHEN is true and there is no ELSE?
    options:
      - "0"
      - An empty text
      - "NULL"
      - An error
    answer: 2
    explanation: Without ELSE, unmatched rows get NULL.
  - question: What does COALESCE(email, 'no email') return when email is NULL?
    options:
      - "NULL"
      - "'no email'"
      - An empty text
      - The previous row's email
    answer: 1
    explanation: COALESCE returns its first argument that isn't NULL.
---

## CASE: if-then-else inside a query

"A CASE expression serves a role similar to IF-THEN-ELSE in other programming languages."[^1] It produces a value for each
row, based on conditions:

```sql
SELECT product_name,
       price,
       CASE
         WHEN price < 25 THEN 'Budget'
         WHEN price < 75 THEN 'Mid-range'
         ELSE 'Premium'
       END AS price_band
FROM products;
```

- The `WHEN` conditions are checked **from top to bottom**, and the **first** true one wins. That's why the second line only
  needs `price < 75`.
- `ELSE` catches everything else. "If there is no ELSE expression and none of the WHEN expressions are true, then the overall
  result is NULL."[^1]
- Always finish with `END`, and usually give the result a name with `AS`.

There's also a short form for comparing one value against a list:

```sql
CASE status WHEN 'Delivered' THEN 'Done' WHEN 'Shipped' THEN 'On the way' ELSE 'Other' END
```

## Grouping by CASE

A `CASE` result can be grouped like any column, turning a number into buckets you can count:

```sql
SELECT CASE WHEN price < 25 THEN 'Budget' WHEN price < 75 THEN 'Mid-range' ELSE 'Premium' END AS price_band,
       COUNT(*)
FROM products
GROUP BY price_band;
```

## Conditional aggregation: counts side by side

Put `CASE` **inside** an aggregate to count or sum only certain rows, which lets you compare several categories in one row:

```sql
SELECT payment_method,
       SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM orders
GROUP BY payment_method;
```

Each row becomes 1 or 0, and `SUM` adds them up. With `COUNT` instead, leave out the `ELSE`: unmatched rows become NULL, and
`count(X)` counts only "the number of times that X is not NULL."[^4] (`COUNT(CASE … ELSE 0 END)` would count every row,
because 0 is not NULL.)

## COALESCE: a default for missing values

"The `COALESCE` function returns the first of its arguments that is not null. Null is returned only if all arguments are null.
It is often used to substitute a default value for null values when data is retrieved for display."[^2]

```sql
SELECT first_name, COALESCE(email, 'no email') AS contact
FROM customers;
```

SQLite also has `ifnull(X, Y)`, which "returns a copy of its first non-NULL argument, or NULL if both arguments are NULL."[^3]
`COALESCE` works in every major database, so prefer it.

**Think before replacing NULLs.** A missing rating is *unknown*, not 0. Replacing it with 0 in a calculation would drag
averages down. Use `COALESCE` for display labels, or where 0 truly is the right answer (like "number of orders").

## Key takeaways

- `CASE WHEN … THEN … ELSE … END` returns the value of the **first true** condition (NULL if none and no ELSE).
- **Group by** a CASE to create buckets; put CASE **inside SUM/COUNT** for side-by-side counts.
- `COALESCE(value, default)` replaces NULL. Only use it when the default makes sense.
