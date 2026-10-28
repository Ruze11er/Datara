---
id: stats-spread
title: "Spread: Range, Quartiles, and Standard Deviation"
summary: Two datasets can share an average and still look nothing alike. Measure how spread out the values are.
minutes: 9
practice:
  - sql-price-range
  - py-column-stats
sources:
  - id: 1
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 5: Exploring numerical data"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/explore-numerical
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "statistics: Mathematical statistics functions"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/statistics.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Google Sheets function list"
    publisher: Google Docs Editors Help
    url: https://support.google.com/docs/table/25273
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Store A's daily sales are 48, 50, 52. Store B's are 10, 50, 90. What's true?
    options:
      - They have different means
      - They have the same mean, but Store B's sales are far more spread out
      - They have the same standard deviation
      - Store A's range is larger
    answer: 1
    explanation: Both average 50. Store A's range is 4 and Store B's is 80, so B is much less predictable.
  - question: What does the interquartile range (IQR) measure?
    options:
      - The difference between the largest and smallest value
      - The spread of the middle half of the data, Q3 minus Q1
      - The average distance from the mean, squared
      - The most common value
    answer: 1
    explanation: Q1 and Q3 are the 25th and 75th percentiles, so Q3 - Q1 covers the middle 50% of the values.
  - question: Why might you report the IQR instead of the standard deviation?
    options:
      - The IQR is always bigger
      - The IQR is robust, so a few extreme values barely change it
      - Standard deviation only works on whole numbers
      - The IQR is easier to type
    answer: 1
    explanation: Like the median, the IQR is a robust statistic. The standard deviation is heavily influenced by extreme values.
---

## Why the average isn't enough

Two stores both sell an average of 50 items a day:

| | Day 1 | Day 2 | Day 3 | Mean |
|---|---|---|---|---|
| Store A | 48 | 50 | 52 | 50 |
| Store B | 10 | 50 | 90 | 50 |

Same average, very different businesses: Store A is steady, Store B swings wildly. To plan staff or stock, you need to
know the **spread** (also called variability) as well as the center.

## Range

The simplest measure: the largest value minus the smallest. Store A's range is 52 − 48 = 4, Store B's is 90 − 10 = 80.
The range is easy to explain, but it depends on only two values, so one extreme value changes it completely.

## Percentiles, quartiles, and the IQR

A **percentile** tells you what share of the data falls below a value: the 90th percentile is higher than 90% of the
values. **Quartiles** cut the sorted data into four equal-sized groups.[^2]

- **Q1** (first quartile) = the 25th percentile
- **Q2** = the 50th percentile, which is the **median**
- **Q3** (third quartile) = the 75th percentile

The **interquartile range** is IQR = Q3 − Q1.[^1] It covers the middle half of the data, so it ignores the extremes at
both ends. In a box plot, the box itself spans from Q1 to Q3, and "the length of the box is called the interquartile
range".[^1]

## Standard deviation

The **standard deviation** "represents the typical deviation of observations from the mean".[^1] A small standard
deviation means most values sit close to the mean, and a large one means they're scattered. Store A's standard
deviation is 2. Store B's is 40.

It's built from the **variance**, "the average squared distance from the mean".[^1] The standard deviation is the square
root of the variance,[^2] which brings it back to the same units as the data (items, dollars, minutes).

You'll see two versions. The **sample** standard deviation (Python's `statistics.stdev`, Sheets' `STDEV`) is for data
that's a sample from a bigger group. The **population** version (`statistics.pstdev`) is for data that covers everyone.[^2][^3]
For large datasets the two are nearly identical.

## Robust or not?

The same pattern as with averages applies:

- "The median and IQR are called robust statistics because extreme observations have little effect on their
  values."[^1]
- "The mean and standard deviation are more heavily influenced by changes in extreme observations."[^1]

So report **mean with standard deviation** for roughly symmetric data, and **median with IQR** when there are outliers or a
long tail.

## Getting them quickly

| Tool | How |
|---|---|
| SQL | `MIN(price)`, `MAX(price)`, and their difference for the range |
| pandas | `df["price"].describe()` shows count, mean, std, min, quartiles, and max |
| Python | `statistics.stdev(data)`, `statistics.quantiles(data, n=4)`[^2] |
| Spreadsheet | `STDEV(...)`, `MEDIAN(...)`, `MIN(...)`, `MAX(...)`[^3] |

## Key points

- Always report a measure of **spread** alongside a measure of center.
- **Range:** max minus min. It's simple but fragile.
- **IQR:** Q3 minus Q1, the spread of the middle half. It's robust.
- **Standard deviation:** the typical distance from the mean. It's sensitive to outliers.
