---
id: sql-and-or
title: "Combining Conditions: AND, OR, NOT, IN, BETWEEN"
summary: Ask more precise questions by combining conditions and checking lists and ranges.
minutes: 8
practice:
  - sql-budget-electronics
  - sql-books-or-toys
  - sql-customers-abroad
  - sql-mid-range-prices
  - sql-march-orders
sources:
  - id: 1
    title: "2.5. Querying a Table, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-select.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "9.2. Comparison Functions and Operators, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/functions-comparison.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "SQL Language Expressions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: You want products that are in the Beauty category AND cost under 20. Which keyword joins the two conditions?
    options:
      - OR
      - AND
      - IN
      - NOT
    answer: 1
    explanation: Both conditions must be true, so use AND.
  - question: Does price BETWEEN 20 AND 40 include a product priced exactly 40?
    options:
      - Yes, BETWEEN includes both ends
      - No, it excludes both ends
      - Only if the price is a whole number
      - Only the lower end is included
    answer: 0
    explanation: BETWEEN is the same as price >= 20 AND price <= 40.
  - question: What does country = 'UK' OR country = 'Canada' AND price > 50 really mean?
    options:
      - (country = 'UK' OR country = 'Canada') AND price > 50
      - country = 'UK' OR (country = 'Canada' AND price > 50)
      - It causes an error
      - Both conditions are ignored
    answer: 1
    explanation: AND is evaluated before OR. Add brackets to say what you mean.
---

## AND: every condition must be true

"The usual Boolean operators (`AND`, `OR`, and `NOT`) are allowed in the qualification"[^1], meaning in the `WHERE` clause.

```sql
-- Electronics that cost less than 50
SELECT product_name, price
FROM products
WHERE category = 'Electronics' AND price < 50;
```

A row is kept only if **both** conditions are true.

## OR: at least one condition must be true

```sql
-- Books or toys
SELECT product_name, category
FROM products
WHERE category = 'Books' OR category = 'Toys & Games';
```

A common mistake is writing `AND` here. No product can be in two categories at once, so `AND` would return nothing.

## NOT: the opposite

`NOT` flips a condition: `WHERE NOT category = 'Books'` keeps every product that is not a book.
You'll most often see it as `NOT IN`, `NOT LIKE`, or `IS NOT NULL`.

## Careful when mixing AND and OR

In SQLite's operator precedence table, `AND` sits above `OR`, so **AND is evaluated first**.[^3] This query:

```sql
WHERE country = 'UK' OR country = 'Canada' AND signup_date >= '2025-01-01'
```

means *UK customers (any signup date) or Canadian customers who signed up in 2025*. That's probably not what you meant.
Use brackets to make it clear:

```sql
WHERE (country = 'UK' OR country = 'Canada') AND signup_date >= '2025-01-01'
```

**Tip:** whenever you mix `AND` and `OR`, add brackets.

## IN: matching a list

Instead of many `OR`s, use `IN` with a list in brackets. In SQLite, "the IN and NOT IN operators take an expression on the left
and a list of values or a subquery on the right."[^3]

```sql
WHERE country IN ('Canada', 'UK', 'Australia')       -- any of these
WHERE country NOT IN ('USA', 'Philippines')           -- anything else
```

## BETWEEN: matching a range

"`a BETWEEN x AND y` is equivalent to `a >= x AND a <= y`", and "`BETWEEN` treats the endpoint values as included in the range."[^2]

```sql
WHERE price BETWEEN 20 AND 40                          -- 20 and 40 included
WHERE order_date BETWEEN '2025-03-01' AND '2025-03-31' -- all of March
```

BETWEEN works with dates too, because the shop's dates are stored as `YYYY-MM-DD` text.

## Key takeaways

- `AND`: **all** conditions true. `OR`: **at least one** true. `NOT`: the **opposite**.
- `AND` is evaluated **before** `OR`, so **use brackets** when you mix them.
- `IN (...)` matches any value in a list; `NOT IN (...)` matches everything else.
- `BETWEEN low AND high` **includes both ends**.
