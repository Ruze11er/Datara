---
id: sql-window-analytics
title: "Running Totals, Shares, and Period-over-Period Change"
summary: Use window functions for cumulative totals, percent of total, and comparing with the previous period.
minutes: 8
practice:
  - sql-running-total
  - sql-share-of-revenue
  - sql-previous-month
  - sql-month-over-month
sources:
  - id: 1
    title: "3.5. Window Functions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-window.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "9.22. Window Functions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/functions-window.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does SUM(revenue) OVER (ORDER BY month) produce?
    options:
      - The same total on every row
      - A running total from the first month up to each row
      - The revenue of the previous month
      - An error
    answer: 1
    explanation: With ORDER BY inside OVER, the window runs from the start up to the current row.
  - question: What does SUM(revenue) OVER () (empty brackets) produce?
    options:
      - A running total
      - The grand total of all rows, on every row
      - Zero
      - Only the first row's value
    answer: 1
    explanation: An empty OVER () makes the whole result the window. That's useful for percent-of-total.
  - question: Revenue went from 200 last month to 150 this month. What's the month-over-month growth?
    options:
      - "+25%"
      - "−25%"
      - "−33.3%"
      - "+33.3%"
    answer: 1
    explanation: (150 − 200) ÷ 200 × 100 = −25%. Always divide by the previous period.
---

## Aggregates as window functions

Ordinary aggregates like `SUM`, `AVG`, and `COUNT` become window functions when you add `OVER`. What they calculate depends
on the window.

## Running totals

"By default, if `ORDER BY` is supplied then the frame consists of all rows from the start of the partition up through the
current row, plus any following rows that are equal to the current row according to the `ORDER BY` clause."[^1]
In other words, `SUM … OVER (ORDER BY …)` gives a **running total**:

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', order_date) AS month, SUM(total_amount) AS revenue
  FROM orders
  WHERE status = 'Delivered'
  GROUP BY month
)
SELECT month,
       ROUND(revenue, 2) AS revenue,
       ROUND(SUM(revenue) OVER (ORDER BY month), 2) AS running_total
FROM monthly
ORDER BY month;
```

Note the "plus any following rows that are equal" part: if two rows had the same `ORDER BY` value, they'd be added together in
one step. Sort by something unique (like the month here) to get a clean running total.

## Percent of total

With **empty** brackets, the window is every row, so `SUM(revenue) OVER ()` puts the grand total next to each row:

```sql
SELECT category,
       revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS pct_of_total
FROM category_revenue;
```

Add `PARTITION BY` to get shares **within** a group, e.g. each product's share of its own category.

## Looking back and ahead: LAG and LEAD

`lag(value, offset, default)` "returns *value* evaluated at the row that is *offset* rows before the current row within the
partition; if there is no such row, instead returns *default*." If omitted, "*offset* defaults to 1 and *default* to
`NULL`."[^2] `lead` does the same looking forward.

```sql
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue
FROM monthly;
```

### Period-over-period growth

Growth compares this period with the previous one, **divided by the previous one**:

```sql
ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
            / LAG(revenue) OVER (ORDER BY month), 1) AS growth_pct
```

The first month has no previous value, so its growth is NULL, which is correct. Replacing it with 0 would claim "no change".

## Combine with CTEs

Window analytics usually come **after** an aggregation step: first build monthly (or per-category) totals in a CTE, then apply
the window function to those totals. Mixing the two levels in one step is a common source of confusion.

## Key takeaways

- `SUM(x) OVER (ORDER BY …)` = **running total**; `SUM(x) OVER ()` = **grand total on every row**.
- Percent of total: `100.0 * x / SUM(x) OVER ()`.
- `LAG` / `LEAD` fetch the previous / next row's value (NULL if there isn't one).
- Growth % = (current − previous) ÷ **previous** × 100.
- Aggregate to the right level in a CTE **first**, then apply window functions.
