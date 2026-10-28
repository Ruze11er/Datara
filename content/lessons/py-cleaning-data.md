---
id: py-cleaning-data
title: Cleaning Messy Data
summary: Fix text, convert types, handle missing values and duplicates, and validate records before you analyze.
minutes: 10
practice:
  - py-clean-emails
  - py-standardize-categories
  - py-convert-prices
  - py-remove-missing
  - py-fill-missing
  - py-unique-order-ids
  - py-dedupe-customers
  - py-orders-per-month
  - py-find-invalid-orders
  - py-boss-clean-signups
sources:
  - id: 1
    title: "Tidy Data"
    author: Hadley Wickham
    publisher: Journal of Statistical Software, 59(10), 2014
    url: https://www.jstatsoft.org/article/view/v059i10
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Types (String Methods, Boolean Operations, Mapping Types)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/stdtypes.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "5. Data Structures (5.4 Sets), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/datastructures.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "PEP 8 – Style Guide for Python Code"
    author: Guido van Rossum, Barry Warsaw, Alyssa Coghlan
    publisher: Python Enhancement Proposals
    url: https://peps.python.org/pep-0008/
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Why should you clean category text before counting by category?
    options:
      - It makes the code faster
      - Otherwise "Books", "books", and "BOOKS " are counted as three different categories
      - Python can't count text
      - It isn't necessary
    answer: 1
    explanation: Inconsistent spelling splits one group into several. Normalize first, then count.
  - question: Which is the correct way to check whether value is missing (None)?
    options:
      - "value == None"
      - "value is None"
      - "value = None"
      - "not value"
    answer: 1
    explanation: PEP 8 says to compare with None using is or is not. (not value is also true for 0 and "", which may be real data.)
  - question: How can you remove duplicate IDs while keeping their original order?
    options:
      - "set(ids)"
      - "sorted(set(ids))"
      - "list(dict.fromkeys(ids))"
      - "ids.sort()"
    answer: 2
    explanation: A set has no order. dict.fromkeys keeps the first appearance of each key, because dictionaries preserve insertion order.
---

## Why cleaning comes first

Raw data is rarely ready to analyze. As the "Tidy Data" paper puts it, "a huge amount of effort is spent cleaning data to get it
ready for analysis."[^1] Skipping this step doesn't save time: it produces confident-looking numbers that are wrong.

A good cleaning process is a list of **written rules**, applied the same way to every record. Writing each rule as a function
(previous lesson) keeps it consistent.

## 1. Inconsistent text

The same value can arrive in many forms: `"Books"`, `" books"`, `"BOOKS "`. Normalize before comparing or grouping:

| Method | Does[^2] |
|---|---|
| `.strip()` | removes leading and trailing characters (spaces by default) |
| `.lower()` / `.upper()` | converts letters to lower/upper case |
| `.title()` | makes words start with a capital letter |
| `.replace(old, new)` | replaces all occurrences of `old` |

```python
clean_categories = [c.strip().title() for c in categories]
```

When many spellings must become one official value (`"PH"`, `"ph"`, `"Philippines"`), use a **mapping dictionary**:
`COUNTRY_NAMES[raw.strip().lower()]`.

## 2. Wrong types

Numbers stored as text can't be added, and they sort strangely. Strip symbols, then convert:

```python
price = float("$1,049.00".replace("$", "").replace(",", ""))   # 1049.0
age = int(" 34 ".strip())                                       # 34
```

## 3. Missing values

Missing data hides as `None`, empty text `""`, text like `"N/A"`, or sometimes `0`. Find out which your data uses.
"Comparisons to singletons like None should always be done with is or is not, never the equality operators."[^4]

You have two main choices:

- **Drop** missing values: `[r for r in ratings if r is not None]`. This is honest, but you lose rows.
- **Fill** them (*imputation*), for example with the average of the known values. You keep the rows, but the data looks
  more certain than it is.

Whichever you choose, **count and report** how many values were missing.

### Safe checks with short-circuiting

For `x or y`, Python "only evaluates the second argument if the first one is false."[^2] So this is safe even when `email` is
`None`, because `.strip()` is never called on `None`:

```python
missing = email is None or email.strip() == ""
```

## 4. Duplicates

First decide **what makes two records the same**: the whole record, an ID, or a cleaned email.

- "A set is an unordered collection with no duplicate elements"[^3], which is great for checking "have I seen this?" quickly.
- To keep the **original order**, use the seen-set pattern, or `list(dict.fromkeys(items))`, because "dictionaries preserve
  insertion order."[^2]

```python
unique, seen = [], set()
for c in customers:
    if c["id"] not in seen:
        seen.add(c["id"])
        unique.append(c)
```

De-duplicate on **cleaned** values, otherwise `" Maria@Example.com"` and `"maria@example.com"` look different.

## 5. Validation

Check that values make sense before trusting them: quantities above 0, required fields present, dates in range. Collect the
problem records so you can report or fix them, rather than silently dropping them.

## The order of the rules matters

A typical pipeline: **skip** unusable records → **clean** text → **convert** types → **map** to standard values →
**de-duplicate** on cleaned keys → **validate**. Change the order, and you can get a different result.

## Key takeaways

- Cleaning is a **written, repeatable list of rules**. Put each rule in a function.
- Normalize text with `.strip()`, `.lower()`/`.title()`, and mapping dictionaries; **convert types** early.
- Test for missing values with `is None`; choose **drop or fill**, and report how many.
- Define what a **duplicate** means; de-duplicate on cleaned keys, keeping order when it matters.
