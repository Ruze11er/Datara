---
id: story-choosing-charts
title: "Choosing the Right Chart"
summary: Start from the message, then pick the chart that shows it best, whether that's amounts, trends, distributions, shares, or relationships.
minutes: 8
sources:
  - id: 1
    title: "Fundamentals of Data Visualization, Chapter 5: Directory of visualizations"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/directory-of-visualizations.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Fundamentals of Data Visualization, Chapter 6: Visualizing amounts"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/visualizing-amounts.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Data visualisation: charts"
    publisher: Government Analysis Function (UK)
    url: https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/
    accessed: 2026-10-28
    verified: true
quiz:
  - question: You want to show monthly revenue over the last two years. Which chart fits best?
    options:
      - Pie chart
      - Line chart with months on the x axis
      - Scatterplot of revenue against product ID
      - A single bar
    answer: 1
    explanation: Line charts are the usual choice when the x axis is time, and they make the trend easy to follow.
  - question: Your bar chart compares revenue for 12 product categories that have no natural order. How should you order the bars?
    options:
      - Alphabetically
      - By value, from largest to smallest (or smallest to largest)
      - Randomly
      - By category ID
    answer: 1
    explanation: For unordered categories, sorting by value makes the ranking readable at a glance.
  - question: When is a pie chart a reasonable choice?
    options:
      - Comparing 15 categories of similar size
      - Showing parts of a whole with only a few categories, one of them clearly dominant
      - Showing a trend over time
      - Showing the relationship between price and rating
    answer: 1
    explanation: Pie charts show that parts add up to a whole, but they get hard to read with many similar-sized slices.
---

## Start with the message

A chart is an argument made with pictures. The UK Government Analysis Function's guidance opens its advice on choosing a
chart with: "Think about the message your chart is aiming to get across."[^3]

Write the message as a sentence first, such as "Revenue grew every month except June" or "Electronics brings in half our
revenue". Then pick the chart that makes that sentence obvious. If you can't write the sentence, you aren't ready to make
the chart.

## A chart for each kind of question

| Your question is about… | Use | Example |
|---|---|---|
| **Amounts**: comparing values across categories | Bar chart | Revenue per category |
| **Change over time** | Line chart | Monthly orders |
| **Distribution**: how values are spread | Histogram or box plot | Order values |
| **Proportions**: parts of a whole | Stacked bar, or pie chart for a few parts | Share of orders by payment method |
| **Relationship** between two numbers | Scatterplot | Price vs. average rating |

Some notes from Wilke's *Fundamentals of Data Visualization*:

- **Amounts:** bars, vertical or horizontal, are the most common way to show values for a set of categories.[^1]
- **Time:** line graphs are commonly drawn when the x axis is time.[^1]
- **Distributions:** histograms give the most intuitive view of one distribution. Box plots are useful when comparing
  many distributions at once.[^1]
- **Proportions:** pie charts emphasize that the parts add up to a whole. Stacked bars help when comparing several sets
  of proportions.[^1]
- **Relationships:** "Scatterplots represent the archetypical visualization when we want to show one quantitative
  variable relative to another."[^1]

## Making bar charts readable

- **Sort the bars.** "If the bars represent unordered categories, order them by ascending or descending data
  values."[^2] Alphabetical order hides the ranking. Keep natural orders (months, age groups) as they are.
- **Long labels?** "The better solution for long labels is usually to swap the x and the y axis, so that the bars run
  horizontally."[^2] Horizontal bars beat rotated, unreadable labels.

## Be careful with pie charts

Pie charts are popular but hard to read precisely. The Analysis Function notes that "pie charts are not the best in terms
of accessibility", and suggests them only for a small number of categories (five or fewer) where one category is
dominant.[^3] Otherwise, use a sorted bar chart.

## Key points

- Write the **message** as a sentence first, then choose the chart.
- Use **bars** for amounts, **lines** for time, **histograms or box plots** for distributions, **scatterplots** for
  relationships.
- **Sort bars** by value, and make them **horizontal** for long labels.
- Use **pie charts** rarely: only a few parts, with one dominant.
