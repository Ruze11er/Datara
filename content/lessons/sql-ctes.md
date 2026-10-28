---
id: sql-ctes
title: "Readable Queries with WITH (CTEs)"
summary: Name intermediate results and build complex analyses step by step.
minutes: 7
practice:
  - sql-busier-than-average
  - sql-cte-top-spenders
  - sql-boss-customer-segments
sources:
  - id: 1
    title: "7.8. WITH Queries (Common Table Expressions), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-with.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: How long does a CTE defined with WITH exist?
    options:
      - Until you delete it
      - Only for the one query it belongs to
      - Until the app restarts
      - Forever, like a table
    answer: 1
    explanation: A CTE is a temporary, named result that exists just for one query.
  - question: How do you define two CTEs in one query?
    options:
      - "WITH a AS (…) WITH b AS (…) SELECT …"
      - "WITH a AS (…), b AS (…) SELECT …"
      - "WITH a, b AS (…) SELECT …"
      - You can only have one
    answer: 1
    explanation: Write WITH once and separate the CTEs with commas. Later CTEs can use earlier ones.
  - question: What is the main benefit of a CTE over a nested subquery?
    options:
      - It is always faster
      - It breaks a complicated query into named, readable steps that can be reused
      - It stores data permanently
      - It allows UPDATE statements
    answer: 1
    explanation: Readability and reuse. You can refer to a CTE several times by name.
---

## Naming a step

Subqueries nested inside subqueries quickly become hard to read. `WITH` lets you pull a step out, give it a name, and use it
like a table.

"`WITH` provides a way to write auxiliary statements for use in a larger query. These statements, which are often referred to as
Common Table Expressions or CTEs, can be thought of as defining temporary tables that exist just for one query."[^1]

```sql
WITH counts AS (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id, order_count
FROM counts
WHERE order_count > (SELECT AVG(order_count) FROM counts);
```

`counts` is calculated once and used **twice**: once for the list of customers and once for the average.

## Why CTEs help

"The basic value of `SELECT` in `WITH` is to break down complicated queries into simpler parts."[^1]
Read the query above from top to bottom, and it tells a story:

1. *First,* count orders per customer.
2. *Then,* keep customers above the average count.

You can check each step on its own: run just the CTE's `SELECT` to see what it produces before building on it.

## Several steps

Define several CTEs separated by commas. Each one can use the ones before it:

```sql
WITH spend AS (
  SELECT customer_id, SUM(total_amount) AS total
  FROM orders
  WHERE status = 'Delivered'
  GROUP BY customer_id
),
segments AS (
  SELECT c.customer_id,
         CASE
           WHEN s.total IS NULL THEN 'New'
           WHEN s.total >= 700  THEN 'VIP'
           WHEN s.total >= 300  THEN 'Regular'
           ELSE 'Occasional'
         END AS segment
  FROM customers AS c
  LEFT JOIN spend AS s ON s.customer_id = c.customer_id
)
SELECT segment, COUNT(*) AS customers
FROM segments
GROUP BY segment
ORDER BY customers DESC;
```

## CTEs, subqueries, or joins?

They can often answer the same question. A practical guide:

- **One small value** (an average, a maximum): a scalar subquery is fine.
- **A multi-step analysis**, or a result you need **more than once**: use a CTE.
- **Combining stored tables**: use joins. CTEs can be joined too.

## Key takeaways

- `WITH name AS (SELECT …)` creates a **temporary named result** for one query.
- Separate several CTEs with **commas**; later ones can use earlier ones.
- CTEs make complex queries **readable, reusable, and easy to check step by step**.
