---
id: sql-business-patterns
title: "From Questions to Metrics: Business Analysis Patterns"
summary: The query shapes behind everyday business metrics, and the checks that keep your numbers right.
minutes: 10
practice:
  - sql-aov-by-country
  - sql-repeat-rate
  - sql-first-order-cohorts
  - sql-return-rate-by-category
  - sql-basket-size
  - sql-bought-together
  - sql-at-risk-customers
  - sql-top-customer-share
  - sql-best-month-per-category
  - sql-boss-country-summary
sources:
  - id: 1
    title: "2.6. Joins Between Tables, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-join.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Aggregate Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_aggfunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: You want the average number of units per order. What's wrong with AVG(quantity) on order_items?
    options:
      - Nothing
      - It averages per order line, not per order, so orders with many lines count several times
      - AVG doesn't work on integers
      - It ignores cancelled orders
    answer: 1
    explanation: Aggregate to one row per order first (SUM per order), then average.
  - question: To list product pairs bought together once each, which join condition is right?
    options:
      - "a.product_id = b.product_id"
      - "a.product_id <> b.product_id"
      - "a.product_id < b.product_id"
      - No condition
    answer: 2
    explanation: "< keeps each pair once and never pairs a product with itself. <> would list every pair twice."
  - question: Which customers haven't ordered since 2025-09-01?
    options:
      - "WHERE order_date < '2025-09-01'"
      - "HAVING MAX(order_date) < '2025-09-01'"
      - "HAVING MIN(order_date) < '2025-09-01'"
      - "WHERE MAX(order_date) < '2025-09-01'"
    answer: 1
    explanation: Compare each customer's latest order date, which is a group-level condition.
---

## Start from the question, not the query

Every metric in this chapter is defined by three things. Write them down before you write SQL:

1. **The unit**: what does one row of the final answer represent? A country, a month, a customer?
2. **The numerator and denominator**: for any rate, *what* is divided by *what*?
3. **The filter**: which rows count? (All orders, or only delivered ones?)

Most wrong numbers in real reports come from an unclear answer to one of these, not from SQL syntax.

## Pattern 1: aggregate at the right level first

Some questions need **two levels**: "average units per order" means first *units per order*, then *the average of those*.

```sql
SELECT ROUND(AVG(units), 2)
FROM (SELECT order_id, SUM(quantity) AS units FROM order_items GROUP BY order_id);
```

The same shape answers average orders per customer, average spend per customer, and so on.

## Pattern 2: rates with conditional aggregation

`SUM(CASE WHEN … THEN 1 ELSE 0 END)` counts the part, and `COUNT(*)` or `SUM(…)` gives the whole, in one pass:

```sql
ROUND(100.0 * SUM(CASE WHEN status = 'Returned' THEN quantity ELSE 0 END) / SUM(quantity), 1)
```

Always use `100.0` (not `100`) and state the denominator in your report.

## Pattern 3: firsts, lasts, and cohorts

- A customer's **first** or **last** date: `MIN(order_date)` / `MAX(order_date)` per customer.
- The **whole first order** (amount, items): `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id)`, keep 1.
- A **cohort** is everyone who started in the same period: group customers by the month of their first order.
- **At-risk** customers: `HAVING MAX(order_date) < 'cutoff'`. It must be the latest date, so it goes in `HAVING`, not `WHERE`.

## Pattern 4: pairs with a self join

"We can also join a table against itself. This is called a *self join*."[^1] Joining `order_items` to itself on `order_id`
pairs every product with the others in the same order. Use `a.product_id < b.product_id` so each pair appears once:

```sql
SELECT a.product_id, b.product_id, COUNT(*) AS times
FROM order_items AS a
JOIN order_items AS b ON b.order_id = a.order_id AND a.product_id < b.product_id
GROUP BY a.product_id, b.product_id;
```

As in the documentation's own example, the two copies need different aliases "to be able to distinguish the left and right side
of the join."[^1]

## Pattern 5: concentration and ranking

Rank entities with a window function, then compare the top group with the whole:
`SUM(CASE WHEN rn <= 10 THEN total ELSE 0 END) / SUM(total)`.

## Pattern 6: build summaries separately, then combine

When one report mixes levels (customers per country *and* revenue per country), build each summary in its own CTE at its natural
level, then join them. Joining customers to orders first and counting would count **orders**, not customers. When you need
distinct entities after a join, remember that "the function count(distinct X) will return the number of distinct values of column
X."[^2]

## Sanity checks before you share a number

- Do the parts add up to the whole? (Segments should sum to all customers; shares to 100%.)
- Does the row count make sense? (5 countries, 12 months, 49 buying customers…)
- Is anything missing? (Use LEFT JOIN and check for NULLs.)
- Would the query still be right if the data changed? (No typed-in numbers; handle ties and empty groups.)

## Key takeaways

- Define the **unit, numerator/denominator, and filter** before writing SQL.
- **Aggregate to the right level first**, then summarize again.
- Conditional aggregation for **rates**; window functions for **firsts and rankings**; **self joins** for pairs.
- Build mixed-level reports from **separate CTEs**, and **sanity-check** totals before sharing.
