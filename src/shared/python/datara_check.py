"""Datara Python Lab checker.

Runs the learner's code in a fresh namespace (after the level's "given data"),
then compares the variables and printed output with the reference solution.
Errors are turned into beginner-friendly explanations.

Used by the Python worker in the app and by scripts/verify-content.ts.
Entry point: handle(kind, spec_json) -> result_json, where kind is "run" or "check".
"""

import builtins
import contextlib
import io
import json
import math
import numbers
import sys
import traceback
import types

YOUR_CODE = "<your code>"
GIVEN_DATA = "<given data>"

# Numbers within this distance suggest the learner forgot to round.
NEAR = 0.0051
MAX_REPR = 300
MAX_TABLE_ROWS = 50


# ---------------------------------------------------------------- running code


def _no_input(*_args, **_kwargs):
    raise RuntimeError(
        "input() isn't available in the Python Lab. The data you need is already "
        "stored in variables (see Given data)."
    )


def _fresh_namespace():
    safe_builtins = dict(vars(builtins))
    safe_builtins["input"] = _no_input
    return {"__name__": "__main__", "__builtins__": safe_builtins}


def _write_files(files):
    """Puts the level's data files (e.g. products.csv) in the current folder of Python's in-memory file system."""
    for name, text in (files or {}).items():
        with open(name, "w", encoding="utf-8") as handle:
            handle.write(text)


def _execute(setup, code, files=None):
    """Runs setup (given data), then the code. Returns (namespace, output, error, given_names)."""
    _write_files(files)
    ns = _fresh_namespace()
    out = io.StringIO()
    error = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        if setup:
            exec(compile(setup, GIVEN_DATA, "exec"), ns)
        given = set(ns)
        try:
            exec(compile(code, YOUR_CODE, "exec"), ns)
        except BaseException as exc:  # SystemExit too: exit() must not stop the checker
            error = _describe_error(exc)
    return ns, out.getvalue(), error, given


# ---------------------------------------------------------------- friendly errors


def _error_line(exc):
    if isinstance(exc, SyntaxError) and exc.filename == YOUR_CODE:
        return exc.lineno
    line = None
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == YOUR_CODE:
            line = frame.lineno
    return line


def _from_pandas(exc):
    """True if the error was raised inside pandas (e.g. a missing column), not by plain Python."""
    return any("pandas" in frame.filename for frame in traceback.extract_tb(exc.__traceback__))


def _friendly(exc, kind, text):
    if isinstance(exc, IndentationError):
        return (
            "The spaces at the start of a line don't line up. Python uses indentation to group code: "
            "lines inside an if, else, or for must all be indented by the same amount (usually 4 spaces)."
        )
    if isinstance(exc, SyntaxError):
        msg = exc.msg or ""
        if "expected ':'" in msg:
            return "Lines that start with if, elif, else, for, or def must end with a colon (:)."
        if "never closed" in msg or "unterminated" in msg or "EOF" in msg:
            return f"Python reached the end of a line or of your code too early ({msg}). Check for a missing closing bracket or quote."
        if "Maybe you meant '=='" in msg:
            return "To compare two values, use ==. A single = stores a value in a variable."
        return f"Python couldn't understand this line ({msg}). Check for a missing comma, bracket, quote, or colon."
    if isinstance(exc, NameError):
        name = getattr(exc, "name", None) or text
        return (
            f"Python doesn't know the name '{name}'. Check the spelling (capital letters matter) and make sure the "
            f"variable is created before this line. If you meant text, put it in quotes: \"{name}\"."
        )
    if isinstance(exc, TypeError):
        if "can only concatenate str" in text:
            return 'You can\'t join text and a number with +. Convert the number with str(), or use an f-string like f"Total: {total}".'
        if "unsupported operand" in text and "str" in text:
            return "You're doing maths with text. Convert the text to a number first with int() or float()."
        if "not callable" in text:
            return f"{text}. You used ( ) after something that isn't a function. Did you forget a * for multiplication?"
        if "not subscriptable" in text:
            return f"{text}. You used [ ] on a value that isn't a list or dictionary."
        return f"A value has the wrong type for this operation: {text}."
    if isinstance(exc, ZeroDivisionError):
        return "Your code divided by zero. Check the number after the / sign."
    if isinstance(exc, IndexError):
        return (
            "Your code asked for a position that doesn't exist. Positions start at 0, so a list "
            "of 5 items has positions 0 to 4 (or -1 for the last item)."
        )
    if isinstance(exc, KeyError):
        if _from_pandas(exc):
            if text.startswith("("):
                return (
                    f"There's no column called {text}. To select several columns, put their names in a list "
                    'inside the brackets (double brackets): df[["name", "price"]].'
                )
            return f"There's no column called {text}. Check the spelling and capital letters of the column name."
        return f"The dictionary has no key {text}. Check the spelling and capital letters, or use .get() to give a default."
    if isinstance(exc, FileNotFoundError):
        return f"Python couldn't find the file {exc.filename!r}. Check the file name (see Files above the task)."
    if isinstance(exc, ValueError):
        if "invalid literal for int()" in text:
            return f"{text}. int() only converts text that looks like a whole number. For decimals like '19.99', use float()."
        if "truth value of a" in text and "ambiguous" in text:
            return (
                "To combine conditions on columns, use & (and) or | (or) instead of the words and/or, and put each "
                'condition in parentheses: df[(df["price"] > 10) & (df["stock"] > 0)].'
            )
        return f"{text}."
    if isinstance(exc, AttributeError):
        if ".dt accessor" in text:
            return "You can only use .dt on a date column. Convert the text to dates first with pd.to_datetime()."
        if ".str accessor" in text:
            return "You can only use .str on a column of text."
        if "DataFrame" in text or "Series" in text:
            return f"{text}. Check the spelling and capital letters of the method or column name."
        return f"{text}. Check the method name. For example, text has .lower() and lists have .append()."
    if isinstance(exc, SystemExit):
        return "Your code called exit(), which stops the program early. Remove it."
    if isinstance(exc, RecursionError):
        return "A function kept calling itself without stopping."
    return f"{kind}: {text}"


def _describe_error(exc):
    kind = type(exc).__name__
    text = exc.msg if isinstance(exc, SyntaxError) and exc.msg else str(exc)
    return {"type": kind, "message": text, "line": _error_line(exc), "friendly": _friendly(exc, kind, text)}


# ---------------------------------------------------------------- comparing values


def _is_num(value):
    # numbers.Real also covers numpy/pandas numbers (e.g. the result of df["price"].sum()).
    return isinstance(value, numbers.Real) and not isinstance(value, bool) and type(value).__name__ != "bool_"


def _is_dataframe(value):
    """True for pandas tables: a DataFrame or a Series."""
    pd = sys.modules.get("pandas")
    return pd is not None and isinstance(value, (pd.DataFrame, pd.Series))


def _is_series(value):
    pd = sys.modules.get("pandas")
    return pd is not None and isinstance(value, pd.Series)


# Per-check options (set by check()).
_options = {"ignore_row_order": False}


def _plain_index(index):
    """True if the row labels are just row numbers (0, 1, 2… or what's left of them after filtering)."""
    import pandas as pd

    return index.nlevels == 1 and index.name is None and pd.api.types.is_integer_dtype(index.dtype)


def _normalize_table(value):
    """Prepares a DataFrame/Series for comparison.

    Row numbers are dropped, so a filtered table passes with or without .reset_index(drop=True).
    Meaningful row labels (like the categories from a groupby) become an ordinary column of a
    DataFrame, so `df.groupby("city").agg(...)` and the same thing with .reset_index() compare equal.
    A Series keeps meaningful labels as its index.
    """
    if _is_series(value):
        return value.reset_index(drop=True) if _plain_index(value.index) else value
    if _plain_index(value.index):
        return value.reset_index(drop=True)
    return value.reset_index()


def _sort_rows(value):
    """Puts rows in a fixed order, for levels where the row order doesn't matter."""
    try:
        if _is_series(value):
            if _plain_index(value.index):
                return value.sort_values(kind="stable").reset_index(drop=True)
            return value.sort_index(kind="stable")
        return value.sort_values(list(value.columns), kind="stable").reset_index(drop=True)
    except TypeError:  # values that can't be ordered (e.g. text mixed with numbers)
        return value


def _align_tables(expected, actual):
    """Returns (expected, actual) ready to compare value by value, or (None, problem) if their shapes differ."""
    e, a = _normalize_table(expected), _normalize_table(actual)
    if not _is_series(e):
        missing = [c for c in e.columns if c not in a.columns]
        extra = [c for c in a.columns if c not in e.columns]
        if missing or extra:
            parts = []
            if missing:
                parts.append("missing " + ", ".join(repr(c) for c in missing[:5]))
            if extra:
                parts.append("unexpected " + ", ".join(repr(c) for c in extra[:5]))
            return None, f"doesn't have the right columns ({'; '.join(parts)})."
        if a.columns.duplicated().any():
            return None, "has the same column name more than once."
        a = a[list(e.columns)]  # column order doesn't matter
    if len(e) != len(a):
        unit = "value" if _is_series(e) else "row"
        return None, f"has {len(a)} {unit}{'' if len(a) == 1 else 's'}, but it should have {len(e)}."
    if _options["ignore_row_order"]:
        e, a = _sort_rows(e), _sort_rows(a)
    return e, a


def _tables_match(e, a, tolerance=None):
    """Value-by-value comparison of two aligned tables. Names of the index and of a Series are ignored."""
    import pandas.testing as pdt

    common = dict(
        check_dtype=False,  # 5 and 5.0 count as equal, like everywhere else in the checker
        check_names=False,
        check_index_type=False,
        check_exact=False,
        check_freq=False,
        check_flags=False,
        rtol=1e-12,
        atol=tolerance or 1e-9,
    )
    try:
        if _is_series(e):
            pdt.assert_series_equal(e, a, check_series_type=False, **common)
        else:
            pdt.assert_frame_equal(e, a, check_column_type=False, check_frame_type=False, **common)
        return True
    except (AssertionError, TypeError, ValueError):
        return False


def _tables_equal(expected, actual, tolerance=None):
    e, a = _align_tables(expected, actual)
    return e is not None and _tables_match(e, a, tolerance)


def _table_problem(name, expected, actual):
    """Explains how a DataFrame/Series differs from the expected one."""
    e, a = _align_tables(expected, actual)
    if e is None:
        return f"`{name}` {a}"
    if _tables_match(e, a, NEAR):
        return f"`{name}` is very close but not exact. Did the task ask you to round (for example with .round(2))?"
    if _is_series(e) and not _plain_index(e.index):
        try:
            same_labels = sorted(e.index) == sorted(a.index)
        except TypeError:
            same_labels = False
        if not same_labels:
            sample = ", ".join(repr(x) for x in list(e.index)[:4])
            return f"The labels (index) of `{name}` aren't right. They should be like: {sample}."
    if not _options["ignore_row_order"] and _tables_match(_sort_rows(e), _sort_rows(a)):
        return f"`{name}` has the right rows, but in a different order. Check the sorting the task asks for."
    if not _is_series(e):
        for column in e.columns:
            if not _tables_match(e[column], a[column]):
                return f"The values in the `{column}` column of `{name}` don't match what the task expects."
    return f"The values in `{name}` don't match what the task expects."


def _equal(expected, actual, tolerance=None):
    """Deep comparison. Numbers are compared with a small tolerance (int and float may mix)."""
    if _is_num(expected) and _is_num(actual):
        if math.isnan(expected) and math.isnan(actual):
            return True
        if tolerance is None:
            return math.isclose(expected, actual, rel_tol=1e-9, abs_tol=1e-9)
        return abs(expected - actual) <= tolerance
    if type(expected) is not type(actual):
        return False
    if isinstance(expected, (list, tuple)):
        return len(expected) == len(actual) and all(_equal(e, a, tolerance) for e, a in zip(expected, actual))
    if isinstance(expected, dict):
        return expected.keys() == actual.keys() and all(_equal(expected[k], actual[k], tolerance) for k in expected)
    if _is_dataframe(expected):
        return _tables_equal(expected, actual, tolerance)
    try:
        return bool(expected == actual)
    except Exception:
        return False


TYPE_NAMES = {
    int: "a whole number (int)",
    float: "a decimal number (float)",
    str: "text (str)",
    bool: "True or False (bool)",
    list: "a list",
    dict: "a dictionary (dict)",
    tuple: "a tuple",
    set: "a set",
    type(None): "None (no value)",
}


PANDAS_TYPE_NAMES = {
    "DataFrame": "a DataFrame (a table)",
    "Series": "a Series (a single column of values)",
    "DataFrameGroupBy": "a grouping (DataFrameGroupBy)",
    "SeriesGroupBy": "a grouping (SeriesGroupBy)",
    "ndarray": "a NumPy array",
    "Index": "a pandas Index",
}


def _type_name(value):
    if _is_num(value):
        return "a number"
    if type(value) in TYPE_NAMES:
        return TYPE_NAMES[type(value)]
    if callable(value) and not isinstance(value, type):
        return "a function or method"
    kind = type(value).__name__
    if kind.endswith("Array") and kind not in PANDAS_TYPE_NAMES:
        return f"an array of values ({kind})"
    return PANDAS_TYPE_NAMES.get(kind, f"a {kind}")


def _type_hint(expected, actual):
    """Extra advice for common type mix-ups, especially with pandas."""
    kind = type(actual).__name__
    if isinstance(actual, str) and _is_num(expected):
        return " Did you put quotes around a number, or forget to convert text with int() or float()?"
    if actual is None:
        return (
            " A value becomes None when you store the result of something that doesn't return anything:"
            " a function that prints instead of using `return`, or list methods like .append() and .sort()."
        )
    if callable(actual) and not isinstance(actual, type):
        return " Did you forget the brackets at the end of a method, like .mean() instead of .mean?"
    if kind.endswith("GroupBy"):
        return " A groupby on its own doesn't calculate anything yet: add a calculation like .sum(), .mean(), or .size()."
    if kind in ("Index", "ndarray") and isinstance(expected, list):
        return " Turn it into a list with list(...) or .tolist()."
    if kind == "Series" and type(expected).__name__ == "DataFrame" and str(actual.dtype) == "bool":
        return (
            " Yours is a column of True/False values. Put the condition inside df[...] to keep only the rows"
            ' where it is True: df[df["price"] < 15].'
        )
    if _is_series(expected) and kind == "DataFrame":
        return ' Single brackets like df["price"] give a Series; double brackets like df[["price"]] give a DataFrame.'
    if kind == "Series" and type(expected).__name__ == "DataFrame":
        return ' Double brackets like df[["name", "price"]] give a DataFrame; single brackets give a Series.'
    if _is_num(expected) and _is_dataframe(actual):
        return " The task asks for a single number. Use a calculation like .sum(), .mean(), or len() on your selection."
    return ""


def _short_repr(value):
    if _is_num(value) and hasattr(value, "item"):
        value = value.item()  # show np.int64(8) as 8
    try:
        text = repr(value)
    except Exception:
        text = f"<{type(value).__name__}>"
    return text if len(text) <= MAX_REPR else text[:MAX_REPR] + "…"


def _variable_problem(name, expected, ns):
    """Returns a message describing what is wrong with variable `name`, or None if it is right."""
    if name not in ns:
        return f"Create a variable called `{name}`. Check the spelling: Python names are case-sensitive."
    actual = ns[name]
    if _equal(expected, actual):
        return None

    numbers = _is_num(expected) and _is_num(actual)
    if not numbers and type(expected) is not type(actual):
        return f"`{name}` should be {_type_name(expected)}, but yours is {_type_name(actual)}." + _type_hint(expected, actual)
    if _is_dataframe(expected):
        return _table_problem(name, expected, actual)
    if _equal(expected, actual, NEAR):
        return f"`{name}` is very close but not exact. Did the task ask you to round with round(value, 2)?"
    if isinstance(expected, (list, tuple)) and len(expected) != len(actual):
        return f"`{name}` has {len(actual)} items, but it should have {len(expected)}."
    if isinstance(expected, dict) and expected.keys() != actual.keys():
        missing = [repr(k) for k in expected if k not in actual][:5]
        extra = [repr(k) for k in actual if k not in expected][:5]
        parts = []
        if missing:
            parts.append("missing " + ", ".join(missing))
        if extra:
            parts.append("unexpected " + ", ".join(extra))
        return f"`{name}` doesn't have the right keys ({'; '.join(parts)})."
    if isinstance(expected, str) and expected.strip().lower() == actual.strip().lower():
        return f"`{name}` is almost right. Check the capital letters and spaces."
    if isinstance(expected, list):
        try:
            if _equal(sorted(expected), sorted(actual)):
                return f"`{name}` has the right items, but in a different order than the task expects."
        except TypeError:
            pass
    return f"`{name}` isn't what the task expects. Your value: {_short_repr(actual)}"


def _normalize_output(text):
    return "\n".join(line.rstrip() for line in text.strip("\n").splitlines()).strip()


def _evaluate_call(call, ns):
    """Evaluates a test call like 'apply_discount(100, 0.2)'. Returns (value, error, printed)."""
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            return eval(compile(call, "<check>", "eval"), ns), None, out.getvalue()
    except BaseException as exc:
        return None, _describe_error(exc), out.getvalue()


def _call_problem(call, expected_ns, ns):
    """Calls the learner's function the way the solution's is called, and explains any difference."""
    name = call.split("(", 1)[0].strip()
    if not callable(ns.get(name)):
        return f"Define a function called `{name}`. Check the spelling: Python names are case-sensitive."
    expected, expected_error, _ = _evaluate_call(call, expected_ns)
    if expected_error:
        raise RuntimeError(f"The reference solution fails on {call}: {expected_error['type']}: {expected_error['message']}")
    actual, error, printed = _evaluate_call(call, ns)
    if error:
        return f"Calling `{call}` caused an error: {error['friendly']}"
    if _equal(expected, actual):
        return None
    if actual is None and expected is not None:
        hint = " It printed something instead." if printed.strip() else ""
        return f"`{call}` returned None.{hint} Use `return` to send the result back (print only shows it)."
    if not (_is_num(expected) and _is_num(actual)) and type(expected) is not type(actual):
        return f"`{call}` should return {_type_name(expected)}, but it returned {_type_name(actual)}: {_short_repr(actual)}"
    if _is_dataframe(expected):
        return _table_problem(call, expected, actual)
    if _equal(expected, actual, NEAR):
        return f"`{call}` returned {_short_repr(actual)}, which is close to {_short_repr(expected)}. Did the task ask you to round?"
    return f"`{call}` returned {_short_repr(actual)}, but it should return {_short_repr(expected)}."


def _first_problem(expect, check_output, expected_ns, expected_out, ns, out, calls=()):
    for name in expect:
        problem = _variable_problem(name, expected_ns.get(name), ns)
        if problem:
            return problem, None
    for call in calls:
        problem = _call_problem(call, expected_ns, ns)
        if problem:
            return problem, None
    if check_output and _normalize_output(expected_out) != _normalize_output(out):
        if not out.strip():
            return "Your code didn't print anything. Use print() to show the result.", None
        if _normalize_output(expected_out).lower() == _normalize_output(out).lower():
            return "Your printed output is almost right. Check the capital letters.", None
        return (
            "Your printed output doesn't match what the task asks for. Compare it with the expected output below.",
            _normalize_output(expected_out),
        )
    return None, None


# ---------------------------------------------------------------- results


def _table(value):
    """A small table for DataFrames, so the app can show them nicely."""
    if _is_series(value):
        frame = value.to_frame(name=value.name if value.name is not None else "value")
    else:
        frame = value
    head = frame.head(MAX_TABLE_ROWS)
    rows = []
    for row in head.itertuples(index=True, name=None):
        cells = []
        for cell in row:
            if hasattr(cell, "item") and not isinstance(cell, (str, bytes)):
                try:
                    cell = cell.item()  # numpy number -> plain Python number
                except (ValueError, TypeError):
                    pass
            if isinstance(cell, float) and math.isnan(cell):
                cells.append(None)
            elif isinstance(cell, (bool, int, float, str)) or cell is None:
                cells.append(cell)
            else:
                cells.append(str(cell))
        rows.append(cells)
    # The first column shows the row labels (the index), headed by its name if it has one (e.g. after a groupby).
    index_name = ", ".join(str(n) for n in frame.index.names if n is not None)
    return {"columns": [index_name] + [str(c) for c in frame.columns], "rows": rows, "totalRows": int(len(frame))}


def _variables(ns, given):
    result = []
    for name, value in ns.items():
        if name.startswith("_") or isinstance(value, types.ModuleType):
            continue
        item = {"name": name, "type": type(value).__name__, "value": _short_repr(value), "given": name in given}
        if _is_dataframe(value):
            item["table"] = _table(value)
        result.append(item)
    return result


def run(spec):
    ns, out, error, given = _execute(spec.get("setup", ""), spec["code"], spec.get("files"))
    return {"output": out, "error": error, "variables": _variables(ns, given)}


def check(spec):
    _options["ignore_row_order"] = bool(spec.get("ignoreRowOrder"))
    setup = spec.get("setup", "")
    code = spec["code"]
    solution = spec["solution"]
    expect = spec.get("expect", [])
    check_output = bool(spec.get("checkOutput"))
    variants = spec.get("variants", [])
    calls = spec.get("calls", [])
    files = spec.get("files")

    ns, out, error, given = _execute(setup, code, files)
    result = {"output": out, "error": error, "variables": _variables(ns, given), "expectedOutput": None}
    if error:
        return {**result, "pass": False, "title": "Your code has an error", "message": error["friendly"]}

    for index, data in enumerate([setup] + list(variants)):
        expected_ns, expected_out, expected_error, _ = _execute(data, solution, files)
        if expected_error:
            raise RuntimeError(f"The reference solution failed: {expected_error['type']}: {expected_error['message']}")
        if index == 0:
            actual_ns, actual_out = ns, out
        else:
            actual_ns, actual_out, actual_error, _ = _execute(data, code, files)
            if actual_error:
                return {
                    **result,
                    "pass": False,
                    "title": "Almost!",
                    "message": "Your code works for the given data, but fails when the data changes: "
                    + actual_error["friendly"],
                }
        problem, expected_output = _first_problem(
            expect, check_output, expected_ns, expected_out, actual_ns, actual_out, calls
        )
        if problem and index == 0:
            return {**result, "pass": False, "title": "Not quite", "message": problem, "expectedOutput": expected_output}
        if problem:
            # Show what went wrong on the other data too: often it's not a typed-in answer but, say, a missing
            # sort whose result happened to be in the right order for the given data.
            return {
                **result,
                "pass": False,
                "title": "Almost!",
                "message": "Your code gives the right answer for the given data, but not when the data changes. "
                f"With different data: {problem} "
                "Make sure your code calculates the result from the variables (like the ones in Given data) "
                "instead of relying on this particular data.",
            }

    return {**result, "pass": True, "title": "Correct!", "message": "Your code produces exactly the right result."}


def handle(kind, spec_json):
    spec = json.loads(spec_json)
    result = run(spec) if kind == "run" else check(spec)
    return json.dumps(result, default=str)
