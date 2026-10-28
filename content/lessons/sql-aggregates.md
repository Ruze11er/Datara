---
id: sql-aggregates
title: "Aggregate Functions: COUNT, SUM, AVG, MIN, MAX"
summary: Summarize many rows into a single number. The heart of most business questions.
minutes: 8
practice:
  - sql-count-products
  - sql-delivered-revenue
  - sql-average-price
  - sql-price-range
  - sql-philippines-customers
  - sql-count-emails
  - sql-unique-buyers
sources:
  - id: 1
    title: "2.7. Aggregate Functions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-agg.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Aggregate Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_aggfunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Ten customers exist, but 2 have no email. What does SELECT COUNT(email) FROM customers return?
    options:
      - "10"
      - "8"
      - "2"
      - "NULL"
    answer: 1
    explanation: COUNT(column) counts only non-NULL values. COUNT(*) would return 10.
  - question: Which query returns total revenue from delivered orders?
    options:
      - "SELECT SUM(total_amount) FROM orders WHERE status = 'Delivered';"
      - "SELECT COUNT(total_amount) FROM orders WHERE status = 'Delivered';"
      - "SELECT SUM(total_amount) FROM orders;"
      - "SELECT total_amount FROM orders WHERE SUM(status) = 'Delivered';"
    answer: 0
    explanation: Filter with WHERE first, then SUM adds the remaining amounts.
  - question: Why can't you write WHERE SUM(total_amount) > 1000?
    options:
      - SUM only works on prices
      - WHERE runs before aggregates are calculated, so the sum doesn't exist yet
      - Because 1000 is too large
      - You can; it works fine
    answer: 1
    explanation: WHERE decides which rows go into the aggregate, so it runs first. (You'll learn HAVING for this later.)
---

## From many rows to one answer

Most business questions need a summary, not a list: *How many orders? What's our total revenue? What's the average price?*

"An aggregate function computes a single result from multiple input rows. For example, there are aggregates to compute the
`count`, `sum`, `avg` (average), `max` (maximum) and `min` (minimum) over a set of rows."[^1]

```sql
SELECT COUNT(*) FROM products;            -- how many products?
SELECT SUM(total_amount) FROM orders;     -- total of all orders
SELECT AVG(price) FROM products;          -- average price
SELECT MIN(price), MAX(price) FROM products;  -- cheapest and priciest
```

As the last line shows, you can calculate several aggregates at once. They all summarize the same rows.

## COUNT(*) vs COUNT(column)

This difference catches many beginners:

- "The count(\*) function (with no arguments) returns the total number of rows in the group."[^2]
- "The count(X) function returns a count of the number of times that X is not NULL in a group."[^2]

```sql
SELECT COUNT(*)     FROM customers;  -- every customer
SELECT COUNT(email) FROM customers;  -- only customers who have an email
```

## How other aggregates treat NULL

In SQLite, `AVG`, `SUM`, `MIN`, and `MAX` work with the **non-NULL** values:[^2]

- `avg()` "returns the average value of all non-NULL X within a group."
- `sum()` returns "the sum of all non-NULL values in the group."
- `min()` returns "the minimum non-NULL value of all values in the group."

So missing values are skipped, not treated as zero. That is usually what you want, but it is worth knowing.

## Counting unique values

You can put `DISTINCT` inside an aggregate. "Duplicate elements are filtered before being passed into the aggregate function.
For example, the function `count(distinct X)` will return the number of distinct values of column X."[^2]

```sql
SELECT COUNT(*)                    FROM orders;  -- number of orders
SELECT COUNT(DISTINCT customer_id) FROM orders;  -- number of different customers who ordered
```

## WHERE runs first

Combine aggregates with `WHERE` to summarize only some rows:

```sql
SELECT SUM(total_amount)
FROM orders
WHERE status = 'Delivered';
```

`WHERE` filters the rows **before** they are summarized. That's also why you **cannot** put an aggregate inside `WHERE`:
"the `WHERE` clause determines which rows will be included in the aggregate calculation; so obviously it has to be evaluated
before aggregate functions are computed."[^1] (To filter *on* a summary, you'll use `HAVING` in a later chapter.)

## Key takeaways

- **Aggregate functions** turn many rows into one value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- `COUNT(*)` counts **rows**; `COUNT(column)` counts **non-NULL values**.
- `COUNT(DISTINCT column)` counts **unique values**.
- `WHERE` runs **before** aggregation, so you can't use aggregates inside `WHERE`.
