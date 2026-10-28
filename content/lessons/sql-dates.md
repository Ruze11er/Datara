---
id: sql-dates
title: Working with Dates and Trends
summary: Extract months and weekdays, build monthly trends, and calculate with dates in SQLite.
minutes: 8
practice:
  - sql-orders-per-month
  - sql-monthly-revenue
  - sql-orders-by-weekday
  - sql-boss-monthly-report
sources:
  - id: 1
    title: "Datatypes In SQLite (2.2 Date and Time Datatype)"
    publisher: SQLite
    url: https://www.sqlite.org/datatype3.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Date And Time Functions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_datefunc.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does strftime('%Y-%m', '2025-03-15') return?
    options:
      - "2025"
      - "03"
      - "2025-03"
      - "March 2025"
    answer: 2
    explanation: "%Y is the 4-digit year and %m the 2-digit month."
  - question: strftime('%w', order_date) returns '0'. Which day is that?
    options:
      - Monday
      - Sunday
      - Saturday
      - It's an error
    answer: 1
    explanation: "%w gives the day of the week from 0 to 6, with Sunday as 0."
  - question: Why does 100 * cancelled / total sometimes give a whole number like 14 instead of 14.3 in SQLite?
    options:
      - SQLite always rounds percentages
      - Dividing whole numbers gives a whole number, so use 100.0
      - Because of strftime
      - Because the dates are text
    answer: 1
    explanation: Integer ÷ integer is an integer in SQLite. Writing 100.0 makes the calculation use decimals.
---

## How SQLite stores dates

"SQLite does not have a storage class set aside for storing dates and/or times."[^1] Dates are usually stored as text in the
ISO 8601 format, `YYYY-MM-DD`.[^1] That's what the practice shop uses, for example `2025-03-15`.

Because the year comes first, these texts **sort and compare in calendar order**, so `WHERE order_date >= '2025-07-01'` and
`ORDER BY order_date` just work.

## Date functions

SQLite has seven date and time functions: `date`, `time`, `datetime`, `julianday`, `unixepoch`, `strftime`, and `timediff`.[^2]
The ones you'll use most:

- `date(…)` "returns the date as text in this format: YYYY-MM-DD."[^2]
- `strftime(format, …)` "returns the date formatted according to the format string."[^2]
- `julianday(…)` returns a day number. Subtracting two of them gives the **number of days** between dates.

### strftime format codes

| Code | Meaning[^2] | Example for 2025-03-15 |
|---|---|---|
| `%Y` | year: 0000-9999 | `2025` |
| `%m` | month: 01-12 | `03` |
| `%d` | day of month: 01-31 | `15` |
| `%w` | day of week 0-6 with Sunday==0 | `6` (a Saturday) |
| `%j` | day of year: 001-366 | `074` |

`strftime` returns **text**, so compare its result with text: `strftime('%w', order_date) = '0'`, not `= 0`.

## Monthly trends

Group by the formatted month to see how a measure changes over time:

```sql
SELECT strftime('%Y-%m', order_date) AS month,
       COUNT(*) AS orders,
       ROUND(SUM(total_amount), 2) AS revenue
FROM orders
WHERE status = 'Delivered'
GROUP BY month
ORDER BY month;
```

This is the backbone of most business dashboards.

## Calculating with dates

Modifiers shift dates. Number modifiers like `'+7 days'` "add the specified amount of time", and "the 'start of' modifiers …
shift the date backwards to the beginning of the subject month, year, or day."[^2]

```sql
SELECT date('2025-03-15', '+7 days');          -- 2025-03-22
SELECT date('2025-03-15', 'start of month');   -- 2025-03-01
SELECT julianday('2025-12-31') - julianday('2025-01-01');   -- 364.0 days apart
```

**Other databases** have different date functions (for example `DATE_TRUNC` and `EXTRACT` in PostgreSQL). The ideas are the
same: extract a part, truncate to a period, and add or subtract intervals.

## Percentages: the integer-division trap

To calculate a rate, multiply by `100.0`, not `100`. In SQLite, whole number ÷ whole number gives a whole number:

```sql
ROUND(100.0 * SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS cancel_rate_pct
```

## Key takeaways

- SQLite stores dates as `YYYY-MM-DD` **text**, which sorts in calendar order.
- `strftime('%Y-%m', d)` gives the month, and `'%w'` the weekday (`'0'` = Sunday). Results are **text**.
- `GROUP BY` month + `ORDER BY` month = a **monthly trend**.
- `date(d, '+N days')`, `'start of month'`, and `julianday` differences handle date maths.
- Use `100.0` for percentages to avoid whole-number division.
