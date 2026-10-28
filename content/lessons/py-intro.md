---
id: py-intro
title: Why Python for Data Analysis?
summary: What Python is, why analysts use it, and how the Python Lab runs your code.
minutes: 5
practice:
  - py-hello-data
sources:
  - id: 1
    title: "The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/index.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "pandas (project homepage)"
    publisher: pandas development team
    url: https://pandas.pydata.org/
    accessed: 2026-10-28
    verified: true
  - id: 3
    title: "Pyodide documentation"
    publisher: Pyodide project
    url: https://pyodide.org/en/stable/
    accessed: 2026-10-28
    verified: true
  - id: 4
    title: "3. An Informal Introduction to Python, The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/introduction.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: What does print("Total:", 42) do?
    options:
      - Saves the text to a file
      - "Shows Total: 42 in the output"
      - Creates a variable called Total
      - Nothing, print only works with text
    answer: 1
    explanation: print() displays values. You can pass several values separated by commas.
  - question: What does Python do with a line that starts with #?
    options:
      - Runs it twice
      - Treats it as an error
      - Ignores it, because it is a comment
      - Prints it
    answer: 2
    explanation: Comments start with # and are ignored by Python. They're notes for humans.
  - question: Which Python library gives you DataFrames, tables of data you can filter, group, and summarize?
    options:
      - pandas
      - print
      - SQLite
      - Pyodide
    answer: 0
    explanation: pandas provides DataFrames, which are tables you can filter, group, and summarize with Python.
---

## Python in one paragraph

Python's official tutorial describes it as "an easy to learn, powerful programming language."[^1] Its readable syntax
makes it a good first programming language.

Where SQL is great at *asking a database questions*, Python is great at *everything around it*: cleaning messy data,
combining files, automating reports, and doing analysis that is awkward in SQL.

## Python and pandas

For tables of data, Python has **pandas**, which describes itself as "a fast, powerful, flexible and easy to use open source
data analysis and manipulation tool, built on top of the Python programming language."[^2] pandas gives you *DataFrames*:
tables you can filter, sort, and group, much like SQL.

To use pandas well, you first need core Python: variables, text, lists, dictionaries, conditions, and loops.
That's exactly what the first three Python Lab chapters cover. pandas comes later.

## Your first line of code

```python
print("Hello, data!")
```

`print()` shows a value in the output. You can print several values at once, separated by commas:

```python
print("Orders today:", 42)   # Orders today: 42
```

Everything after `#` is a **comment**. "Comments in Python start with the hash character, `#`, and extend to the end of the
physical line."[^4] Python ignores them, so use comments to explain *why* your code does something.

## How the Python Lab works

The Python Lab runs real Python inside this app using **Pyodide**, "a Python distribution for the browser and Node.js based on
WebAssembly."[^3] That means:

- **No installation**, and it works **offline**.
- Your code runs in a **sandbox**: it can't read or change files on your computer.
- The first run takes a few seconds while Python starts up. After that, it's quick.

Each level gives you some **Given data**: variables that already exist when your code runs. Write your code, press
**Run** to try it (you'll see printed output and every variable you created), then **Check answer** when you're ready.

Your code is also checked against **different hidden data**, so it must *calculate* answers from the variables rather than
type them in. That's how real analysis code works: the same code runs again next month on new data.

## Key takeaways

- Python is a readable, powerful language; **pandas** adds data tables (DataFrames).
- `print()` shows values. `#` starts a **comment**.
- The Python Lab runs real Python **offline in a sandbox**.
- Always **calculate from the given variables**, never type the answer in.
