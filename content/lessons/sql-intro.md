---
id: sql-intro
title: What Is SQL?
summary: Databases, tables, and the language analysts use to ask them questions. Plus a tour of the practice shop.
minutes: 6
practice:
  - sql-meet-the-products
sources:
  - id: 1
    title: "2.2. Concepts, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-concepts.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "About SQLite"
    publisher: SQLite
    url: https://www.sqlite.org/about.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "2.5. Querying a Table, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-select.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: In a relational database, data is stored in…
    options:
      - Paragraphs of text
      - Tables made of rows and columns
      - Images
      - One long list
    answer: 1
    explanation: A relation is essentially a table. Each table is a collection of rows with the same named columns.
  - question: If you don't ask for a specific order, which order will the rows come back in?
    options:
      - Always alphabetical
      - Always by ID
      - No guaranteed order
      - Newest first
    answer: 2
    explanation: SQL does not guarantee row order. You must sort explicitly (you'll learn ORDER BY soon).
  - question: Which table in the practice shop tells you which products were in each order?
    options:
      - customers
      - products
      - orders
      - order_items
    answer: 3
    explanation: order_items has one row per product in an order, linking order_id to product_id.
---

## Databases and tables

A **database** is an organized collection of data. Most business data lives in **relational databases**, which store data
in tables. The PostgreSQL documentation explains: "Relation is essentially a mathematical term for table."[^1]

The same page describes how tables work:[^1]

- "Each table is a named collection of rows."
- "Each row of a given table has the same set of named columns, and each column is of a specific data type."
- "SQL does not guarantee the order of the rows within the table in any way (although they can be explicitly sorted for display)."

That last point matters more than it seems: if you need rows in a particular order, you must ask for it.

## SQL: the language of databases

**SQL** (Structured Query Language, often pronounced "sequel") is how you ask a database for data. As the PostgreSQL tutorial
puts it: "To retrieve data from a table, the table is *queried*. An SQL `SELECT` statement is used to do this."[^3]
Every level in the SQL Lab is a `SELECT` query: it reads data and shows you the result.

```sql
SELECT product_name, price
FROM products;
```

This reads almost like English: *select the product name and price from the products table.*

In this app, SQL keywords are written in CAPITALS and table and column names in lowercase, so you can tell them apart easily.
A semicolon `;` marks the end of a query.

## The database in this app: SQLite

The SQL Lab runs on **SQLite**, which describes itself as "a self-contained, serverless, zero-configuration, transactional SQL
database engine" and "the most widely deployed database in the world."[^2] "Unlike most other SQL databases, SQLite does not
have a separate server process"[^2], which is why it can run entirely inside this app, offline.

The SQL you learn here works almost the same in other databases, such as PostgreSQL, MySQL, and SQL Server. When SQLite does
something differently, the lessons will point it out.

## Meet the practice shop

All SQL Lab levels use one fictional online shop with four tables:

| Table | One row is… | Useful columns |
|---|---|---|
| `customers` | a customer | `customer_id`, `first_name`, `last_name`, `email`, `city`, `country`, `signup_date` |
| `products` | a product | `product_id`, `product_name`, `category`, `price`, `cost`, `stock_quantity` |
| `orders` | an order | `order_id`, `customer_id`, `order_date`, `status`, `payment_method`, `total_amount` |
| `order_items` | one product in an order | `order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price` |

The tables connect through their IDs: an order belongs to a customer (`orders.customer_id`), and each order item points to an
order and a product. You will use these connections later, when you learn JOINs.

You can explore every table in the SQL Lab: open a level and click **Preview** next to a table name.

## Key takeaways

- Relational databases store data in **tables** of rows and named, typed columns.
- **SQL** is the language for asking databases questions; a request is a **query**.
- Rows have **no guaranteed order** unless you sort them.
- This app uses **SQLite**, which runs inside the app, so everything works offline.
