---
id: sql-group-by
title: Summaries per Group with GROUP BY
summary: Turn "one total" into "one total per category, country, or status", the most common query in analytics.
minutes: 8
practice:
  - sql-orders-by-status
  - sql-products-per-category
  - sql-stock-by-category
  - sql-avg-price-by-category
  - sql-revenue-by-payment
  - sql-customers-per-country
  - sql-customers-per-city
sources:
  - id: 1
    title: "7.2. Table Expressions (7.2.3 The GROUP BY and HAVING Clauses), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-table-expressions.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "2.7. Aggregate Functions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-agg.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Quirks, Caveats, and Gotchas In SQLite (6. Aggregate Queries Can Contain Non-Aggregate Result Columns)"
    publisher: SQLite
    url: https://www.sqlite.org/quirks.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: SELECT status, COUNT(*) FROM orders GROUP BY status returns how many rows?
    options:
      - One row per order
      - One row per distinct status
      - Exactly one row
      - One row per customer
    answer: 1
    explanation: GROUP BY makes one group, and so one result row, for each different status.
  - question: You group by country and city. When are two customers in the same group?
    options:
      - When they have the same country
      - When they have the same city
      - When both the country and the city are the same
      - Never
    answer: 2
    explanation: With several GROUP BY columns, a group is each combination of values.
  - question: Why is SELECT category, product_name, COUNT(*) FROM products GROUP BY category a bad query?
    options:
      - COUNT(*) can't be used with GROUP BY
      - product_name isn't grouped or aggregated, so its value is arbitrary (and most databases reject the query)
      - category must come last
      - It's a perfectly good query
    answer: 1
    explanation: Every selected column should be in GROUP BY or inside an aggregate. SQLite allows it but picks an arbitrary value.
---

## From one total to many

In the *Aggregate Functions* lesson, each query returned **one** number for the whole table. Most real questions want a
number **per something**: orders per status, revenue per category, customers per country.

"The `GROUP BY` clause is used to group together those rows in a table that have the same values in all the columns listed."[^1]
The aggregate is then calculated **separately for each group**:

```sql
SELECT status, COUNT(*)
FROM orders
GROUP BY status;
```

| status | COUNT(*) |
|---|---|
| Cancelled | 30 |
| Delivered | 161 |
| Returned | 25 |
| Shipped | 34 |

The PostgreSQL tutorial describes this as "one output row per" group, where "each aggregate result is computed over the
table rows matching" that group.[^2]

## Any aggregate works

```sql
SELECT category,
       COUNT(*)                AS product_count,
       SUM(stock_quantity)     AS units_in_stock,
       ROUND(AVG(price), 2)    AS avg_price
FROM products
GROUP BY category;
```

## Grouping by several columns

Grouping by more than one column creates one group for each **combination** of values, since rows must have "the same values in
all the columns listed."[^1]

```sql
SELECT country, city, COUNT(*)
FROM customers
GROUP BY country, city;
```

## The golden rule

Every column in `SELECT` should either be **in `GROUP BY`** or **inside an aggregate function**. A query like this breaks
the rule:

```sql
SELECT category, product_name, COUNT(*)   -- which product_name? There are several per category!
FROM products
GROUP BY category;
```

"In most SQL implementations, output columns of an aggregate query may only reference aggregate functions or columns named in
the GROUP BY clause." But "SQLite does not enforce this restriction."[^3] It runs the query and picks a value from one of the
group's rows, so the result *looks* fine but is misleading. Follow the golden rule, and your queries will work in every database.

## Where GROUP BY goes

```sql
SELECT   payment_method, ROUND(SUM(total_amount), 2) AS revenue
FROM     orders
WHERE    status = 'Delivered'        -- filter rows first
GROUP BY payment_method              -- then group
ORDER BY revenue DESC;               -- then sort the groups
```

`WHERE` filters rows **before** grouping. To filter the groups themselves (for example "only categories with more than
6 products"), you need `HAVING`, which is the next lesson.

When you sort groups and some values are tied, add a second sort column as a **tie-breaker**
(`ORDER BY customer_count DESC, country`) so the order is always the same.

## Key takeaways

- `GROUP BY` creates **one group per distinct value** (or combination of values), and aggregates are calculated **per group**.
- Every selected column must be **grouped or aggregated**. SQLite won't stop you, but other databases will.
- Order: `SELECT … FROM … WHERE … GROUP BY … ORDER BY`.
- Add a **tie-breaker** when sorting groups that can be equal.
