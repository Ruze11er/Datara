---
id: sql-having
title: Filtering Groups with HAVING
summary: Keep only the groups you care about, and learn the order in which SQL really runs your query.
minutes: 7
practice:
  - sql-big-categories
  - sql-loyal-customers
  - sql-boss-big-spenders
  - sql-well-rated-products
sources:
  - id: 1
    title: "2.7. Aggregate Functions, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/tutorial-agg.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7.2. Table Expressions (7.2.3 The GROUP BY and HAVING Clauses), PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/queries-table-expressions.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: You want customers with more than 5 orders. Where does COUNT(*) > 5 go?
    options:
      - In WHERE
      - In HAVING
      - In ORDER BY
      - In SELECT
    answer: 1
    explanation: The count only exists after grouping, so it is a group condition, and group conditions go in HAVING.
  - question: You want delivered revenue per customer, only for customers above 500. Where does status = 'Delivered' go?
    options:
      - In HAVING, because the query has GROUP BY
      - In WHERE, because it filters individual rows before grouping
      - In ORDER BY
      - It doesn't matter
    answer: 1
    explanation: Conditions on single rows belong in WHERE. They decide which rows go into the totals.
  - question: Which order of clauses is correct?
    options:
      - "SELECT … FROM … GROUP BY … WHERE … HAVING …"
      - "SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY …"
      - "SELECT … FROM … HAVING … GROUP BY …"
      - "SELECT … WHERE … FROM … GROUP BY …"
    answer: 1
    explanation: WHERE before GROUP BY, HAVING after it, ORDER BY at the end.
---

## Filtering groups

Sometimes you only want **some** groups: categories with more than 6 products, customers with 8 or more orders.
"If a table has been grouped using `GROUP BY`, but only certain groups are of interest, the `HAVING` clause can be used,
much like a `WHERE` clause, to eliminate groups from the result."[^2]

```sql
SELECT category, COUNT(*)
FROM products
GROUP BY category
HAVING COUNT(*) > 6;
```

## WHERE vs HAVING

This is the key idea of the lesson. From the PostgreSQL tutorial:

> "The fundamental difference between `WHERE` and `HAVING` is this: `WHERE` selects input rows before groups and aggregates are
> computed (thus, it controls which rows go into the aggregate computation), whereas `HAVING` selects group rows after groups and
> aggregates are computed."[^1]

| | `WHERE` | `HAVING` |
|---|---|---|
| Filters | individual **rows** | finished **groups** |
| Runs | **before** grouping | **after** grouping |
| Can use aggregates like `COUNT(*)`? | No | Yes |

That's why `WHERE COUNT(*) > 6` causes an error: at that moment, no groups exist yet.

Many queries need both:

```sql
SELECT customer_id, ROUND(SUM(total_amount), 2) AS total_spent
FROM orders
WHERE status = 'Delivered'          -- rows: only delivered orders count
GROUP BY customer_id
HAVING SUM(total_amount) > 500      -- groups: only big spenders
ORDER BY total_spent DESC;
```

You can combine several group conditions with `AND`, for example `HAVING COUNT(*) >= 5 AND AVG(rating) >= 4`.

## The order SQL really runs in

You **write** `SELECT` first, but the database works through the clauses in a different, logical order:

1. `FROM` / `JOIN`: get the rows
2. `WHERE`: keep matching rows
3. `GROUP BY`: form groups
4. `HAVING`: keep matching groups
5. `SELECT`: calculate the output columns
6. `ORDER BY`: sort
7. `LIMIT`: keep the first rows

Knowing this order tells you where each condition belongs. A condition about **one row** goes in `WHERE`.
A condition about **a whole group** goes in `HAVING`.

**SQLite note:** SQLite lets you use a `SELECT` alias in `HAVING` (such as `HAVING n > 6`), but not every database does.
Repeating the aggregate (`HAVING COUNT(*) > 6`) works everywhere.

## Key takeaways

- `HAVING` filters **groups**; `WHERE` filters **rows**.
- `WHERE` runs **before** grouping, `HAVING` **after**, so only `HAVING` can use aggregates.
- Logical order: **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT**.
