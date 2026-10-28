---
id: story-presenting
title: "Presenting Your Findings"
summary: Lead with the answer, write for your audience, give numbers context, and be honest about uncertainty.
minutes: 8
sources:
  - id: 1
    title: "Writing about statistics"
    publisher: Government Analysis Function (UK)
    url: https://analysisfunction.civilservice.gov.uk/policy-store/writing-about-statistics/
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Introduction to Modern Statistics (2nd ed.), Chapter 2: Study design"
    author: Mine Çetinkaya-Rundel and Johanna Hardin
    publisher: OpenIntro
    url: https://openintro-ims.netlify.app/data-design
    accessed: 2026-10-28
    verified: true
quiz:
  - question: Your manager asked why sales fell last month. How should your report start?
    options:
      - With a description of the database tables you used
      - With the answer, for example "Sales fell 8%, mostly because the top product was out of stock for two weeks"
      - With every chart you made, in the order you made them
      - With your SQL queries
    answer: 1
    explanation: Put the most important message first. Methods and details come after, for readers who want them.
  - question: Which sentence gives the number useful context?
    options:
      - "Returns were 412 this month."
      - "Returns were 412 this month, up from about 300 in each of the previous six months, the highest this year."
      - "Returns were 412.0000 this month."
      - "Returns changed."
    answer: 1
    explanation: Comparing with previous periods tells the reader whether the number is typical or unusual.
  - question: Why report "about 23%" instead of "23.4817%"?
    options:
      - Long numbers are against the rules
      - Too many digits suggest more accuracy than the data has, and are harder to read
      - Percentages must be whole numbers
      - It doesn't matter
    answer: 1
    explanation: Match the detail to the precision of your data. Extra decimals look precise but rarely are.
---

## The analysis isn't finished until someone understands it

You can write a perfect query and still fail if nobody understands or acts on the result. Communicating findings is part
of the analyst's job, not an extra. The UK Government Analysis Function's guidance on writing about statistics is a
practical guide, and this lesson follows it.

## Know your audience

"A sound understanding of the users and uses of your statistics is essential to delivering effective commentary."[^1]
Before writing, ask:

- **Who** will read this: a manager, an engineer, a client?
- **What decision** will they make with it?
- **What do they already know**, and which terms will they not know?

A one-line answer for a busy manager and a detailed method note for a fellow analyst can come from the same analysis.

## Lead with the answer

"Focus on the most important, useful and relevant messages and present these up front."[^1] Start with the answer to the
question you were asked. Don't start with how you got there.

A simple structure that works for most reports:

1. **The answer.** One or two sentences with the main finding.
2. **The evidence.** Two or three key numbers or charts that support it.
3. **The context and caveats.** What the numbers are compared with, and what they can't tell us.
4. **The next step.** A recommendation or the decision it supports.
5. **The method.** How you did it, at the end or in an appendix.

## Plain language

"Avoid technical language, jargon and acronyms."[^1] Write "orders that were cancelled" and not "rows where
status = 'Cancelled'". Write "typical order value (median)" and not just "p50". Your SQL and Python belong in the method
section, not in the headline.

## Give numbers context

A number on its own means little. "Do not report on changes without discussing the context".[^1] Help the reader
"understand whether this is typical or unusual in comparison to previous statistics",[^1] and "don't focus solely on the
latest numbers, or on point-to-point comparisons in isolation".[^1]

- ❌ "Returns were 412 this month."
- ✅ "Returns were 412 this month, up from about 300 in each of the previous six months."

## Round sensibly

"Make sure that the level of numerical detail is appropriate given the precision of the numbers you are reporting."[^1]
"Figures with lots of detail give an impression of high accuracy that may be unwarranted."[^1] Write "about 23%", not
"23.4817%". Keep the exact figures in your working files.

## Be honest about uncertainty and limits

Your commentary should help readers "understand the extent of uncertainty in the statistics".[^1] Say clearly what the data
can't show. For example:

- "This covers online orders only."
- "Two weeks of data are missing because of a system outage."
- "Customers who use the app spend more, but this data can't show that the app **causes** it."

That last kind of caveat matters: observational data is generally only enough to show associations, not causes.[^2] Being
clear about limits makes people trust you more, not less.

## Key points

- **Know your audience** and the decision they need to make.
- **Lead with the answer**, then evidence, context, next step, and method.
- Use **plain language** and keep code and jargon out of the headline.
- Give every number **context** and **round sensibly**.
- **State limitations** honestly, especially association versus causation.
