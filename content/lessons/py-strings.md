---
id: py-strings
title: Working with Text
summary: Strings, f-strings for clear messages, and the text methods analysts use to clean data.
minutes: 7
practice:
  - py-f-string-report
  - py-boss-receipt
sources:
  - id: 1
    title: "3. An Informal Introduction to Python, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/introduction.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "7. Input and Output, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/inputoutput.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Built-in Types (String Methods)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/stdtypes.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: 'If units = 42, what does print(f"Sold: {units} units") show?'
    options:
      - "Sold: {units} units"
      - "Sold: 42 units"
      - "f\"Sold: 42 units\""
      - An error
    answer: 1
    explanation: In an f-string, {units} is replaced by the variable's value.
  - question: What does "  Yoga Mat  ".strip() return?
    options:
      - "\"Yoga Mat\""
      - "\"YogaMat\""
      - "\"  Yoga Mat\""
      - "\"yoga mat\""
    answer: 0
    explanation: strip() removes spaces from the start and end only, not from the middle.
  - question: If total = 88.2, what does f"${total:.2f}" produce?
    options:
      - "$88.2"
      - "$88.20"
      - "$88"
      - "$total"
    answer: 1
    explanation: ":.2f shows the number with exactly 2 decimal places."
---

## Strings

Text in Python is called a **string** (`str`). Strings "can be enclosed in single quotes (`'...'`) or double quotes (`"..."`)
with the same result."[^1]

```python
product = "Yoga Mat"
category = 'Sports & Outdoors'
```

"The built-in function `len()` returns the length of a string"[^1]: `len("Yoga Mat")` is `8`, counting the space.
Strings can be indexed like lists, "with the first character having index 0"[^1], so `product[0]` is `"Y"`.

Strings can't be changed in place: "Python strings cannot be changed — they are immutable."[^1] Methods like `.lower()`
give you a **new** string instead, so store the result: `name = name.lower()`.

## f-strings: mixing text and values

Formatted string literals, "also called f-strings for short", "let you include the value of Python expressions inside a string
by prefixing the string with `f` or `F` and writing expressions as `{expression}`."[^2]

```python
product = "Yoga Mat"
units_sold = 42
print(f"{product}: {units_sold} units sold")   # Yoga Mat: 42 units sold
```

You can even calculate inside the brackets: `f"Revenue: {units_sold * 28.0}"`.

### Formatting numbers

"An optional format specifier can follow the expression"[^2], after a colon. The most useful one for money is `:.2f`,
which shows exactly 2 decimal places:

```python
total = 88.2
print(f"Total: ${total:.2f}")      # Total: $88.20
print(f"Share: {0.4567:.1%}")      # Share: 45.7%
```

`:.2f` changes only how the number is **displayed**. `round()` changes the value itself.

## Joining with + (and why it fails)

```python
print("Sold: " + 42)        # TypeError: can only concatenate str (not "int") to str
print("Sold: " + str(42))   # Sold: 42
```

`+` only joins text to text. Convert numbers with `str()`, or just use an f-string, which is easier.

## Text methods for cleaning data

Real data is messy: extra spaces, inconsistent capitals, odd separators. These methods fix the most common problems:

| Method | What it does | Example | Result |
|---|---|---|---|
| `.strip()` | "Return a copy of the string with the leading and trailing characters removed."[^3] (spaces by default) | `"  Books ".strip()` | `"Books"` |
| `.lower()` | Converts all letters to lowercase[^3] | `"BOOKS".lower()` | `"books"` |
| `.upper()` | Converts all letters to uppercase[^3] | `"usa".upper()` | `"USA"` |
| `.title()` | Words start with a capital[^3] | `"yoga mat".title()` | `"Yoga Mat"` |
| `.replace(old, new)` | Replaces "all occurrences of substring old" with new[^3] | `"Air-Fryer".replace("-", " ")` | `"Air Fryer"` |
| `.split(sep)` | "Return a list of the words in the string, using sep as the delimiter"[^3] | `"a,b,c".split(",")` | `["a", "b", "c"]` |

Methods can be chained: `"  BOOKS ".strip().lower()` gives `"books"`.

## Key takeaways

- Strings go in **quotes**. `len()` counts characters, and indexes start at **0**.
- **f-strings** (`f"...{value}..."`) are the easiest way to mix text and values. `:.2f` shows 2 decimals.
- `+` only joins strings; convert numbers with `str()`.
- `.strip()`, `.lower()`, `.replace()`, and `.split()` are everyday **data-cleaning** tools. Store their result.
