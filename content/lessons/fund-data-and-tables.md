---
id: fund-data-and-tables
title: Data, Tables, and Data Types
summary: How data is organized in rows and columns, the main kinds of variables, and how databases store them.
minutes: 7
practice:
  - sql-meet-the-products
sources:
  - id: 1
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 1: Hello data"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/data-hello
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Tidy Data"
    author: Hadley Wickham
    publisher: Journal of Statistical Software, 59(10), 2014
    url: https://www.jstatsoft.org/article/view/v059i10
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Datatypes In SQLite"
    publisher: SQLite
    url: https://www.sqlite.org/datatype3.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "CREATE TABLE: The PRIMARY KEY"
    publisher: SQLite
    url: https://www.sqlite.org/lang_createtable.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: In a well-organized (tidy) table of products, what does one row represent?
    options:
      - One column of data
      - One product
      - All products in one category
      - The whole table
    answer: 1
    explanation: In tidy data, each row is one case (here, one product) and each column is one variable.
  - question: What kind of variable is a product's category, such as "Books" or "Beauty"?
    options:
      - Numerical, continuous
      - Numerical, discrete
      - Categorical
      - A primary key
    answer: 2
    explanation: The values are labels (categories), not numbers you can add or average.
  - question: Why does the products table have a product_id column?
    options:
      - To make the table bigger
      - So every product can be identified uniquely, even if two have similar names
      - Because SQL requires a column called id
      - To store the price
    answer: 1
    explanation: product_id is the primary key. Every row must have a different value, so it identifies each product exactly.
---

## Data in rows and columns

Most data an analyst works with is stored in **tables**: a grid of rows and columns, like a spreadsheet.

A well-organized table follows a simple rule. The free textbook *Introduction to Modern Statistics* describes it as:
"each row is a unique case (observational unit), each column is a variable, and each cell is a single value."[^1]
This layout is called **tidy data**. Hadley Wickham's influential paper puts it as
"each variable is a column, each observation is a row, and each type of observational unit is a table."[^2]

Here is part of the `products` table from the practice shop:

| product_id | product_name | category | price | stock_quantity |
|---|---|---|---|---|
| 1 | Wireless Earbuds | Electronics | 59.99 | 120 |
| 18 | SQL for Beginners | Books | 29.99 | 75 |
| 24 | Yoga Mat | Sports & Outdoors | 28.00 | 130 |

- Each **row** is one product (one *case*).
- Each **column** is one fact about products (one *variable*).
- Each **cell** holds a single value.

Notice that customers and orders live in **separate tables**. They are different kinds of things, so each gets its own table.

## Kinds of variables

Knowing what kind of variable you have tells you what you can do with it.

- **Numerical** variables are numbers you can meaningfully add, subtract, or average, such as `price` or `stock_quantity`.[^1]
  - *Discrete* values come in steps, such as counts: you can have 3 items in stock, but not 3.5.[^1]
  - *Continuous* values are measurements that don't move in fixed steps, such as a price. The textbook gives an unemployment rate as an example.[^1]
- **Categorical** variables are labels, such as `category` or `country`. Their possible values are called *levels*.[^1]
  - If the levels have a natural order (for example small, medium, large), the variable is *ordinal*.[^1]

A product ID is written with digits, but you would never average it, so treat it as a label, not a measurement.

## How a database stores types

Databases also give each column a type. SQLite, the database used in this app, stores every value as one of five
*storage classes*: `NULL` (a missing value), `INTEGER` (a whole number), `REAL` (a decimal number),
`TEXT` (a string), or `BLOB` (raw data, stored exactly as it was input).[^3]

SQLite has no special date type. Dates are often stored as text in the ISO 8601 format, `YYYY-MM-DD`.[^3]
The practice shop stores its dates this way, for example `2025-03-15`.

## Keys: telling rows apart

Two customers could share the same name, so how do you tell them apart? With a **primary key**: a column whose value
is different for every row. In SQLite, "each table … may have at most one PRIMARY KEY", and "each row in a table with a
primary key must have a unique combination of values in its primary key columns."[^4]

In the practice shop, `customer_id`, `product_id`, and `order_id` are primary keys. The `orders` table also has a
`customer_id` column that tells you *which* customer placed each order. That is how the tables connect.

## Key takeaways

- **Tidy data:** one row per case, one column per variable, one value per cell.
- **Numerical** variables can be measured and averaged; **categorical** variables are labels.
- SQLite stores values as **NULL, INTEGER, REAL, TEXT, or BLOB**, and dates as `YYYY-MM-DD` text.
- A **primary key** uniquely identifies each row.
