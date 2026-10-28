---
id: story-clear-charts
title: "Designing Honest, Clear Charts"
summary: Start bars at zero, write titles that state the message, label directly, remove clutter, and use colour with purpose.
minutes: 8
sources:
  - id: 1
    title: "Fundamentals of Data Visualization, Chapter 17: The principle of proportional ink"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/proportional-ink.html
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
    title: "Fundamentals of Data Visualization, Chapter 19: Common pitfalls of color use"
    author: Claus O. Wilke
    publisher: O'Reilly Media (free online author manuscript)
    url: https://clauswilke.com/dataviz/color-pitfalls.html
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "Data visualisation: charts"
    publisher: Government Analysis Function (UK)
    url: https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/
    accessed: 2026-10-28
    verified: true
quiz:
  - question: A bar chart's y axis starts at 95 instead of 0. Store A sold 98 units and Store B 100. What's the problem?
    options:
      - There's no problem
      - Store B's bar looks about 2.5 times as tall, though it sold only about 2% more
      - The bars will be too short to see
      - Bar charts can't show numbers under 100
    answer: 1
    explanation: Bar length must be proportional to the value. Above a baseline of 95, the bars are 3 and 5 units tall, which exaggerates a tiny difference.
  - question: Which chart title follows the guidance best?
    options:
      - "Revenue"
      - "Figure 3"
      - "Online revenue overtook in-store revenue in March"
      - "Chart of revenue data (USD) by channel and month"
    answer: 2
    explanation: The headline title should state the chart's message. Put the details (data, units, period) in a subtitle.
  - question: Why label lines directly instead of using a colour legend?
    options:
      - Legends are not allowed
      - Readers don't have to match colours back and forth, which also helps people with colour-vision deficiency
      - Direct labels make the chart bigger
      - Lines can't be coloured
    answer: 1
    explanation: Legends rely on matching colours, which is slow and fails for some readers. Direct labels avoid both problems.
---

## The principle of proportional ink

"The sizes of shaded areas in a visualization need to be proportional to the data values they represent."[^1] This is the
principle of proportional ink, and it's the reason for the most important rule in bar charts:

**Bars must start at zero.** "One important limitation of bars is that they need to start at zero, so that the bar length
is proportional to the amount shown."[^2]

Suppose Store A sold 98 units and Store B sold 100. With the axis starting at 95, Store A's bar is 3 units tall and Store
B's is 5, so B looks almost twice as big for a 2% difference. Wilke calls a bar chart where every bar starts at $50,000 of
income "quite misleading".[^1] The Analysis Function also calls breaking the numerical axis on a bar chart "problematic
and highly controversial".[^4]

If the differences you care about are small compared to the values, don't cut the bars. Use a chart that doesn't depend
on length, like a dot plot,[^4] or show the **change** itself (for example, "+2%").

## Titles that say something

"The headline title should communicate the headline message of the chart."[^4] Compare:

- ❌ "Monthly revenue"
- ✅ "Online revenue overtook in-store revenue in March"

Put the details in a **subtitle**: what the data is, where, and when (for example, "Revenue in USD by sales channel,
January to June 2025").[^4]

## Labels

"All axes, series, sectors and bars used in charts should be clearly labelled so it is clear what the graph is
showing."[^4] Include units (USD, %, days).

For line charts, label each line **directly** at its end and avoid legends "unless necessary".[^4] A legend makes readers
match colours back and forth, which is slow and can fail for readers who can't tell the colours apart.[^4]

## Remove clutter

"We advise to keep charts as simple as possible."[^4] The guidance lists things to avoid, such as shaded backgrounds,
unnecessary borders, shadows, heavy gridlines, and 3D shapes.[^4] Every mark on the chart should help the reader
understand the data. If it doesn't, delete it.

## Colour with a purpose

- **Few colours.** Colour scales for categories "work best when there are three to five different categories". Beyond
  about eight, label the items directly instead.[^3]
- **Design for everyone.** "Approximately 8% of males and 0.5% of females suffer from some sort of color-vision
  deficiency."[^3] Don't rely on red against green alone.
- **Highlight, don't decorate.** Avoid "coloring for the sake of coloring". Colour should make figures "easier to read,
  not … obscure the data".[^3] A useful pattern: grey for everything, and one strong colour for the thing your message is
  about.

## Key points

- **Proportional ink:** bar charts start at zero, always.
- The **title states the message**. The subtitle gives the details.
- **Label** axes, units, and lines directly. Avoid legends where you can.
- **Declutter:** no 3D, no shadows, no heavy gridlines.
- Use **few colours**, design for colour-blind readers, and use colour to highlight.
