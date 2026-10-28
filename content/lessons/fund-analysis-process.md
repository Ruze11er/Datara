---
id: fund-analysis-process
title: The Data Analysis Process
summary: Six steps from a business question to a decision, and why you will often loop back.
minutes: 7
practice: []
sources:
  - id: 1
    title: "Foundations: Data, Data, Everywhere (Google Data Analytics Certificate, course 1)"
    publisher: Google Career Certificates, on Coursera
    url: https://www.coursera.org/learn/foundations-data
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "1.1.1. What is EDA?, NIST/SEMATECH e-Handbook of Statistical Methods"
    publisher: National Institute of Standards and Technology (NIST)
    url: https://www.itl.nist.gov/div898/handbook/eda/section1/eda11.htm
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Tidy Data"
    author: Hadley Wickham
    publisher: Journal of Statistical Software, 59(10), 2014
    url: https://www.jstatsoft.org/article/view/v059i10
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "CRISP-DM Help Overview"
    publisher: IBM SPSS Modeler documentation
    url: https://www.ibm.com/docs/en/spss-modeler/saas?topic=dm-crisp-help-overview
    accessed: 2026-10-28
    verified: true
quiz:
  - question: In which step do you find and fix problems such as duplicates, typos, and missing values?
    options:
      - Ask
      - Process
      - Share
      - Act
    answer: 1
    explanation: Process is about cleaning and organizing the data so the analysis can be trusted.
  - question: What is the main purpose of exploratory data analysis (EDA)?
    options:
      - To make the data look nicer
      - To get insight into the data, such as its structure, patterns, and unusual values
      - To delete data you do not need
      - To present final results to managers
    answer: 1
    explanation: EDA means exploring the data to understand it and spot outliers before drawing conclusions.
  - question: Halfway through analyzing, you discover the data is missing a whole month. What should you do?
    options:
      - Ignore it and finish the report
      - Go back to an earlier step to get or fix the data
      - Guess the missing numbers
      - Start a different project
    answer: 1
    explanation: The process is not a straight line. Moving back to an earlier step is normal and expected.
---

## Six steps

Google's Data Analytics course describes analysts as people who "ask the right question; prepare, process, and analyze data for
key insights; effectively share their findings with stakeholders; and provide data-driven recommendations for thoughtful action."[^1]
That gives six steps, which we will follow through one example.

> **The request:** "Our cancelled orders seem high. Can you look into it?"

### 1. Ask
Turn a vague request into a clear question. What counts as "high"? Compared with what? A better question might be:
*"What share of orders were cancelled each month in 2025, and is it rising?"*

### 2. Prepare
Find the data that can answer the question. Here, that is the `orders` table, which has each order's date and status.
Check where the data comes from and whether it covers the period you need.

### 3. Process
Clean and organize the data. Look for duplicates, spelling differences (`Cancelled` vs `cancelled`), and missing values.
This step is often bigger than people expect. As one well-known paper puts it, "a huge amount of effort is spent cleaning
data to get it ready for analysis."[^3]

### 4. Analyze
Calculate, compare, and look for patterns: count orders by month, work out the cancellation rate, look for trends.
Analysts often begin with **exploratory data analysis (EDA)**, which NIST describes as "an approach/philosophy for data
analysis" used to "maximize insight into a data set", "uncover underlying structure", and "detect outliers and anomalies."[^2]

### 5. Share
Explain the findings so others can understand them, usually with a short summary and a clear chart. For example
(made-up numbers): *"Cancellations rose from 8% to 15% after shipping fees changed in June."*

### 6. Act
Recommend what to do next, and help decision-makers act on it: *"Test free shipping for orders over $50."*

## It is a loop, not a line

Real projects rarely go straight from step 1 to step 6. IBM's documentation for CRISP-DM, a widely used process model,
notes that "the sequence of the phases is not strict. In fact, most projects move back and forth between phases as necessary."[^4]

You might find missing data while analyzing and go back to *Prepare*, or discover the question was unclear and go back to *Ask*.
That is normal, not a mistake.

## Key takeaways

- **Ask → Prepare → Process → Analyze → Share → Act.**
- Most of the time is often spent **preparing and cleaning** data.
- **EDA** is about understanding the data and spotting anything unusual before drawing conclusions.
- Expect to **loop back** to earlier steps.
