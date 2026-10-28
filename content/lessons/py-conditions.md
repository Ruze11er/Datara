---
id: py-conditions
title: "Making Decisions: if, elif, else"
summary: Compare values, combine conditions with and/or, and run different code for different cases.
minutes: 7
practice:
  - py-free-shipping
  - py-stock-status
  - py-sale-rules
sources:
  - id: 1
    title: "4. More Control Flow Tools (4.1 if Statements), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/controlflow.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Types (Boolean Operations, Comparisons)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/stdtypes.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What is the difference between = and ==?
    options:
      - There is no difference
      - "= stores a value in a variable; == compares two values"
      - "== stores a value; = compares"
      - "== is only for text"
    answer: 1
    explanation: A single = assigns. A double == asks "are these equal?" and gives True or False.
  - question: stock is 0. Which status does this code set? if stock < 10 then "Low stock", elif stock == 0 then "Out of stock".
    options:
      - Low stock
      - Out of stock
      - Both
      - Neither
    answer: 0
    explanation: Python runs only the first true branch. 0 < 10 is true, so it never reaches the elif. Put the most specific check first.
  - question: Which correctly checks that category is Books or Beauty?
    options:
      - "category == \"Books\" or \"Beauty\""
      - "category == \"Books\" or category == \"Beauty\""
      - "category == (\"Books\" and \"Beauty\")"
      - "category = \"Books\" or \"Beauty\""
    answer: 1
    explanation: Each side of or must be a full comparison. A non-empty text like "Beauty" on its own always counts as true.
---

## Comparisons give True or False

| Operator | Meaning |
|---|---|
| `==` | "equal"[^2] |
| `!=` | "not equal"[^2] |
| `<`, `<=` | less than, less than or equal |
| `>`, `>=` | greater than, greater than or equal |

```python
order_total = 64.5
order_total >= 50          # True
"Books" == "books"         # False: capital letters matter
```

Don't mix up `=` and `==`: `=` **stores** a value, `==` **compares** two values.

## if, elif, else

```python
stock = 8

if stock == 0:
    status = "Out of stock"
elif stock < 10:
    status = "Low stock"
else:
    status = "In stock"
```

Python checks each condition from top to bottom and runs **only the first block that is true**. "There can be zero or more
`elif` parts, and the `else` part is optional. The keyword `elif` is short for 'else if'."[^1]

Two rules of Python's syntax:

1. The `if`, `elif`, and `else` lines end with a **colon** `:`.
2. The code that belongs to each one is **indented** (4 spaces is standard). The indentation is how Python knows where each
   block starts and ends.

**Order matters:** if you checked `stock < 10` first, a stock of 0 would get "Low stock", because 0 is less than 10 and
Python stops at the first true condition.

## Combining conditions: and, or, not

From Python's documentation:[^2]

- `x or y`: "if x is true, then x, else y". In practice, the result is true when **at least one** side is true.
- `x and y`: "if x is false, then x, else y". In practice, the result is true only when **both** sides are true.
- `not x`: "if x is false, then `True`, else `False`".

```python
on_sale = category == "Books" and price < 20
gift_eligible = category == "Toys & Games" or price > 100
```

**A common mistake:** `category == "Books" or "Beauty"`. Python reads this as `(category == "Books") or "Beauty"`,
and since `"Beauty"` is non-empty text, it always counts as true. Write the full comparison on both sides:
`category == "Books" or category == "Beauty"`, or use `category in ["Books", "Beauty"]`.

## Key takeaways

- Comparisons (`==`, `!=`, `<`, `>`, `<=`, `>=`) produce **True or False**. `=` is not `==`.
- `if` / `elif` / `else` lines end with a **colon**, and their code is **indented**.
- Python runs **only the first true branch**, so order your conditions carefully.
- `and` needs **both** sides true; `or` needs **at least one**. Write full comparisons on each side.
