---
id: py-loops
title: "Repeating Work: for Loops"
summary: Loop over lists and dictionaries to total, count, filter, and group data, the building blocks of analysis.
minutes: 9
practice:
  - py-print-each-product
  - py-loop-total
  - py-count-big-orders
  - py-filter-affordable
  - py-out-of-stock-list
  - py-delivered-revenue
  - py-boss-category-totals
sources:
  - id: 1
    title: "4. More Control Flow Tools (4.2 for Statements, 4.3 range), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/controlflow.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "5. Data Structures (List Comprehensions, Looping Techniques), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/datastructures.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "3. An Informal Introduction to Python, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/introduction.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: How many times does the indented code run in for p in ["a", "b", "c"]?
    options:
      - "1"
      - "3"
      - "4"
      - It depends on the code inside
    answer: 1
    explanation: A for loop runs its block once per item in the list.
  - question: To total values with a loop, where should total = 0 go?
    options:
      - Inside the loop
      - Before the loop
      - After the loop
      - It isn't needed
    answer: 1
    explanation: Start the total once, before the loop. Inside the loop, it would reset to 0 on every item.
  - question: What does range(5) produce?
    options:
      - 1, 2, 3, 4, 5
      - 0, 1, 2, 3, 4
      - 0, 1, 2, 3, 4, 5
      - "5"
    answer: 1
    explanation: range(5) starts at 0 and stops before 5, giving 5 numbers.
---

## The for loop

"Python's `for` statement iterates over the items of any sequence (a list or a string), in the order that they appear in the
sequence."[^1]

```python
products = ["Yoga Mat", "Air Fryer", "Smartwatch"]

for product in products:
    print(f"- {product}")
```

The indented block runs once per item, and `product` holds the current item each time. The name `product` is your choice;
pick one that describes a single item. As with `if`, the `for` line ends with a colon and its body is indented.

## Four loop patterns every analyst uses

### 1. Total (the accumulator)

```python
total = 0                 # start BEFORE the loop
for amount in sales:
    total += amount       # same as total = total + amount
```

### 2. Count matching items

```python
big_orders = 0
for value in order_values:
    if value > 100:
        big_orders += 1
```

### 3. Filter into a new list

```python
affordable = []
for price in prices:
    if price < 30:
        affordable.append(price)
```

"List comprehensions provide a concise way to create lists"[^2], so the same filter fits on one line:

```python
affordable = [price for price in prices if price < 30]
```

### 4. Group into a dictionary

```python
totals = {}
for sale in sales:
    category = sale["category"]
    totals[category] = totals.get(category, 0) + sale["amount"]
```

This is SQL's `GROUP BY category` with `SUM(amount)`, written by hand. Seeing how it works makes pandas' `groupby()` much easier
to understand later.

## Looping over records

Table-like data is often a **list of dictionaries**, one per row:

```python
orders = [
    {"id": 1001, "status": "Delivered", "total": 45.0},
    {"id": 1002, "status": "Cancelled", "total": 120.5},
]

delivered = 0
for order in orders:
    if order["status"] == "Delivered":
        delivered += order["total"]
```

For dictionaries, `.items()` gives each key and value together:

```python
for name, units in stock.items():
    if units == 0:
        print(f"{name} is sold out")
```

## Looping over numbers with range()

"If you do need to iterate over a sequence of numbers, the built-in function `range()` comes in handy."[^1] Remember that
"the given end point is never part of the generated sequence"[^1]: `range(5)` gives 0, 1, 2, 3, 4.

```python
for day in range(1, 8):
    print(f"Day {day}")      # Day 1 … Day 7
```

## Indentation decides what is inside the loop

"The body of the loop is *indented*: indentation is Python's way of grouping statements."[^3] Compare:

```python
for amount in sales:
    total += amount
    print(total)        # inside: prints after every item

for amount in sales:
    total += amount
print(total)            # outside: prints once, at the end
```

## Key takeaways

- `for item in collection:` runs the indented block **once per item**.
- The core patterns: **total**, **count**, **filter**, and **group**. Set up the result **before** the loop.
- Loop over **lists of dictionaries** to process records; use `.items()` for dictionaries.
- `range(n)` gives 0 to n−1. **Indentation** decides what's inside the loop.
