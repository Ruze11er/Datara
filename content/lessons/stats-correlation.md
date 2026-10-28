---
id: stats-correlation
title: "Correlation, Causation, and Samples"
summary: Measure how two variables move together, and avoid the most common mistakes when drawing conclusions from data.
minutes: 10
sources:
  - id: 1
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 7: Linear regression with a single predictor"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/model-slr
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 2: Study design"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/data-design
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "statistics: Mathematical statistics functions (correlation)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/statistics.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Fundamentals of Data Visualization, Chapter 5: Directory of visualizations"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/directory-of-visualizations.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: A correlation of -0.9 between price and units sold means…
    options:
      - Price has no relationship with units sold
      - A strong linear relationship. Higher prices go with fewer units sold
      - Raising prices causes sales to drop
      - The data must contain an error
    answer: 1
    explanation: The sign gives the direction (negative means one goes up as the other goes down) and the size (close to 1) gives the strength. It doesn't prove cause.
  - question: "Customers who use the mobile app spend more. Can we say the app makes people spend more?"
    options:
      - Yes, the data shows it
      - Not from this alone. It's observational data, and a confounder (such as being a loyal customer) could explain both
      - Yes, if the correlation is above 0.5
      - No, because correlation is always zero for apps
    answer: 1
    explanation: Observational data can show an association, but loyal customers may both install the app and spend more. An experiment (randomly offering the app) could test the causal claim.
  - question: You survey only customers who left a review. What's the risk?
    options:
      - None, reviews are random
      - The sample may not represent all customers, because reviewers are often especially happy or unhappy
      - The sample is too large
      - Reviews can't be analyzed
    answer: 1
    explanation: People who choose to respond can differ from everyone else. Ask who is missing from your data before generalizing.
---

## Two variables at once

So far you've described one variable at a time. Analysts often ask how two variables relate: Do higher discounts go with
more orders? Do bigger baskets go with longer delivery times?

## Scatterplots first

"Scatterplots represent the archetypical visualization when we want to show one quantitative variable relative to
another."[^4] Each dot is one row. Always look at the scatterplot before calculating anything: it shows patterns, groups,
and outliers that a single number can hide.

## The correlation coefficient

The **correlation** (Pearson's *r*) "always takes values between -1 and 1, describes the strength and direction of the
linear relationship between two variables."[^1]

| *r* | Meaning |
|---|---|
| close to +1 | strong positive: as one goes up, the other tends to go up |
| close to −1 | strong negative: as one goes up, the other tends to go down |
| near 0 | no apparent **linear** relationship[^1] |

In Python, `statistics.correlation(x, y)` calculates it.[^3]

Correlation only measures **straight-line** relationships. "Nonlinear trends, even when strong, sometimes produce
correlations that do not reflect the strength of the relationship."[^1] This is another reason to look at the scatterplot.

## Correlation is not causation

Two variables moving together doesn't mean one causes the other. Ice cream sales and sunburns rise together, but ice cream
doesn't cause sunburn: hot, sunny weather drives both.

That third variable is a **confounder**: "A confounding variable is one that is associated with both the explanatory and
response variables."[^2]

Most business data is **observational**: you record what happened without controlling it. Observational studies are
"generally only sufficient to show associations", and "making causal conclusions based on observational data can be
treacherous and is not recommended."[^2]

To test a cause, you need an **experiment**, where the researcher assigns the treatment.[^2] "Randomized experiments are
fundamentally important when trying to show a causal connection between two variables."[^2] Assigning groups at random
"helps even out" differences you can't control, such as how loyal each customer is.[^2] In business this is often an
**A/B test**, where customers are randomly shown version A or B of a page.

**How to write it:** "Customers who use the app spend 20% more" (association) instead of "The app makes customers spend
20% more" (causation), unless you ran an experiment.

## Samples and bias

You rarely have data on everyone. Your data is a **sample** from a bigger **population** you care about: "A sample is the
data you have."[^2] Conclusions only carry over to the population if the sample represents it.

- In a **simple random sample**, "each case in the population has an equal chance of being included".[^2] That's the gold
  standard.
- A **convenience sample**, "where individuals who are easily accessible are more likely to be included",[^2] can be
  badly biased. Surveying only your newsletter subscribers tells you about subscribers, not all customers.
- When many people don't respond, "caution must be exercised if the non-response rate is high".[^2] People who answer a
  survey or leave a review often differ from those who don't.

Before generalizing, always ask: **who is missing from this data?**

## Key points

- Look at a **scatterplot** first, then measure with the **correlation** *r* (−1 to +1, linear only).
- **Correlation ≠ causation.** Look for confounders. Causal claims need experiments such as A/B tests.
- Observational data shows **associations**, so word your findings that way.
- Your data is a **sample**. Check that it represents the population before generalizing.
