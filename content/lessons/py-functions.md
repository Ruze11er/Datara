---
id: py-functions
title: "Functions: Reusable Steps"
summary: Package logic into named functions with inputs, return values, and defaults, the building blocks of clean analysis code.
minutes: 8
practice:
  - py-greet-customer
  - py-apply-discount
  - py-add-tax
  - py-shipping-fee
  - py-average-function
  - py-clean-name
  - py-parse-price
  - py-order-size
  - py-clean-all-names
  - py-boss-summarize-orders
sources:
  - id: 1
    title: "4. More Control Flow Tools (4.8 Defining Functions, 4.9 More on Defining Functions), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/controlflow.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does a function return if it has no return statement?
    options:
      - "0"
      - An empty text
      - "None"
      - It causes an error
    answer: 2
    explanation: Falling off the end of a function returns None. That's why a function that only prints gives back None.
  - question: Given def fee(total, free_from=50), what does fee(30) use for free_from?
    options:
      - "0"
      - "30"
      - "50"
      - Nothing, so it's an error
    answer: 2
    explanation: When the caller leaves out a parameter with a default, the default value is used.
  - question: Why is print() inside a function not a substitute for return?
    options:
      - print is slower
      - print only shows the value; the calling code can't store or use it
      - print can't show numbers
      - There is no difference
    answer: 1
    explanation: return hands the value back so it can be stored in a variable, used in a calculation, or passed on.
---

## Why functions?

So far, every piece of code ran once, top to bottom. A **function** gives a block of code a name, so you can run it again with
different inputs. In analysis code, functions keep cleaning rules and calculations **consistent**: write the rule once, use it
everywhere, and fix it in one place.

## Defining a function

"The keyword `def` introduces a function definition. It must be followed by the function name and the parenthesized list of
formal parameters. The statements that form the body of the function start at the next line, and must be indented."[^1]

```python
def apply_discount(price, rate):
    return round(price * (1 - rate), 2)

apply_discount(100, 0.2)     # 80.0
apply_discount(59.99, 0.15)  # 50.99
```

- `price` and `rate` are **parameters**: names for the inputs.
- `100` and `0.2` are **arguments**: the actual values passed in. They're matched by position.
- Defining a function doesn't run it. Calling it (`apply_discount(…)`) does.

## return vs print

"The `return` statement returns with a value from a function. `return` without an expression argument returns `None`.
Falling off the end of a function also returns `None`."[^1]

```python
def add_tax_print(amount):
    print(amount * 1.12)        # shows the number…

def add_tax(amount):
    return amount * 1.12        # …gives it back

x = add_tax_print(100)          # prints 112.0, but x is None!
y = add_tax(100)                # y is 112.0, ready to use
```

Use `print` to **look** at things; use `return` to **produce** results.

A `return` also **ends** the function immediately. That's useful for edge cases:

```python
def average(values):
    if len(values) == 0:
        return 0                # stop here for an empty list
    return round(sum(values) / len(values), 2)
```

## Default values and keyword arguments

"The most useful form is to specify a default value for one or more arguments."[^1]

```python
def shipping_fee(order_total, free_from=50):
    if order_total >= free_from:
        return 0
    return 4.99

shipping_fee(64.5)                # uses free_from=50  → 0
shipping_fee(30, free_from=25)    # keyword argument   → 0
```

Naming the argument (`free_from=25`) makes calls easier to read. One caution from the tutorial: "The default value is evaluated
only once." With a mutable default such as a list (`def f(a, L=[])`), the same list is shared between calls.[^1]
Use `None` as the default instead, and create the list inside the function.

## Functions + loops

A function cleans **one** value; a loop or list comprehension applies it to **all** of them:

```python
def clean_name(text):
    return text.strip().title()

clean_names = [clean_name(name) for name in raw_names]
```

## Good habits

- Name functions with a **verb** that says what they do: `clean_name`, `parse_price`, `summarize`.
- Use the **parameters** inside the function, not variables from outside it, so it works with any input.
- Think about **edge cases**: an empty list, a missing value, a boundary like exactly 50.

## Key takeaways

- `def name(parameters):` plus an **indented** body defines a function; calling it runs it.
- `return` gives a value back; without it, the function returns **None**.
- **Default** parameter values make simple calls simple; avoid mutable defaults like `[]`.
- Write cleaning and calculation rules **once** as functions, then apply them with loops.
