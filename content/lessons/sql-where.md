---
id: sql-where
title: Filtering Rows with WHERE
summary: Keep only the rows you need using conditions on numbers, text, and dates.
minutes: 6
practice:
  - sql-books-only
  - sql-premium-products
  - sql-out-of-stock
  - sql-boss-restock-categories
sources:
  - id: 1
    title: "2.5. Querying a Table, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-select.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "SQL Language Expressions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which condition finds products that cost 50 or less?
    options:
      - "WHERE price < 50"
      - "WHERE price <= 50"
      - "WHERE price => 50"
      - "WHERE price = 50"
    answer: 1
    explanation: <= means "less than or equal to", so a product costing exactly 50 is included.
  - question: Why does WHERE category = Books (without quotes) cause an error?
    options:
      - Books is too long
      - Without quotes, SQL thinks Books is a column name
      - WHERE cannot be used with text
      - Categories must be numbers
    answer: 1
    explanation: Text values go in single quotes. Without them, SQL looks for a column called Books.
  - question: Which order of clauses is correct?
    options:
      - "SELECT … WHERE … FROM …"
      - "FROM … SELECT … WHERE …"
      - "SELECT … FROM … WHERE …"
      - "WHERE … SELECT … FROM …"
    answer: 2
    explanation: WHERE comes after FROM.
---

## Keeping only the rows you need

So far your queries returned every row. Usually you only want some of them: *products in one category, orders from last month,
customers in one country.*

The PostgreSQL tutorial explains that a query can be "qualified" by adding a `WHERE` clause "that specifies which rows are wanted."[^1]
`WHERE` comes after `FROM`:

```sql
SELECT product_name, price
FROM products
WHERE price > 100;
```

The database checks the condition for each row and keeps only the rows where it is **true**.

## Comparison operators

| Operator | Meaning | Example |
|---|---|---|
| `=` | equal to | `category = 'Books'` |
| `<>` or `!=` | not equal to | `status <> 'Cancelled'` |
| `>` | greater than | `price > 100` |
| `<` | less than | `stock_quantity < 20` |
| `>=` | greater than or equal to | `price >= 20` |
| `<=` | less than or equal to | `price <= 40` |

## Text values need quotes

In SQL, "a string constant is formed by enclosing the string in single quotes."[^2]

```sql
SELECT * FROM products WHERE category = 'Books';   -- correct
SELECT * FROM products WHERE category = Books;     -- error: no such column: Books
```

Without quotes, SQL thinks `Books` is the name of a column. Numbers are written **without** quotes: `price > 100`.

The text must also match exactly. In the practice database, `'books'` does not match `'Books'`. Try it in the SQL Lab and see!
If a text value itself contains a quote, double it: `'Children''s Books'`.[^2]

## Dates

The practice shop stores dates as text in the `YYYY-MM-DD` format, so you compare them like text, in quotes:

```sql
SELECT order_id, order_date
FROM orders
WHERE order_date >= '2025-12-01';
```

This works because the year comes first, then the month, then the day, so dates written this way sort in calendar order.

## Key takeaways

- `WHERE` keeps only rows where the condition is **true**. It goes **after `FROM`**.
- Use `=`, `<>`, `>`, `<`, `>=`, `<=` to compare values.
- Text and dates go in **single quotes** and must match exactly. Numbers don't use quotes.
