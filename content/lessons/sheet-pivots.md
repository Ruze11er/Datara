---
id: sheet-pivots
title: "Spreadsheets: Clean Data and Pivot Tables"
summary: Prepare a spreadsheet so it can be analyzed, summarize it with a pivot table, and know when to switch to SQL or Python.
minutes: 8
practice:
  - py-pivot-table
  - sql-avg-price-by-category
sources:
  - id: 1
    title: "Create a PivotTable to analyze worksheet data"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/create-a-pivottable-to-analyze-worksheet-data-a9a84538-bfe9-40a9-a8e9-f99134456576
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Create & use pivot tables"
    publisher: Google Docs Editors Help
    url: https://support.google.com/docs/answer/1272900
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Find and remove duplicates"
    publisher: Microsoft Support
    url: https://support.microsoft.com/en-us/office/find-and-remove-duplicates-00e35bea-b46a-4d5d-b28e-66a552dc138d
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Tidy Data"
    author: Hadley Wickham
    publisher: Journal of Statistical Software, 59(10), 2014
    url: https://www.jstatsoft.org/article/view/v059i10
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Which sheet is ready for a pivot table?
    options:
      - One with a title in row 1, merged header cells, and a blank row between months
      - One with a single header row, one column per variable, and no blank rows or columns
      - One where each month is a separate sheet
      - One with totals typed in between the data rows
    answer: 1
    explanation: Pivot tables need a plain table, with one header row of unique labels and no blank rows or columns.
  - question: You drop a numeric "total" field into Values. What does an Excel PivotTable show by default?
    options:
      - The average
      - The sum
      - The maximum
      - The first value
    answer: 1
    explanation: Numeric fields in Values are shown as a SUM by default. Change it to Average or Count if that's what you need.
  - question: What should you do before using Remove Duplicates?
    options:
      - Nothing, it can be undone at any time
      - Copy the original data to another sheet, because the duplicates are permanently deleted
      - Sort the data by date
      - Delete the header row
    answer: 1
    explanation: Microsoft recommends copying the original data first. Keeping raw data untouched is a good habit for any cleaning step.
---

## Data that's ready to analyze

Most spreadsheet problems start with the layout. A sheet that looks nice for printing (titles, merged cells, subtotals,
blank spacer rows) is often impossible to analyze. Microsoft's advice for pivot table data is the same as the tidy data
idea you met earlier:

- Organize the data "in a tabular format, and not have any blank rows or columns."[^1]
- "Make sure all columns have headers, with a single row of unique, non-blank labels for each column."[^1]
- "Ideally, you can use an Excel table."[^1]

In tidy terms: each column is one variable and each row is one observation.[^4] No totals inside the data, and no
months spread across columns or sheets. Totals belong in the summary, not the raw data.

## Cleaning steps

Typical spreadsheet cleaning mirrors what you did in Python:

1. **Copy the raw data first.** Work on a copy, never the original.
2. **Trim and standardize text** with `TRIM` or find-and-replace. Make sure "Manila" and "manila " become one value.
3. **Fix types.** Numbers stored as text won't be added up like numbers.
4. **Remove duplicates** with **Data › Remove Duplicates**. Be careful: "the duplicate data is permanently deleted", so
   "before you delete the duplicates, it's a good idea to move or copy the original data" to another sheet.[^3]

## Pivot tables

A pivot table is "a powerful tool to calculate, summarize, and analyze data"[^1]. It's the spreadsheet version of
`GROUP BY` and of pandas' `pivot_table`. Google describes using one to "narrow down a large data set" and "see
relationships between data points".[^2]

To build one in Google Sheets, select the data (each column needs a header), then **Insert › Pivot table**.[^2] Then
choose fields:

- **Rows:** the categories to group by, such as city. Like `GROUP BY city`.
- **Columns:** an optional second grouping across the top, such as month.
- **Values:** what to calculate, such as total revenue.[^2]

Check the calculation. In Excel, numeric fields in Values "are displayed as a SUM" by default, while fields Excel reads
as text are shown as a COUNT.[^1] If you wanted an average, or a "number" column was stored as text, the result can look
right and be wrong.

## When to leave the spreadsheet

Spreadsheets are great for small data, quick checks, and sharing with non-technical colleagues. Consider SQL or Python
when:

- the data has hundreds of thousands of rows, or keeps growing
- you repeat the same cleaning every week (code can be re-run, clicks can't)
- you need to combine many tables reliably
- others need to see and check exactly how a number was calculated

## Key points

- Analysis-ready data has **one header row, one column per variable, and no blank rows or columns**.
- **Copy raw data before cleaning.** Remove Duplicates deletes for good.
- A **pivot table** is `GROUP BY` with a mouse: Rows, Columns, Values.
- Check what the Values are calculating (sum, count, or average) before you trust the result.
