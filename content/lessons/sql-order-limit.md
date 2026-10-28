---
id: sql-order-limit
title: "Sorting and Limiting: ORDER BY and LIMIT"
summary: Put results in a useful order and answer "top N" questions.
minutes: 6
practice:
  - sql-price-ranking
  - sql-top-five
  - sql-boss-big-paypal-orders
sources:
  - id: 1
    title: "7.5. Sorting Rows (ORDER BY), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-order.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7.6. LIMIT and OFFSET, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-limit.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What order do rows come back in if you don't use ORDER BY?
    options:
      - Alphabetical
      - By primary key
      - An unspecified order
      - Newest first
    answer: 2
    explanation: Without ORDER BY there is no guaranteed order, even if the results look sorted.
  - question: Which query lists the 3 cheapest products, cheapest first?
    options:
      - "SELECT * FROM products LIMIT 3;"
      - "SELECT * FROM products ORDER BY price DESC LIMIT 3;"
      - "SELECT * FROM products ORDER BY price LIMIT 3;"
      - "SELECT * FROM products LIMIT 3 ORDER BY price;"
    answer: 2
    explanation: Sort ascending (the default) so the cheapest come first, then keep 3. LIMIT goes last.
  - question: What does DESC mean in ORDER BY price DESC?
    options:
      - Describe the column
      - Descending, largest first
      - Delete duplicate prices
      - Default sort order
    answer: 1
    explanation: DESC sorts from largest to smallest. ASC (smallest first) is the default.
---

## ORDER BY: sorting results

"If sorting is not chosen, the rows will be returned in an unspecified order."[^1] Results may *look* sorted sometimes,
but you cannot rely on it. When order matters, say so with `ORDER BY`, which goes after `WHERE`:

```sql
SELECT product_name, price
FROM products
ORDER BY price;          -- cheapest first
```

Each sort column "can be followed by an optional `ASC` or `DESC` keyword to set the sort direction to ascending or descending.
`ASC` order is the default."[^1]

```sql
ORDER BY price DESC      -- most expensive first
ORDER BY order_date DESC -- newest first (dates are YYYY-MM-DD)
ORDER BY product_name    -- A to Z
```

You can sort by several columns. The second is used only when the first one ties:

```sql
ORDER BY category, price DESC   -- categories A to Z, priciest first within each category
```

## LIMIT: only the first few rows

"If a limit count is given, no more than that many rows will be returned (but possibly fewer, if the query itself yields fewer rows)."[^2]

```sql
-- The 5 most expensive products
SELECT product_name, price
FROM products
ORDER BY price DESC
LIMIT 5;
```

## Always sort before you limit

`LIMIT` without `ORDER BY` gives you *some* rows, but not necessarily the ones you want. The documentation warns:
"When using `LIMIT`, it is important to use an `ORDER BY` clause that constrains the result rows into a unique order.
Otherwise you will get an unpredictable subset of the query's rows."[^2]

Also watch out for **ties**. If two products shared the fifth-highest price, which one makes the "top 5" would be arbitrary.
Adding a second sort column, such as `ORDER BY price DESC, product_name`, settles ties.

## The full order of a query

```sql
SELECT   columns          -- 3. which columns
FROM     table            -- 1. which table
WHERE    conditions       -- 2. which rows
ORDER BY columns          -- 4. sort
LIMIT    number;          -- 5. how many
```

The numbers show the order in which it helps to think through the query. You must still write the clauses in the order shown.

## Key takeaways

- Without `ORDER BY`, row order is **not guaranteed**.
- `ASC` (default) = smallest first; `DESC` = largest first.
- `LIMIT n` keeps at most **n rows**. Always **sort first** for "top N" questions.
