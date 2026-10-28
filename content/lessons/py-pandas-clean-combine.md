---
id: py-pandas-clean-combine
title: "pandas: Missing Values, Joins, and Dates"
summary: Find and handle missing values, join tables with merge, and turn date text into real dates.
minutes: 10
practice:
  - py-count-missing
  - py-handle-missing
  - py-merge-tables
  - py-monthly-revenue
sources:
  - id: 1
    title: "Working with missing data"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/user_guide/missing_data.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "pandas.DataFrame.dropna"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.dropna.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "pandas.DataFrame.merge"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Merge, join, concatenate and compare"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/user_guide/merging.html
    accessed: 2026-10-28
    verified: true
  - id: 5
    title: "pandas.to_datetime"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.to_datetime.html
    accessed: 2026-10-28
    verified: true
  - id: 6
    title: "pandas.Series.dt.strftime"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.Series.dt.strftime.html
    accessed: 2026-10-28
    verified: true
  - id: 7
    title: "datetime: Basic date and time types (strftime() and strptime() Format Codes)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/datetime.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does customers.isna().sum() give you?
    options:
      - The number of customers
      - The number of missing values in each column
      - The rows with missing values
      - The total of all numbers
    answer: 1
    explanation: isna() marks missing cells as True, and sum() counts the Trues in each column.
  - question: What does customers.dropna() do with no arguments?
    options:
      - Drops rows where every value is missing
      - Drops any row that has at least one missing value
      - Fills missing values with 0
      - Drops columns named NA
    answer: 1
    explanation: The default is how="any". Use subset=["email"] to only look at the columns that matter.
  - question: orders.merge(customers, on="customer_id") is like which SQL join by default?
    options:
      - LEFT JOIN
      - INNER JOIN
      - FULL OUTER JOIN
      - CROSS JOIN
    answer: 1
    explanation: merge uses how="inner" by default, keeping only rows with a match in both tables.
---

## Missing values

Real data has gaps. pandas marks a missing value differently depending on the column's type: usually `NaN` for numbers,
`NaT` for dates, and `NA` for some newer types. `None` also counts as missing.[^1] You don't need to remember which is
which: the same methods find all of them.

## Finding them

`isna()` and `notna()` detect missing values.[^1] `isna()` gives a table of `True`/`False`, and since `True` counts as 1,
adding it up counts the gaps:

```python
customers.isna().sum()      # missing values per column
```

Do this first with any new dataset. Missing values affect your results quietly: when summing, pandas treats them as
zero, and statistics like `.mean()` skip them by default.[^1]

## Dropping or filling

- `dropna()` "drops rows or columns with missing data".[^1] By default it removes a row if **any** value is missing.[^2]
  With `subset`, you choose which columns to look at:[^2]

  ```python
  customers.dropna(subset=["email"])     # only drop rows with no email
  ```

- `fillna()` "replaces NA values with non-NA data":[^1]

  ```python
  customers["city"] = customers["city"].fillna("Unknown")
  ```

Which to choose is a judgement call. Drop a row when it's useless without the value (a customer you can't contact).
Fill it when the rest of the row is still valuable. Either way, say what you did in your report.

## Joining tables with merge

`merge` combines tables "with a database-style join".[^3] It's pandas' version of SQL's `JOIN`:

```python
orders.merge(customers, on="customer_id")
```

`on` names the column(s) to join on, which "must be found in both DataFrames".[^3] The `how` argument picks the kind of
join, and the default is `"inner"`.[^3]

| `how` | SQL equivalent | Keeps |
|---|---|---|
| `"inner"` (default) | `INNER JOIN` | only keys found in both tables[^4] |
| `"left"` | `LEFT OUTER JOIN` | every row of the left table[^4] |
| `"outer"` | `FULL OUTER JOIN` | keys from either table[^4] |

As with SQL, when a key has no match in a left or outer join, the missing values show as `NA`.[^4]

## Working with dates

Dates often arrive as text like `"2025-01-05"`. `pd.to_datetime` converts text (a single value, a Series, and more) into
real dates.[^5] A converted column has the type `datetime64`.[^5]

```python
orders["order_date"] = pd.to_datetime(orders["order_date"])
```

A date column has a `.dt` accessor with date tools such as `.dt.year`, `.dt.month`, and `.dt.strftime()`, which turns
dates back into formatted text using the same format codes as Python's standard library.[^6] In those codes, `%Y` is the
"year with century" and `%m` is the "month as a zero-padded decimal number".[^7] So `"%Y-%m"` gives text like
`"2025-01"`, handy for grouping by month:

```python
orders["month"] = orders["order_date"].dt.strftime("%Y-%m")
orders.groupby("month")["total"].sum()
```

## Key points

- `df.isna().sum()` counts missing values per column. Check it first.
- `dropna(subset=[...])` drops rows missing important values. `fillna(value)` fills gaps.
- `a.merge(b, on="key")` joins tables, an inner join by default. `how="left"` keeps every row of `a`.
- `pd.to_datetime` turns text into dates. `.dt` gives date tools such as `.dt.strftime("%Y-%m")`.
