---
id: sql-select
title: Choosing Columns with SELECT
summary: Your first queries. Pick a table, choose columns, and give them clearer names.
minutes: 6
practice:
  - sql-meet-the-products
  - sql-names-and-prices
  - sql-customer-contacts
  - sql-friendly-names
sources:
  - id: 1
    title: "2.5. Querying a Table, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-select.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7.3. Select Lists, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-select-lists.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which query returns only the email column from the customers table?
    options:
      - "SELECT * FROM customers;"
      - "SELECT email FROM customers;"
      - "SELECT customers FROM email;"
      - "FROM customers SELECT email;"
    answer: 1
    explanation: SELECT lists the columns you want, and FROM names the table they come from.
  - question: What does SELECT * mean?
    options:
      - Select the first column
      - Select all columns
      - Select all tables
      - Select rows that contain a star
    answer: 1
    explanation: The * is shorthand for every column in the table.
  - question: What does AS do in SELECT price AS price_usd?
    options:
      - It changes the column name in the table permanently
      - It converts the price to US dollars
      - It names the column price_usd in the result only
      - It creates a new table
    answer: 2
    explanation: AS relabels the output column. The table itself is not changed.
---

## The shape of a query

The PostgreSQL tutorial explains that a `SELECT` statement "is divided into a select list (the part that lists the columns to be
returned), a table list (the part that lists the tables from which to retrieve the data), and an optional qualification (the part
that specifies any restrictions)."[^1]

For now we only need the first two parts:

```sql
SELECT product_name, price   -- the select list: which columns
FROM products;               -- the table list: which table
```

Text after `--` is a **comment**. SQL ignores it, so you can use comments to leave notes for yourself.

## All columns, or just some

"The select list determines which *columns* … are actually output."[^2] The shortest select list is `*`,
which "emits all columns."[^2]

```sql
SELECT * FROM products;            -- every column
SELECT product_name FROM products;  -- one column
SELECT product_name, category, price FROM products;  -- three columns, in this order
```

`SELECT *` is handy for a quick look at a table. In real reports, list the columns you need: the result is easier to read,
and the query won't change behaviour if someone adds a column to the table later.

## Renaming result columns with AS

Column names in a database are often short or technical. `AS` gives a column a clearer name in your result:

```sql
SELECT product_name AS product,
       price AS price_usd
FROM products;
```

The tutorial calls this using "the `AS` clause … to relabel the output column", and notes that "the `AS` clause is optional."[^1]
The renamed column is called an **alias**. Only the result changes, never the table.

Aliases become essential once you calculate new columns, which you'll do in the *Calculated Columns* lesson.

## Key takeaways

- `SELECT` chooses **columns**; `FROM` chooses the **table**.
- `*` means **all columns**. List specific columns for cleaner results.
- `AS` gives a result column a **new name (alias)** without changing the table.
- `--` starts a **comment**.
