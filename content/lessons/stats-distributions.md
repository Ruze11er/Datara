---
id: stats-distributions
title: "Distributions, Skew, and Outliers"
summary: Look at the shape of your data with histograms and box plots, and handle outliers carefully.
minutes: 8
practice:
  - sql-price-bands
  - sql-band-counts
sources:
  - id: 1
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 5: Exploring numerical data"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/explore-numerical
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "NIST/SEMATECH e-Handbook of Statistical Methods, 1.3.5.1 Measures of Location"
    publisher: National Institute of Standards and Technology (NIST)
    url: https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Fundamentals of Data Visualization, Chapter 5: Directory of visualizations"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/directory-of-visualizations.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Most orders are small, but a few are very large. What shape is this distribution?
    options:
      - Symmetric
      - Right skewed (a long tail to the right)
      - Left skewed
      - Bimodal
    answer: 1
    explanation: A long tail of large values on the right makes a distribution right skewed. Its mean is pulled above the median.
  - question: A histogram of delivery times has two clear peaks. What could that suggest?
    options:
      - The data has no pattern
      - There may be two different groups mixed together, such as two warehouses
      - The mean is wrong
      - The data is right skewed
    answer: 1
    explanation: A bimodal distribution often means two different groups are mixed in one column. It's worth splitting the data to check.
  - question: You find one order with a total of 99,999. What should you do first?
    options:
      - Delete it immediately
      - Investigate it. It could be a data error or a real, important order
      - Replace it with the mean
      - Ignore it, because outliers don't affect anything
    answer: 1
    explanation: An outlier is a question, not an answer. Check where it came from before deciding whether to fix, exclude, or keep it, and say what you did.
---

## A distribution is the whole picture

The **distribution** of a variable is how its values are spread out: which values are common, which are rare, and where the
extremes are. Averages and standard deviations summarize it in a couple of numbers. Looking at the shape shows what those
numbers hide.

## Histograms

A **histogram** splits the values into bins (for example, orders worth 0–20, 20–40, …) and draws a bar for how many
values fall in each. "Histograms provide a view of the data density":[^1] tall bars are where the data is crowded. You
already built the table behind a histogram in the SQL Lab when you counted products per price band.

Histograms give the most intuitive view of a distribution, but they need choices like the bin width, and the picture
changes with them,[^3] so try a couple of widths.

## Shape: symmetric or skewed

- **Symmetric:** the left and right sides look roughly alike, and the mean and median are close.
- **Skewed:** "When data trail off in one direction, the distribution has a long tail. If a distribution has a long right
  tail, it is right skewed."[^1] A long left tail makes it left skewed.

Many business variables are right skewed: most customers spend a little, a few spend a lot. In skewed data, "the mean will
be pulled in the direction of the skewness",[^2] which is why the median is often the better "typical" value.

## Peaks (modes)

"A mode is represented by a prominent peak in the distribution."[^1] Distributions with one, two, or more peaks are called
**unimodal**, **bimodal**, and **multimodal**.[^1] Two peaks often mean two different groups are mixed together, for
example weekday and weekend orders. Splitting the data by a category column can reveal them.

## Box plots

A **box plot** squeezes a distribution into five numbers: the box runs from Q1 to Q3 with a line at the median, and
"whiskers" reach out towards the smallest and largest typical values. Box plots are useful for **comparing** several
distributions side by side,[^3] for example delivery times per warehouse.

## Outliers

"An outlier is an observation that appears extreme relative to the rest of the data."[^1] A common rule of thumb flags any
value more than 1.5 × IQR beyond the box (below Q1 or above Q3) as a possible outlier.[^1] Box plots draw them as single
dots.

An outlier is a **question**, not an automatic delete. It might be:

- **A data error**, like a price typed as 99999 instead of 99.99. Fix it if you can confirm the right value.
- **A real but unusual case**, like a huge corporate order. It's real business: keep it, and consider reporting the median
  so it doesn't distort the "typical" value.
- **Something you should report.** Sometimes the outlier is the finding (fraud, a pricing bug, a viral product).

Whatever you decide, write down what you did and why, so others can trust your numbers.

## Key points

- Look at the **shape** before trusting summary numbers.
- **Histograms** show where values crowd. **Box plots** compare groups.
- **Right skewed** means a long tail of large values, so the mean is above the median.
- Two peaks may mean two groups mixed together.
- **Investigate outliers** before removing them, and document the decision.
