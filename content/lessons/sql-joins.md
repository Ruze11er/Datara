---
id: sql-joins
title: Combining Tables with JOIN
summary: Connect customers, orders, and products through their keys to answer questions no single table can.
minutes: 9
practice:
  - sql-whats-in-order-1001
  - sql-orders-with-names
  - sql-canada-orders
  - sql-orders-per-country
  - sql-units-by-product
  - sql-top-products-units
  - sql-revenue-by-category
  - sql-delivered-category-revenue
  - sql-davao-purchases
  - sql-boss-best-sellers
sources:
  - id: 1
    title: "2.6. Joins Between Tables, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-join.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7.2. Table Expressions (7.2.1 The FROM Clause), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-table-expressions.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which condition correctly joins orders to customers?
    options:
      - "ON orders.order_id = customers.customer_id"
      - "ON orders.customer_id = customers.customer_id"
      - "ON orders.status = customers.country"
      - No condition is needed
    answer: 1
    explanation: Join on the key that links the tables. orders.customer_id points to customers.customer_id.
  - question: A customer has 3 orders. How many rows does that customer appear in after JOINing customers to orders?
    options:
      - "1"
      - "3"
      - "0"
      - It depends on the number of products
    answer: 1
    explanation: An inner join produces one row for every matching pair, so one per order.
  - question: What happens to a customer with no orders in an inner JOIN between customers and orders?
    options:
      - They appear with NULL order values
      - They are left out of the result
      - They cause an error
      - They appear twice
    answer: 1
    explanation: An inner join keeps only rows that match. To keep unmatched rows, use LEFT JOIN (next lesson).
---

## Why join?

Good databases store each kind of thing in its own table: customers in `customers`, orders in `orders`, and so on.
That avoids repeating data, but it means many questions need **several tables at once**. "Which country orders the most?"
needs orders (to count) *and* customers (for the country).

"Queries that access multiple tables (or multiple instances of the same table) at one time are called *join* queries."[^1]

## Keys connect the tables

| Table | Key | Points to |
|---|---|---|
| `orders` | `customer_id` | `customers.customer_id` |
| `order_items` | `order_id` | `orders.order_id` |
| `order_items` | `product_id` | `products.product_id` |
| `reviews` | `product_id`, `customer_id` | `products`, `customers` |

A column that points to another table's primary key is called a **foreign key**. Joins almost always match a foreign key to
the primary key it points to.

## INNER JOIN

```sql
SELECT o.order_id, o.order_date, c.first_name, c.last_name
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.customer_id;
```

For an inner join, "for each row R1 of T1, the joined table has a row for each row in T2 that satisfies the join condition
with R1."[^2] In plain words: every order is paired with its customer, and you can use columns from both.

`JOIN` on its own means `INNER JOIN`: "`INNER` is the default."[^2]

Two consequences to remember:

- Rows **without a match are dropped**. A customer with no orders disappears from the result.
- Rows **multiply**. A customer with 3 orders appears in 3 rows. Keep this in mind when you count.

## Table aliases

"A temporary name can be given to tables … This is called a *table alias*."[^2] `orders AS o` lets you write `o.order_id`
instead of `orders.order_id`. Prefix every column with its table's alias in a join. "It is widely considered good style to
qualify all column names in a join query, so that the query won't fail if a duplicate column name is later added to one of the
tables."[^1]

## Joining more than two tables

Add one `JOIN … ON` per table, following the keys:

```sql
SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM order_items AS oi
JOIN orders   AS o ON oi.order_id   = o.order_id
JOIN products AS p ON oi.product_id = p.product_id
WHERE o.status = 'Delivered'
GROUP BY p.category
ORDER BY revenue DESC;
```

**Tip:** before writing a long join, trace the path on paper, e.g. *customers → orders → order_items → products*.
Each arrow is one `JOIN`, and each arrow's key goes in its `ON`.

## Joins + everything else

After the joins, the result behaves like one big table: you can filter it with `WHERE`, group it with `GROUP BY`, sort and
limit it as usual.

## Key takeaways

- A **join** combines rows from several tables; `ON` says which rows belong together, usually **foreign key = primary key**.
- `JOIN` = `INNER JOIN`: keeps **only matching** rows, and rows **multiply** when there are several matches.
- Use **table aliases** and prefix every column with them.
- Chain joins by following the keys; then filter, group, and sort as usual.
