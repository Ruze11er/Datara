---
id: py-pandas-intro
title: "pandas: Tables in Python"
summary: Load a CSV file into a DataFrame, look at its size and columns, pick columns, and calculate quick statistics.
minutes: 10
practice:
  - py-read-csv
  - py-dataframe-shape
  - py-select-column
  - py-select-columns
  - py-column-stats
sources:
  - id: 1
    title: "Package overview"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/overview.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Intro to data structures"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/user_guide/dsintro.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "How do I read and write tabular data?"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/02_read_write.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "How do I select a subset of a DataFrame?"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/03_subset_data.html
    accessed: 2026-10-28
    verified: true
  - id: 5
    title: "How to calculate summary statistics"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/getting_started/intro_tutorials/06_calculate_statistics.html
    accessed: 2026-10-28
    verified: true
  - id: 6
    title: "Python for Data Analysis, 3rd Edition (Open Access web version), Chapter 5: Getting Started with pandas"
    author: Wes McKinney
    publisher: wesmckinney.com, 2023
    url: https://wesmckinney.com/book/pandas-basics
    accessed: 2026-10-28
    verified: true
  - id: 7
    title: "pandas.read_csv"
    publisher: pandas documentation
    url: https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does products["price"] give you?
    options:
      - A DataFrame with one column
      - A Series (one column of values with row labels)
      - A Python list
      - The first price
    answer: 1
    explanation: Selecting a single column with single brackets returns a Series. Double brackets, products[["price"]], would give a one-column DataFrame.
  - question: How do you select the name and price columns together?
    options:
      - "products[\"name\", \"price\"]"
      - "products[[\"name\", \"price\"]]"
      - "products.name.price"
      - "products(\"name\", \"price\")"
    answer: 1
    explanation: The inner brackets make a list of column names; the outer brackets select them from the DataFrame.
  - question: Why does products.shape have no () after it, while products.head() does?
    options:
      - It's a typo in pandas
      - shape is an attribute (a stored value); head() is a method (an action)
      - shape only works on Series
      - Both work with or without ()
    answer: 1
    explanation: Attributes like shape, columns, and dtypes are values you read. Methods like head() and mean() are actions you call with ().
---

## What pandas is

So far you've stored records as lists of dictionaries and written loops to summarize them. That works, but real datasets
have thousands of rows, and analysts use a library built for tables: **pandas**.

pandas "is a Python package that provides fast, flexible, and expressive data structures designed to make working with
'relational' or 'labeled' data both easy and intuitive."[^1] It is "designed for working with tabular or heterogeneous
data."[^6] By convention it's imported with the short name `pd`:

```python
import pandas as pd
```

## DataFrames and Series

pandas has two main data structures: the **Series** (1-dimensional) and the **DataFrame** (2-dimensional).[^1]

- A **DataFrame** is a table: "a 2-dimensional labeled data structure with columns of potentially different types. You can
  think of it like a spreadsheet or SQL table, or a dict of Series objects."[^2]
- A **Series** is a single column: "a one-dimensional labeled array capable of holding any data type."[^2]

Both have row labels, called the **index**.[^2] If you don't choose labels, pandas numbers the rows from 0.[^2] You'll see
these numbers on the left whenever a DataFrame is displayed.

## Reading a CSV file

Most data arrives as a file. `pd.read_csv()` reads a CSV file into a DataFrame, and pandas has similar functions for other
formats (Excel, SQL, JSON, and more), all starting with `read_`.[^3]

```python
products = pd.read_csv("products.csv")
```

By default, the first line of the file becomes the column names.[^7] pandas also works out each column's type (numbers,
text, and so on), which you can check with `products.dtypes`.[^3]

## Looking at your table

Before analyzing, get to know the data:

| Code | What it gives |
|---|---|
| `products.head()` | The first 5 rows (`head(8)` for the first 8)[^3][^6] |
| `len(products)` | The number of rows |
| `products.shape` | `(rows, columns)`[^4] |
| `products.columns` | The column names |
| `products.dtypes` | The type of each column[^3] |

Notice that `shape`, `columns`, and `dtypes` have **no brackets**. They're **attributes**: values stored on the
DataFrame. Attributes "do not need `()`".[^3] `head()` is a **method** (an action), so it needs them.

## Selecting columns

Pick one column with its name in square brackets, like a dictionary lookup. "As a single column is selected, the
returned object is a pandas Series."[^4]

```python
names = products["name"]            # a Series
```

To pick several columns, pass a **list** of names, which gives double brackets. "The inner square brackets define a
Python list with column names, whereas the outer square brackets are used to select the data."[^4]

```python
price_list = products[["name", "price"]]   # a DataFrame
```

## Quick statistics

A Series has methods for common statistics: `.mean()`, `.sum()`, `.min()`, `.max()`, `.count()`, and more. They work on
the whole column at once, with no loop:

```python
products["price"].mean()     # average price, like SQL's AVG(price)
products["stock"].sum()      # total stock, like SUM(stock)
```

These calculations "exclude missing data" by default.[^5] `.describe()` calculates several statistics in one go, and you
can use it on several columns at the same time: `products[["price", "stock"]].describe()`.[^5]

## Key points

- `import pandas as pd`, then `pd.read_csv("file.csv")` gives a **DataFrame** (a table).
- One column (`df["col"]`) is a **Series**. A list of columns (`df[["a", "b"]]`) is a DataFrame.
- Attributes (`shape`, `columns`, `dtypes`) have no `()`. Methods (`head()`, `mean()`) do.
- Column methods like `.mean()` and `.sum()` replace the loops you wrote by hand.
