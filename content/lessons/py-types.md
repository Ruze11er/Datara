---
id: py-types
title: Data Types and Conversion
summary: Numbers, text, and True/False, plus how to fix numbers that arrive as text.
minutes: 6
practice:
  - py-text-to-number
  - py-boss-receipt
sources:
  - id: 1
    title: "Built-in Types"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/stdtypes.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Functions (type, int, float, str, bool)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/functions.html
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "15. Floating-Point Arithmetic: Issues and Limitations, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/floatingpoint.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What is the type of "19.99" (with quotes)?
    options:
      - float
      - int
      - str
      - bool
    answer: 2
    explanation: Anything in quotes is text (str), even if it looks like a number.
  - question: Which converts the text "3" into a number you can multiply?
    options:
      - "str(\"3\")"
      - "int(\"3\")"
      - "type(\"3\")"
      - "\"3\" * 1"
    answer: 1
    explanation: int() converts text that looks like a whole number into an int. ("3" * 1 just gives the text "3".)
  - question: In Python, is 0.1 + 0.1 + 0.1 == 0.3 True?
    options:
      - Yes, always
      - No. Decimal numbers are stored approximately, so it is False
      - It causes an error
      - Only on some computers
    answer: 1
    explanation: Floats are binary approximations. Round before comparing, or compare with a small tolerance.
---

## Every value has a type

Python keeps track of what kind of value each variable holds. The types you'll use most:

| Type | Name | Examples |
|---|---|---|
| `int` | whole number (integer) | `42`, `-3`, `2025` |
| `float` | decimal number (floating-point) | `19.99`, `0.12`, `5.0` |
| `str` | text (string) | `"Yoga Mat"`, `"19.99"` |
| `bool` | true or false (Boolean) | `True`, `False` |
| `NoneType` | no value | `None` |

"There are three distinct numeric types: integers, floating-point numbers, and complex numbers."[^1] (You won't need complex
numbers for data analysis.)

To check a type, use `type()`: "With one argument, return the type of an object."[^2]

```python
type(42)        # <class 'int'>
type(19.99)     # <class 'float'>
type("19.99")   # <class 'str'>   ← text, not a number!
```

## Converting between types

Data from spreadsheets, CSV files, and web forms often arrives as **text**, even when it looks like a number. You must
convert it before doing maths:

| Function | Does | Example | Result |
|---|---|---|---|
| `int()` | "Return an integer object constructed from a number or a string"[^2] | `int("3")` | `3` |
| `float()` | "Return a floating-point number constructed from a number or a string."[^2] | `float("19.99")` | `19.99` |
| `str()` | "Return a str version of object."[^2] | `str(42)` | `"42"` |

```python
price_text = "19.99"
qty_text = "3"
total = float(price_text) * int(qty_text)   # 59.97
```

Watch out: `int("19.99")` fails with a `ValueError`, because `int()` only accepts text that looks like a whole number.
Use `float()` for decimals.

## True and False

`bool` values come from comparisons and are the basis of every decision your code makes:

```python
order_total = 64.5
free_shipping = order_total >= 50   # True
```

`bool()` will "return a Boolean value, i.e. one of `True` or `False`."[^2] Note the capital T and F. Writing `true` causes
a `NameError`.

## A surprise with decimal numbers

Computers store decimals in binary, and "most decimal fractions cannot be represented exactly as binary fractions."[^3] So:

```python
0.1 + 0.1 + 0.1 == 0.3    # False!
```

This isn't a mistake in your code. It comes from how computers store decimal numbers. The practical fixes:

- **Round** results for display: `round(value, 2)`.
- When comparing calculated decimals, compare **rounded** values, or check that they are very close.

The Python Lab's checker allows for these tiny differences, so you won't be marked wrong because of them.

## Key takeaways

- The main types are **int**, **float**, **str**, **bool**, and **None**. Check with `type()`.
- Numbers in quotes are **text**. Convert with `int()` or `float()` before calculating.
- `True` and `False` are capitalized and come from **comparisons**.
- Decimal numbers are **approximate**, so **round** before showing or comparing them.
