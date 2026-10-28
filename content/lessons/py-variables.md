---
id: py-variables
title: Variables and Arithmetic
summary: Store values in variables, calculate with them, and round the results.
minutes: 7
practice:
  - py-first-variables
  - py-order-total
  - py-price-with-tax
  - py-average-of-three
  - py-round-revenue
  - py-boxes-and-leftovers
sources:
  - id: 1
    title: "3. An Informal Introduction to Python, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/introduction.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Functions (round)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/functions.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What is the value of 7 / 2 in Python?
    options:
      - "3"
      - "3.5"
      - "4"
      - "1"
    answer: 1
    explanation: Division with / always gives a float (a decimal number).
  - question: 47 mugs go into boxes of 6. Which expression gives the number of mugs left over?
    options:
      - "47 / 6"
      - "47 // 6"
      - "47 % 6"
      - "47 ** 6"
    answer: 2
    explanation: "% gives the remainder: 47 % 6 is 5. (47 // 6 is 7, the number of full boxes.)"
  - question: What does (10 + 20) / 2 give, and what does 10 + 20 / 2 give?
    options:
      - 15.0 and 20.0
      - 15.0 and 15.0
      - 20.0 and 15.0
      - Both cause an error
    answer: 0
    explanation: Brackets are calculated first. Without them, division happens before addition.
---

## Variables: named values

A **variable** is a name that holds a value. "The equal sign (`=`) is used to assign a value to a variable."[^1]

```python
price = 24.5
quantity = 3
store_name = "Datara Shop"
```

Read `price = 24.5` as "**price** now holds 24.5", not as "price equals 24.5" in the maths sense. You can change a variable
later by assigning a new value.

Variable names can contain letters, numbers, and underscores (but can't start with a number). Use clear, lowercase names
like `total_sales` rather than `x`. Capital letters matter: `Price` and `price` are different variables.

If you use a variable before giving it a value, Python stops with an error: "If a variable is not 'defined' (assigned a value),
trying to use it will give you an error."[^1]

## Arithmetic

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | add | `10 + 3` | `13` |
| `-` | subtract | `10 - 3` | `7` |
| `*` | multiply | `10 * 3` | `30` |
| `/` | divide | `10 / 4` | `2.5` |
| `//` | floor division (whole result) | `47 // 6` | `7` |
| `%` | remainder | `47 % 6` | `5` |
| `**` | power | `2 ** 3` | `8` |

Some details worth knowing, straight from the Python tutorial:

- "Division (`/`) always returns a float"[^1], meaning a decimal number, even for `10 / 2` (which gives `5.0`).
- "To do floor division and get an integer result you can use the `//` operator; to calculate the remainder you can use `%`."[^1]
- You can "use the `**` operator to calculate powers."[^1]

## Calculating with variables

```python
total = price * quantity              # 73.5
average = (1250.0 + 980.5 + 1430.0) / 3
```

Python follows the usual maths order: `**` first, then `*`, `/`, `//`, `%`, then `+` and `-`. Use **brackets** whenever you want
something calculated first. For an average, the brackets are essential: without them, only the last number is divided.

Calculate from variables instead of typing results. If `price` changes, `total = price * quantity` is still right,
while `total = 73.5` silently becomes wrong.

## Rounding

`round()` will "return number rounded to ndigits precision after the decimal point."[^2]

```python
revenue = 1234.5678
round(revenue, 2)   # 1234.57
round(revenue)      # 1235  (no second number: round to a whole number)
```

Round at the **end**, when presenting results. Rounding in the middle of a calculation can make the final answer drift.

## Key takeaways

- `name = value` stores a value in a variable. Names are **case-sensitive**.
- `/` gives a decimal; `//` gives the whole part; `%` gives the remainder; `**` is a power.
- Use **brackets** to control the order of calculation.
- `round(value, 2)` rounds to 2 decimals. Round **at the end**.
