---
id: sql-left-join
title: "LEFT JOIN: Keeping Unmatched Rows"
summary: Include rows with no match, find what's missing, and avoid the counting traps that break real reports.
minutes: 9
practice:
  - sql-all-customers-orders
  - sql-customers-without-orders
  - sql-unreviewed-products
  - sql-order-count-all-customers
  - sql-reviews-per-product
  - sql-average-rating-per-product
  - sql-cancelled-per-customer
  - sql-never-cancelled
  - sql-boss-category-scorecard
sources:
  - id: 1
    title: "2.6. Joins Between Tables, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-join.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7.2. Table Expressions (7.2.1.1 Joined Tables), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-table-expressions.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Built-in Aggregate Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_aggfunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: After customers LEFT JOIN orders, what is COUNT(*) for a customer with no orders?
    options:
      - "0"
      - "1"
      - "NULL"
      - An error
    answer: 1
    explanation: The customer still has one row (with NULL order columns), so COUNT(*) is 1. Use COUNT(o.order_id) to get 0.
  - question: How do you find customers who never placed an order?
    options:
      - "JOIN orders … WHERE o.order_id IS NULL"
      - "LEFT JOIN orders … WHERE o.order_id IS NULL"
      - "LEFT JOIN orders … WHERE o.order_id = 0"
      - "LEFT JOIN orders … WHERE o.order_id IS NOT NULL"
    answer: 1
    explanation: LEFT JOIN keeps unmatched customers with NULLs, and IS NULL keeps exactly those.
  - question: In a LEFT JOIN, what happens if you put the condition o.status = 'Cancelled' in WHERE instead of ON?
    options:
      - Nothing changes
      - Customers without a cancelled order disappear from the result
      - It causes an error
      - All orders are counted as cancelled
    answer: 1
    explanation: WHERE runs after the join and throws away the NULL rows, turning the LEFT JOIN into an inner join.
---

## Keeping every row from the left table

An inner join drops rows that have no match. Often that's exactly wrong: a report of "orders per customer" that leaves out
customers with zero orders hides the most interesting people.

A **left join** fixes this. "The table mentioned on the left of the join operator will have each of its rows in the output at
least once, whereas the table on the right will only have those rows output that match some row of the left table. When
outputting a left-table row for which there is no right-table match, empty (null) values are substituted for the right-table
columns."[^1]

```sql
SELECT c.customer_id, c.first_name, o.order_id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id;
```

Customers with orders appear once per order; customers without orders appear **once**, with `NULL` in `order_id`.
The table you want to keep completely goes **on the left**, right after `FROM`.

## Finding what's missing

Because unmatched rows get `NULL`s, you can keep **only** them:

```sql
SELECT c.customer_id, c.first_name, c.last_name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;           -- customers with no orders at all
```

This pattern (`LEFT JOIN` + `IS NULL` on the right table's key) answers every "who/what has never…?" question:
products never reviewed, customers who never ordered, and so on.

## Trap 1: counting after a LEFT JOIN

A customer with no orders still has one row, so `COUNT(*)` counts it as 1. `count(X)` "returns a count of the number of
times that X is not NULL"[^3], so count a column from the **right** table instead:

```sql
SELECT c.customer_id, COUNT(o.order_id) AS order_count   -- 0 for customers without orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
GROUP BY c.customer_id;
```

Similarly, `AVG` of a group with no values is `NULL`, not 0. "The result of avg() is NULL if there are no non-NULL
inputs."[^3] That's correct: an unrated product has no average, not a terrible one.

## Trap 2: ON vs WHERE

To count only **cancelled** orders per customer (keeping everyone), the status condition must go in `ON`:

```sql
SELECT c.customer_id, COUNT(o.order_id) AS cancelled_orders
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id AND o.status = 'Cancelled'
GROUP BY c.customer_id;
```

The PostgreSQL documentation explains why: "a restriction placed in the `ON` clause is processed *before* the join, while a
restriction placed in the `WHERE` clause is processed *after* the join. That does not matter with inner joins, but it matters a
lot with outer joins."[^2] In `WHERE`, the condition removes the NULL rows, so customers without cancellations vanish.

## Trap 3: fan-out (rows multiplying)

Joining a product to its reviews gives one row **per review**. Counting products after that join counts review rows instead.
Use `COUNT(DISTINCT p.product_id)` when you need each product once.

## Key takeaways

- `LEFT JOIN` keeps **every row of the left table**; unmatched right-side columns become **NULL**.
- `LEFT JOIN … WHERE right.key IS NULL` finds rows with **no match**.
- After a LEFT JOIN, count a **right-table column**, not `*`. `AVG` of nothing is **NULL**.
- Conditions on the right table go in **ON** if you want to keep unmatched rows.
- Joins can **multiply rows**; use `COUNT(DISTINCT …)` when needed.
