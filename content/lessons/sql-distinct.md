---
id: sql-distinct
title: Unique Values with DISTINCT
summary: Remove duplicate rows to see which different values a column contains.
minutes: 4
practice:
  - sql-product-categories
  - sql-customer-cities
sources:
  - id: 1
    title: "7.3. Select Lists (7.3.3 DISTINCT), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-select-lists.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: The products table has 40 rows but only 6 categories. How many rows does SELECT DISTINCT category FROM products return?
    options:
      - "40"
      - "6"
      - "1"
      - "46"
    answer: 1
    explanation: DISTINCT keeps one row for each different category.
  - question: With SELECT DISTINCT city, country, when are two rows treated as duplicates?
    options:
      - When the city matches
      - When the country matches
      - When both the city and the country match
      - Never
    answer: 2
    explanation: Rows are distinct if they differ in at least one selected column, so duplicates must match in all of them.
  - question: Where is the DISTINCT keyword written?
    options:
      - At the end of the query
      - Directly after SELECT
      - After FROM
      - After the table name
    answer: 1
    explanation: You write SELECT DISTINCT, followed by the columns.
---

## Removing duplicates

Some questions are about *which values exist*, not how many rows there are. For example: *what categories do we sell?*

```sql
SELECT category FROM products;
```

This returns 40 rows, one per product, with categories repeated many times. Add `DISTINCT`:

```sql
SELECT DISTINCT category FROM products;
```

Now each category appears once: Electronics, Home & Kitchen, Books, Sports & Outdoors, Beauty, and Toys & Games.

The PostgreSQL documentation describes it like this: "After the select list has been processed, the result table can optionally be
subject to the elimination of duplicate rows. The `DISTINCT` key word is written directly after `SELECT` to specify this."[^1]

## DISTINCT with several columns

`DISTINCT` looks at the **whole row** you selected, not just the first column:
"two rows are considered distinct if they differ in at least one column value."[^1]

```sql
SELECT DISTINCT city, country FROM customers;
```

This gives each city and country pair once. If two cities had the same name in different countries, both pairs would appear.

The same page notes that "null values are considered equal in this comparison"[^1], so missing values are grouped together as one value.

## A preview: counting unique values

Later you'll combine `DISTINCT` with counting to answer questions like *how many different customers placed an order?*:
`COUNT(DISTINCT customer_id)`. See the *Aggregate Functions* lesson.

## Key takeaways

- `SELECT DISTINCT` **removes duplicate rows** from the result.
- With several columns, rows are duplicates only if **every selected column matches**.
- Use it to answer "**which different values** are there?"
