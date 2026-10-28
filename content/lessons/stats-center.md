---
id: stats-center
title: "Averages: Mean, Median, and Mode"
summary: Three ways to describe a typical value, and why one big outlier can make the average misleading.
minutes: 8
practice:
  - sql-average-price
  - sql-average-order-value
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
    title: "NIST/SEMATECH e-Handbook of Statistical Methods, 1.3.5.1 Measures of Location"
    publisher: National Institute of Standards and Technology (NIST)
    url: https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm
    accessed: 2026-10-28
    verified: true
quiz:
  - question: "Order totals are 12, 15, 18, 20, 25, 30, and 400. Which value describes a typical order better?"
    options:
      - The mean (about 74.29)
      - The median (20)
      - The largest value (400)
      - They're equally good
    answer: 1
    explanation: Six of the seven orders are 30 or less. The single 400 order pulls the mean far above them, while the median stays in the middle.
  - question: What is the median of 3, 9, 4, 7?
    options:
      - "4"
      - "5.5"
      - "7"
      - "5.75"
    answer: 1
    explanation: Sorted, the values are 3, 4, 7, 9. With an even count, the median is the average of the two middle values, (4 + 7) / 2 = 5.5.
  - question: Which average works for categories, such as the most popular payment method?
    options:
      - Mean
      - Median
      - Mode
      - None of them
    answer: 2
    explanation: The mode is the most common value, so it works for labels too. You can't add up or sort "Card" and "Cash" to get a mean or median.
---

## Describing a typical value

"What's a typical order worth?" is one of the most common questions an analyst gets. Statistics has several answers,
called measures of **center** or **location**. The three you'll use most are the mean, the median, and the mode.

## The mean

The mean is the sum of the values divided by how many there are.[^3] It's "often called the average" and is "a common
way to measure the center of a distribution of data".[^1] In SQL it's `AVG(total)`, in pandas `df["total"].mean()`, and in
a spreadsheet `AVERAGE(...)`.

## The median

Sort the values from smallest to largest. The median is "the observation right in the middle".[^1] With an even number
of values there are two middle values, and the median is their average.[^1] Half the data is below the median, half
above.[^3]

## The mode

The mode is the value that occurs most often.[^3] It's the only one of the three that works for **categories** as well
as numbers: Python's `statistics.mode` returns `'red'` for a list of colours where red appears most.[^2]

## When the mean misleads

Here are seven order totals, sorted: 12, 15, 18, 20, 25, 30, **400**.

- **Mean:** 520 / 7 ≈ **74.29**
- **Median:** **20** (the 4th of 7 values)

Six of the seven orders are 30 or less, yet the mean says a typical order is about 74. One unusually large order pulled
it up. Python's documentation puts it plainly: "The mean is strongly affected by outliers and is not necessarily a
typical example of the data points."[^2] The median "is a robust measure of central location and is less affected by the
presence of outliers."[^2]

The same thing happens when data has a long tail on one side (skewed data). "The mean will be pulled in the direction of
the skewness."[^3] Incomes, house prices, and order values usually have a long tail of large values, so their mean sits
above their median.

## Which one should you report?

- **Roughly symmetric data, no extreme values:** the mean and median are close, and the mean is fine.
- **Outliers or a long tail:** report the median, or both. For data with extreme values, "the median provides a better
  estimate of location than does the mean".[^3]
- **Categories:** use the mode ("most common").

A quick check: if the mean and median are far apart, look at the data before choosing. The gap is a sign of outliers or
skew.

## Key points

- **Mean:** the sum divided by the count. It's sensitive to outliers.
- **Median:** the middle value of the sorted data. It's robust to outliers.
- **Mode:** the most common value. It also works for categories.
- A big gap between mean and median means outliers or skew. Look before you report.
