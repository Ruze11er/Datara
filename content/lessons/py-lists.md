---
id: py-lists
title: Lists
summary: Keep many values in order, pick out items, summarize, add, and sort.
minutes: 8
practice:
  - py-first-list
  - py-first-and-last
  - py-list-stats
  - py-average-rating
  - py-add-to-cart
  - py-sorting-prices
sources:
  - id: 1
    title: "3. An Informal Introduction to Python, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/introduction.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "5. Data Structures, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/datastructures.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Built-in Functions (len, sum, max, sorted)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/functions.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: If prices = [19.99, 45.0, 12.5], what is prices[1]?
    options:
      - "19.99"
      - "45.0"
      - "12.5"
      - An error
    answer: 1
    explanation: Positions start at 0, so position 1 is the second item.
  - question: What does cart = cart.append("Mug") do?
    options:
      - Adds "Mug" to cart
      - Adds "Mug" but then replaces cart with None
      - Creates a new list with only "Mug"
      - Causes a syntax error
    answer: 1
    explanation: append() changes the list and returns None, so assigning its result throws your list away. Just write cart.append("Mug").
  - question: Which gives the 3 highest prices, highest first, without changing prices?
    options:
      - "prices.sort()[:3]"
      - "sorted(prices)[:3]"
      - "sorted(prices, reverse=True)[:3]"
      - "max(prices, 3)"
    answer: 2
    explanation: sorted(..., reverse=True) returns a new list from highest to lowest, and [:3] keeps the first three.
---

## Creating a list

A list holds many values in order. The Python tutorial describes it as "a list of comma-separated values (items) between square
brackets."[^1]

```python
categories = ["Books", "Beauty", "Electronics"]
daily_orders = [12, 18, 9, 22, 15, 30, 11]
empty = []
```

Lists can hold any type of value, but usually all items have the same type.

## Getting items by position

Each item has a position, called an **index**, starting at **0**. Negative indexes count from the end.

```python
prices = [19.99, 45.0, 12.5, 89.9, 5.25]
prices[0]     # 19.99  (first)
prices[2]     # 12.5   (third)
prices[-1]    # 5.25   (last)
```

Asking for a position that doesn't exist (`prices[10]`) causes an `IndexError`.

**Slices** take a range of items: `list[start:end]` includes `start` but **not** `end`.

```python
prices[0:3]   # [19.99, 45.0, 12.5]   first three
prices[:3]    # same: start defaults to the beginning
prices[-2:]   # [89.9, 5.25]          last two
```

## Summarizing a list

Python's built-in functions summarize a whole list at once, just like SQL's aggregate functions:

| Function | Does | Example | Result |
|---|---|---|---|
| `len()` | "Return the length (the number of items)"[^3] | `len(daily_orders)` | `7` |
| `sum()` | adds the items "and returns the total"[^3] | `sum(daily_orders)` | `117` |
| `max()` | "Return the largest item"[^3] | `max(daily_orders)` | `30` |
| `min()` | returns the smallest item | `min(daily_orders)` | `9` |

An average is `sum(values) / len(values)`, which works for any number of items.

## Changing a list

Lists can be changed: "lists are a mutable type, i.e. it is possible to change their content."[^1]

```python
cart = ["Yoga Mat"]
cart.append("Running Shoes")   # ["Yoga Mat", "Running Shoes"]
cart[0] = "Yoga Block"         # replace an item
```

`append()` will "add an item to the end of the list."[^2]

**A classic mistake:** methods that change a list, like `append` and `sort`, "have no return value … they return the default
`None`."[^2] So `cart = cart.append("Mug")` replaces your list with `None`. Just write `cart.append("Mug")`.

## Sorting

`sorted()` will "return a new sorted list from the items in iterable"[^3], leaving the original untouched:

```python
prices = [24.5, 189.0, 9.99]
sorted(prices)                  # [9.99, 24.5, 189.0]
sorted(prices, reverse=True)    # [189.0, 24.5, 9.99]
sorted(prices, reverse=True)[:2]  # top two: [189.0, 24.5]
```

`prices.sort()` sorts the list **in place** instead, which changes `prices` itself. Use `sorted()` when you want to keep the original.

## Key takeaways

- Lists use **square brackets**; indexes start at **0**; `-1` is the last item.
- **Slices** `[start:end]` exclude the end position.
- `len`, `sum`, `max`, `min` summarize a list, and `sum / len` gives the average.
- `append()` and `sort()` change the list and return **None**; `sorted()` returns a **new** list.
