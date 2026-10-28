---
id: sql-subqueries
title: Subqueries
summary: Use one query's result inside another, as a value, a list, a table, or a yes/no test.
minutes: 9
practice:
  - sql-above-average-price
  - sql-priciest-product
  - sql-returning-customers
  - sql-non-reviewers
  - sql-avg-orders-per-customer
  - sql-five-star-products
  - sql-above-category-average
sources:
  - id: 1
    title: "SQL Language Expressions (Subquery Expressions, IN, EXISTS)"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "9.24. Subquery Expressions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/functions-subquery.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which query finds products priced above the average?
    options:
      - "SELECT * FROM products WHERE price > AVG(price)"
      - "SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products)"
      - "SELECT * FROM products HAVING price > AVG(price)"
      - "SELECT AVG(price) FROM products WHERE price > price"
    answer: 1
    explanation: Aggregates can't be used directly in WHERE, but a subquery that calculates the average can.
  - question: Why might customer_id NOT IN (SELECT customer_id FROM t) return no rows at all?
    options:
      - Because t is empty
      - Because the subquery returns a NULL, which makes NOT IN unknown for every row
      - Because NOT IN only works with numbers
      - It always returns all rows
    answer: 1
    explanation: A single NULL in the list makes NOT IN return null (not true) for every value that isn't found.
  - question: What makes a subquery "correlated"?
    options:
      - It uses GROUP BY
      - It refers to a column of the outer query, so it's evaluated for each outer row
      - It appears after FROM
      - It returns only one row
    answer: 1
    explanation: A correlated subquery uses values from the outer row, like WHERE r.product_id = p.product_id.
---

## A query inside a query

A **subquery** is a `SELECT` in brackets, used inside another statement. It lets one query use the result of another,
without copying numbers by hand.

## 1. A single value (scalar subquery)

```sql
SELECT product_name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

"The value of a subquery expression is the first row of the result from the enclosed SELECT statement. The value of a subquery
expression is NULL if the enclosed SELECT statement returns no rows."[^1] Use this kind when the inner query returns one number,
like an average or a maximum.

## 2. A list (IN / NOT IN)

```sql
SELECT first_name, last_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders WHERE status = 'Returned');
```

Each customer appears once, even with several returns. That's a nice difference from a JOIN, which would repeat them.

**The NOT IN trap.** "If there are no equal right-hand values and at least one right-hand row yields null, the result of the
`NOT IN` construct will be null, not true."[^2] One NULL in the subquery's list makes `NOT IN` return **no rows at all**.
Protect yourself with `WHERE … IS NOT NULL` inside the subquery, or use `NOT EXISTS` / a LEFT JOIN anti-join instead.

## 3. A table (subquery in FROM)

When you need to aggregate **twice**, such as the average of per-customer counts, build the first result in `FROM`:

```sql
SELECT ROUND(AVG(order_count), 2)
FROM (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  GROUP BY customer_id
);
```

You can't write `AVG(COUNT(*))` directly, but you can average a column of counts.

## 4. A yes/no test (EXISTS)

"If executing the SELECT statement specified as the right-hand operand of the EXISTS operator would return one or more rows,
then the EXISTS operator evaluates to 1."[^1]

```sql
SELECT p.product_name
FROM products AS p
WHERE EXISTS (
  SELECT 1 FROM reviews AS r
  WHERE r.product_id = p.product_id AND r.rating = 5
);
```

## Correlated subqueries

The subquery above mentions `p.product_id`, a column from the **outer** query. "The subquery can refer to variables from the
surrounding query, which will act as constants during any one evaluation of the subquery."[^2] So it is evaluated again for
each product. That's what makes it **correlated**.

Correlated subqueries are handy for "compared with its own group" questions:

```sql
SELECT p.product_name, p.category, p.price
FROM products AS p
WHERE p.price > (SELECT AVG(p2.price) FROM products AS p2 WHERE p2.category = p.category);
```

Use a different alias (`p2`) for the inner copy of the table, so it's clear which one each column belongs to.

## Key takeaways

- A **subquery** is a query in brackets: a **value** (`> (SELECT AVG…)`), a **list** (`IN (SELECT…)`), a **table** (`FROM (SELECT…)`), or a **test** (`EXISTS (SELECT…)`).
- A NULL in a `NOT IN` list returns **no rows**, so filter NULLs out or use `NOT EXISTS`.
- Subqueries in `FROM` let you **aggregate twice**.
- A **correlated** subquery uses the outer row's values and runs once per row.
