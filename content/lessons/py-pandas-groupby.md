---
id: py-pandas-groupby
title: "pandas: Group, Summarize, and Pivot"
summary: Count categories, summarize groups with groupby and agg, and build spreadsheet-style pivot tables.
minutes: 10
practice:
  - py-value-counts
  - py-groupby-mean
  - py-groupby-sum-sorted
  - py-groupby-agg
  - py-pivot-table
  - py-boss-city-report
sources:
  - id: 1
    title: "Group by: split-apply-combine"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/user_guide/groupby.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "The Split-Apply-Combine Strategy for Data Analysis"
    author: Hadley Wickham
    publisher: Journal of Statistical Software, 40(1), 2011
    url: https://www.jstatsoft.org/article/view/v040i01
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "pandas.Series.value_counts"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.Series.value_counts.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "pandas.pivot_table"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.pivot_table.html
    accessed: 2026-10-28
    verified: true
  - id: 5
    title: "How to calculate summary statistics"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/06_calculate_statistics.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What are the three steps of split-apply-combine?
    options:
      - Load, clean, and save the data
      - Split the data into groups, apply a calculation to each group, combine the results
      - Split columns, apply formats, combine files
      - Sort, filter, and count
    answer: 1
    explanation: groupby splits rows into groups, applies a calculation (like sum) to each, and combines the answers into one result.
  - question: What does orders["status"].value_counts() return?
    options:
      - The number of different statuses
      - A count for each status, most common first
      - The statuses in alphabetical order
      - The total of all orders
    answer: 1
    explanation: value_counts counts each different value and sorts the counts in descending order.
  - question: You build a pivot table of revenue but forget aggfunc. What do the cells show?
    options:
      - The sum of revenue
      - The average (mean) revenue
      - The number of rows
      - An error
    answer: 1
    explanation: pivot_table uses "mean" by default, so ask for aggfunc="sum" when you want totals.
---

## Counting categories

The quickest summary is "how many of each?". `value_counts()` counts the number of records for each category in a
column.[^5] It returns "a Series containing counts of unique values",
sorted "in descending order so that the first element is the most frequently-occurring element."[^3] Missing values are
left out by default.[^3]

```python
orders["status"].value_counts()
```

With `normalize=True` you get **shares** (relative frequencies) instead of counts.[^3]

## Split, apply, combine

Most analysis questions sound like "the average price **per category**" or "revenue **per customer**". A common strategy
is to "break up a big problem into manageable pieces, operate on each piece independently and then put all the pieces back
together."[^2] pandas calls this **group by**, a process of:[^1]

- **Splitting** the data into groups based on some criteria
- **Applying** a function to each group independently
- **Combining** the results into a data structure

```python
products.groupby("category")["price"].mean()
```

Read it in three parts: **group** the rows by category, **pick** the price column, **calculate** the mean of each group.
The result is a Series with one value per category, labelled by category.

The name GroupBy should feel familiar if you've used SQL's `GROUP BY`.[^1] The line above is the pandas version of:

```sql
SELECT category, AVG(price) FROM products GROUP BY category;
```

By default the groups come out **sorted by their labels**.[^1] To rank them by the result, sort the values afterwards:

```python
orders.groupby("customer_id")["total"].sum().sort_values(ascending=False)
```

## Several summaries at once

`.agg()` calculates several things per group. With **named aggregation**, each keyword is an output column name, and its
value is a pair: the column to use and the calculation to apply.[^1]

```python
orders.groupby("status").agg(
    orders=("order_id", "count"),
    revenue=("total", "sum"),
)
```

The group labels (here, the statuses) become the row labels. Add `.reset_index()` to turn them into a normal column.

## Pivot tables

`pivot_table` creates "a spreadsheet-style pivot table as a DataFrame".[^4] You choose what goes in the rows (`index`), the
columns (`columns`), and the cells (`values`):

```python
sales.pivot_table(index="region", columns="quarter", values="revenue",
                  aggfunc="sum", fill_value=0)
```

Two details matter:

- `aggfunc` is `"mean"` by default,[^4] so ask for `"sum"` when you want totals.
- A region with no sales in a quarter gets an empty cell. `fill_value` is the "value to replace missing values with"
  after aggregation,[^4] so `fill_value=0` shows 0 instead.

## Key points

- `value_counts()` counts each category, most common first.
- `df.groupby("col")["other"].calc()` gives one result per group: split, apply, combine.
- Groups are sorted by label. Use `.sort_values()` to rank them by the result.
- `.agg(name=("column", "calc"))` makes several summary columns at once.
- `pivot_table` averages by default. Set `aggfunc="sum"` for totals and `fill_value=0` for empty cells.
