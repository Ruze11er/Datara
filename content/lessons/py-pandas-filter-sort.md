---
id: py-pandas-filter-sort
title: "pandas: Filter, Sort, and Add Columns"
summary: Keep the rows you need with conditions, sort and take the top rows, and calculate new columns without loops.
minutes: 9
practice:
  - py-filter-rows
  - py-filter-two-conditions
  - py-sort-values
  - py-new-column
  - py-boss-restock-report
sources:
  - id: 1
    title: "How do I select a subset of a DataFrame?"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/03_subset_data.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Indexing and selecting data (Boolean indexing)"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/user_guide/indexing.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "pandas.DataFrame.sort_values"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.sort_values.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "How do I read and write tabular data?"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/02_read_write.html
    accessed: 2026-10-28
    verified: true
  - id: 5
    title: "How to create new columns derived from existing columns"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/05_add_columns.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does products["price"] < 15 produce on its own?
    options:
      - The rows with a price under 15
      - A Series of True/False values, one per row
      - The number of products under 15
      - An error
    answer: 1
    explanation: A comparison on a column gives one True or False per row. Put it inside products[...] to keep the True rows.
  - question: Which line correctly keeps Electronics products that cost more than 20?
    options:
      - "products[products[\"category\"] == \"Electronics\" and products[\"price\"] > 20]"
      - "products[(products[\"category\"] == \"Electronics\") & (products[\"price\"] > 20)]"
      - "products[products[\"category\"] == \"Electronics\" & products[\"price\"] > 20]"
      - "products[(products[\"category\"] == \"Electronics\") | (products[\"price\"] > 20)]"
    answer: 1
    explanation: pandas uses & for and, with each condition in parentheses. | means or, which would keep too many rows.
  - question: What does sort_values("price") do if you don't pass ascending?
    options:
      - Sorts from highest to lowest price
      - Sorts from lowest to highest price
      - Sorts by row number
      - Asks you which order you want
    answer: 1
    explanation: ascending is True by default. Use ascending=False for highest first.
---

## Filtering rows with a condition

In SQL you filter with `WHERE`. In pandas you write a condition on a column:

```python
products["price"] < 15
```

This compares every price at once. The result "is actually a pandas Series of boolean values (either True or False) with
the same number of rows as the original DataFrame."[^1] Put that Series inside the selection brackets and "only rows for
which the value is True will be selected":[^1]

```python
cheap = products[products["price"] < 15]
```

The kept rows keep their original row labels (for example 1, 3, 7). That's normal. If you want them renumbered 0, 1, 2…,
add `.reset_index(drop=True)`.

## Combining conditions

To combine conditions on columns, pandas uses symbols instead of Python's words: `|` for **or**, `&` for **and**, and `~`
for **not**.[^2] "You can not use `or`/`and`", and "each condition must be surrounded by parentheses".[^1]

```python
products[(products["category"] == "Electronics") & (products["price"] > 20)]
```

Why the parentheses? Without them, Python reads `df['A'] > 2 & df['B'] < 3` as `df['A'] > (2 & df['B']) < 3`, which isn't
what you meant.[^2]

To keep rows whose value is one of several options, `isin` is shorter than many `|`s:[^1]

```python
products[products["category"].isin(["Home", "Office"])]
```

## Sorting and taking the top rows

`sort_values` sorts the rows by one or more columns. `ascending` is `True` by default (smallest first). Set it to `False`
for largest first.[^3] Missing values go at the end by default.[^3]

```python
products.sort_values("price", ascending=False).head(3)   # 3 most expensive
```

`.head(n)` keeps the first n rows.[^4] Together, these lines are pandas' version of SQL's
`ORDER BY price DESC LIMIT 3`. Each method works on the result of the one before it. This is called **method
chaining**, and you read it from left to right.

## Adding calculated columns

To create a new column, assign to it with the new name in square brackets, as you would add a key to a
dictionary.[^5]

```python
products["stock_value"] = products["price"] * products["stock"]
```

"The calculation of the values is done **element-wise**": every row is calculated at once, and "you do not need to use a
loop to iterate each of the rows!"[^5] The other maths operators (`+`, `-`, `*`, `/`) and comparisons (`<`, `>`, `==`)
work element-wise too.[^5]

## Working in steps

Longer tasks are easier as small steps stored in variables, each checked with Run:

```python
low = products[products["stock"] < 15]                          # 1. filter
low["reorder_cost"] = (50 - low["stock"]) * low["price"]        # 2. calculate
report = low[["name", "reorder_cost"]]                          # 3. select
report = report.sort_values("reorder_cost", ascending=False)    # 4. sort
```

## Key points

- `df[condition]` keeps the rows where the condition is True, like SQL's `WHERE`.
- Combine conditions with `&` (and), `|` (or), `~` (not), and **wrap each condition in parentheses**.
- `sort_values(col, ascending=False).head(n)` gives the top n rows.
- `df["new"] = calculation` adds a column, calculated for every row at once.
