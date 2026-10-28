---
id: sql-window-functions
title: "Window Functions: Ranking and Top N per Group"
summary: Calculate across related rows without collapsing them, and answer "top N in each group".
minutes: 9
practice:
  - sql-number-the-prices
  - sql-rank-in-category
  - sql-priciest-per-category
  - sql-top-two-per-category
  - sql-rank-vs-dense-rank
  - sql-boss-first-orders
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
  - id: 3
    title: "Window Functions"
    publisher: SQLite
    url: https://www.sqlite.org/windowfunctions.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What is the key difference between a window function and GROUP BY?
    options:
      - Window functions are faster
      - Window functions keep every row; GROUP BY collapses rows into one per group
      - GROUP BY can't use ORDER BY
      - There is no difference
    answer: 1
    explanation: Window functions add a calculated value to each row without merging rows.
  - question: Three customers tie for first place. What rank does the next customer get with RANK() and with DENSE_RANK()?
    options:
      - 4 and 2
      - 2 and 4
      - 2 and 2
      - 4 and 4
    answer: 0
    explanation: RANK leaves gaps (1, 1, 1, 4); DENSE_RANK doesn't (1, 1, 1, 2).
  - question: Why can't you write WHERE ROW_NUMBER() OVER (…) = 1?
    options:
      - ROW_NUMBER only works in ORDER BY
      - Window functions run after WHERE, so you must filter in an outer query or CTE
      - It works fine
      - Because ROW_NUMBER starts at 0
    answer: 1
    explanation: Calculate the ranking in a CTE or subquery first, then filter it.
---

## Calculating across rows without grouping

"A *window function* performs a calculation across a set of table rows that are somehow related to the current row."[^1]
Unlike `GROUP BY`, "window functions do not cause rows to become grouped into a single output row like non-window aggregate calls
would. Instead, the rows retain their separate identities."[^1]

You recognize them by `OVER`: they're "distinguished from scalar functions and aggregate functions by the presence of an OVER
clause."[^3] SQLite has supported them since version 3.25.0 (2018).[^3]

## Numbering and ranking

```sql
SELECT product_name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) AS price_rank
FROM products;
```

`ORDER BY` inside `OVER` sets the order used for the calculation. "The window `ORDER BY` does not even have to match the order in
which the rows are output."[^1] Add an outer `ORDER BY` if you want the results displayed sorted.

| Function | Meaning[^2] | Ties 10, 10, 10, 8 → |
|---|---|---|
| `ROW_NUMBER()` | "the number of the current row within its partition, counting from 1" | 1, 2, 3, 4 (arbitrary among ties) |
| `RANK()` | "the rank of the current row, with gaps" | 1, 1, 1, 4 |
| `DENSE_RANK()` | "the rank of the current row, without gaps" | 1, 1, 1, 2 |

## PARTITION BY: separate rankings per group

"The `PARTITION BY` clause within `OVER` divides the rows into groups, or partitions, that share the same values of the
`PARTITION BY` expression(s)."[^1] Each partition is calculated separately:

```sql
SELECT product_name, category, price,
       RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rank_in_category
FROM products;
```

Whenever a question says "**within each** category / customer / month", reach for `PARTITION BY`.

## Top N per group: rank, then filter

You might try `WHERE rank_in_category = 1`, but it fails. "Window functions are permitted only in the `SELECT` list and the
`ORDER BY` clause of the query. They are forbidden elsewhere, such as in `GROUP BY`, `HAVING` and `WHERE` clauses. This is because
they logically execute after the processing of those clauses."[^1] The fix is to rank first and filter afterwards, in a CTE or
"a sub-select."[^1]

```sql
WITH ranked AS (
  SELECT category, product_name, price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
SELECT category, product_name, price
FROM ranked
WHERE rn <= 2;          -- top 2 per category
```

The same pattern finds each customer's **first** order (`PARTITION BY customer_id ORDER BY order_date, order_id`, keep
`rn = 1`), with all of that order's details, not just its date.

## Window functions after GROUP BY

Window functions run after grouping, so they can rank by an aggregate:

```sql
SELECT customer_id, COUNT(*) AS order_count,
       DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS rank_no_gaps
FROM orders
GROUP BY customer_id;
```

## Key takeaways

- Window functions use `OVER (…)` and **keep every row**.
- `ROW_NUMBER` numbers rows; `RANK` leaves gaps after ties; `DENSE_RANK` doesn't.
- `PARTITION BY` restarts the calculation **within each group**.
- They run after `WHERE`, so **rank in a CTE, then filter** for top N per group.
