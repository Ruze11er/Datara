---
id: sql-calculations
title: Calculated Columns and ROUND
summary: Create new columns with arithmetic, round results, and avoid the integer-division trap.
minutes: 6
practice:
  - sql-product-profit
  - sql-average-order-value
  - sql-boss-inventory-value
sources:
  - id: 1
    title: "2.5. Querying a Table, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-select.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-In Scalar SQL Functions (round)"
    publisher: SQLite
    url: https://www.sqlite.org/lang_corefunc.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "SQL Language Expressions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Built-in Aggregate Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_aggfunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which query shows each product's profit per unit?
    options:
      - "SELECT product_name, price - cost AS profit FROM products;"
      - "SELECT product_name, profit FROM products;"
      - "SELECT product_name, SUM(price, cost) FROM products;"
      - "SELECT product_name FROM products WHERE price - cost;"
    answer: 0
    explanation: You can do arithmetic in SELECT and name the result with AS. There is no profit column in the table.
  - question: What does ROUND(12.3456, 2) return?
    options:
      - "12"
      - "12.34"
      - "12.35"
      - "12.3456"
    answer: 2
    explanation: It rounds to 2 digits after the decimal point.
  - question: In SQLite, what does SELECT 7 / 2 return?
    options:
      - "3.5"
      - "3"
      - "4"
      - An error
    answer: 1
    explanation: Dividing two integers gives an integer, truncated toward zero. Write 7.0 / 2 to get 3.5.
---

## Doing maths in SELECT

You are not limited to columns that already exist. "You can write expressions, not just simple column references, in the select list."[^1]

```sql
SELECT product_name,
       price - cost AS profit
FROM products;
```

`price - cost` is calculated for each row, giving a new column. Use `+`, `-`, `*` (multiply), and `/` (divide).
Always name a calculated column with `AS`. Otherwise the column is labelled with the whole formula.

More examples from the shop:

```sql
SELECT product_name, price * stock_quantity AS stock_value FROM products;
SELECT product_name, price * 0.9 AS sale_price FROM products;   -- 10% off
```

## Calculations inside aggregates

You can calculate first and then summarize: each row's value is worked out, then added up.

```sql
SELECT SUM(price * stock_quantity) AS total_stock_value
FROM products;
```

## ROUND: tidy numbers

Calculations often produce long decimals like `31.490000000000002`. That isn't a mistake: computers store most
decimal numbers approximately. Use `ROUND`: "The round(X,Y) function returns a floating-point value X rounded to Y digits to
the right of the decimal point. If the Y argument is omitted or negative, it is taken to be 0."[^2]

```sql
SELECT ROUND(AVG(total_amount), 2) AS average_order_value
FROM orders
WHERE status = 'Delivered';
```

Functions can be **nested**: `AVG` runs first, then `ROUND` rounds its result. Round at the **end** of a calculation, not in the
middle, so small rounding errors don't add up.

## The integer-division trap

In SQLite, dividing one whole number by another gives a whole number: "Integer divide yields an integer result, truncated toward
zero."[^3] So `SELECT 7 / 2` returns `3`, not `3.5`.

Other arithmetic switches to decimals when "either operand is a real value"[^3], so make one side a decimal:

```sql
SELECT 7 / 2;      -- 3
SELECT 7.0 / 2;    -- 3.5
SELECT 7 * 1.0 / 2;  -- 3.5
```

This matters when calculating percentages, such as cancelled orders ÷ all orders. `AVG`, however, is safe: "the result of avg()
is always a floating point value whenever there is at least one non-NULL input even if all inputs are integers."[^4]

## Key takeaways

- Write **expressions** in `SELECT` to create calculated columns, and name them with `AS`.
- You can **calculate inside aggregates**, e.g. `SUM(price * stock_quantity)`.
- `ROUND(value, 2)` rounds to 2 decimals. **Round at the end.**
- In SQLite, **integer ÷ integer = integer**. Use `7.0 / 2` to keep decimals.
