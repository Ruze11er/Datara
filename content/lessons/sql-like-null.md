---
id: sql-like-null
title: "Patterns and Missing Values: LIKE and NULL"
summary: Search text with patterns, and find data that is missing.
minutes: 7
practice:
  - sql-product-sets
  - sql-missing-emails
sources:
  - id: 1
    title: "SQL Language Expressions"
    publisher: SQLite
    url: https://www.sqlite.org/lang_expr.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "9.2. Comparison Functions and Operators, PostgreSQL Documentation"
    publisher: The PostgreSQL Global Development Group
    url: https://www.postgresql.org/docs/current/functions-comparison.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which pattern matches every product name that starts with "Wireless"?
    options:
      - "LIKE '%Wireless'"
      - "LIKE 'Wireless%'"
      - "LIKE '_Wireless'"
      - "= 'Wireless%'"
    answer: 1
    explanation: The % at the end means "followed by anything".
  - question: Why does WHERE email = NULL return no rows?
    options:
      - Because no emails are missing
      - Because comparing anything with NULL gives "unknown", not true
      - Because NULL must be written in lowercase
      - Because email is a text column
    answer: 1
    explanation: NULL means unknown. Use IS NULL to test for it.
  - question: Which condition finds customers who DO have an email?
    options:
      - "email <> NULL"
      - "email IS NOT NULL"
      - "email = ''"
      - "NOT email"
    answer: 1
    explanation: IS NOT NULL is the correct way to check that a value is present.
---

## LIKE: matching patterns

Sometimes you only know part of a value: *products with "Set" in the name, customers whose email ends in ".com"*.
`LIKE` compares text with a **pattern**. Two symbols do the work:[^1]

- `%` matches "any sequence of zero or more characters"
- `_` matches "any single character"

| Pattern | Matches | Example match |
|---|---|---|
| `'Wireless%'` | starts with "Wireless" | Wireless Mouse |
| `'%Set'` | ends with "Set" | Building Blocks Set |
| `'%Set%'` | contains "Set" anywhere | Ceramic Coffee Mug Set |
| `'_oga Mat'` | any one letter, then "oga Mat" | Yoga Mat |

```sql
SELECT product_name
FROM products
WHERE product_name LIKE '%Set%';
```

**SQLite note:** in SQLite, `LIKE` ignores upper/lower case for English letters, so `'a' LIKE 'A'` is true. But "SQLite only
understands upper/lower case for ASCII characters by default", so letters like æ and Æ are treated as different.[^1]
Other databases may treat case differently, so check the documentation of the database you use at work.

## NULL: the missing value

Some customers never gave an email address, so their `email` is **NULL**. NULL is not zero and not empty text. It means
**unknown or missing**.

That makes comparisons tricky. "Ordinary comparison operators yield null (signifying 'unknown'), not true or false, when either
input is null. For example, `7 = NULL` yields null."[^2] The reason: "the null value represents an unknown value, and it is not
known whether two unknown values are equal."[^2]

Since `WHERE` only keeps rows where the condition is **true**, this returns nothing:

```sql
SELECT * FROM customers WHERE email = NULL;   -- always returns no rows
```

## IS NULL and IS NOT NULL

"To check whether a value is or is not null, use the predicates `expression IS NULL` and `expression IS NOT NULL`."[^2]

```sql
SELECT customer_id, first_name, last_name
FROM customers
WHERE email IS NULL;        -- customers with no email

SELECT COUNT(*)
FROM customers
WHERE email IS NOT NULL;    -- customers we can email
```

In SQLite, `IS` and `IS NOT` work like `=` and `!=`, except they give a clear true or false even when NULL is involved.[^1]

## Why this matters for analysts

Missing data is everywhere in real datasets. Always ask: *how many values are missing, and does that change my answer?*
For example, an average email open rate means little if half the emails are missing.

## Key takeaways

- `LIKE` matches patterns: `%` = **any characters**, `_` = **exactly one character**.
- In SQLite, `LIKE` **ignores case** for English letters; other databases may not.
- **NULL means unknown.** `= NULL` never matches; use **`IS NULL`** and **`IS NOT NULL`**.
