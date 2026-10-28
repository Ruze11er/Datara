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


def _execute(setup, code):
    """Runs setup (given data), then the code. Returns (namespace, output, error, given_names)."""
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
        return f"The dictionary has no key {text}. Check the spelling and capital letters, or use .get() to give a default."
    if isinstance(exc, ValueError):
        if "invalid literal for int()" in text:
            return f"{text}. int() only converts text that looks like a whole number. For decimals like '19.99', use float()."
        return f"{text}."
    if isinstance(exc, AttributeError):
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
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_dataframe(value):
    pd = sys.modules.get("pandas")
    return pd is not None and isinstance(value, (pd.DataFrame, pd.Series))


def _equal(expected, actual, tolerance=None):
    """Deep comparison. Numbers are compared with a small tolerance (int and float may mix)."""
    if _is_num(expected) and _is_num(actual):
        if isinstance(expected, float) and isinstance(actual, float) and math.isnan(expected) and math.isnan(actual):
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
        import pandas.testing as pdt

        try:
            check = pdt.assert_frame_equal if hasattr(expected, "columns") else pdt.assert_series_equal
            check(expected, actual, check_dtype=False, atol=tolerance or 1e-9)
            return True
        except AssertionError:
            return False
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


def _type_name(value):
    if _is_num(value):
        return "a number"
    return TYPE_NAMES.get(type(value), f"a {type(value).__name__}")


def _short_repr(value):
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
        msg = f"`{name}` should be {_type_name(expected)}, but yours is {_type_name(actual)}."
        if isinstance(actual, str) and _is_num(expected):
            msg += " Did you put quotes around a number, or forget to convert text with int() or float()?"
        elif actual is None:
            msg += " Methods like .append() and .sort() change a list in place and give back None, so don't assign their result."
        return msg
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


def _first_problem(expect, check_output, expected_ns, expected_out, ns, out):
    for name in expect:
        problem = _variable_problem(name, expected_ns.get(name), ns)
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
    frame = value.to_frame() if hasattr(value, "to_frame") and not hasattr(value, "columns") else value
    head = frame.head(MAX_TABLE_ROWS)
    rows = []
    for row in head.itertuples(index=True, name=None):
        cells = []
        for cell in row:
            if isinstance(cell, float) and math.isnan(cell):
                cells.append(None)
            elif isinstance(cell, (int, float, str)) or cell is None:
                cells.append(cell)
            else:
                cells.append(str(cell))
        rows.append(cells)
    return {"columns": [""] + [str(c) for c in frame.columns], "rows": rows, "totalRows": int(len(frame))}


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
    ns, out, error, given = _execute(spec.get("setup", ""), spec["code"])
    return {"output": out, "error": error, "variables": _variables(ns, given)}


def check(spec):
    setup = spec.get("setup", "")
    code = spec["code"]
    solution = spec["solution"]
    expect = spec.get("expect", [])
    check_output = bool(spec.get("checkOutput"))
    variants = spec.get("variants", [])

    ns, out, error, given = _execute(setup, code)
    result = {"output": out, "error": error, "variables": _variables(ns, given), "expectedOutput": None}
    if error:
        return {**result, "pass": False, "title": "Your code has an error", "message": error["friendly"]}

    for index, data in enumerate([setup] + list(variants)):
        expected_ns, expected_out, expected_error, _ = _execute(data, solution)
        if expected_error:
            raise RuntimeError(f"The reference solution failed: {expected_error['type']}: {expected_error['message']}")
        if index == 0:
            actual_ns, actual_out = ns, out
        else:
            actual_ns, actual_out, actual_error, _ = _execute(data, code)
            if actual_error:
                return {
                    **result,
                    "pass": False,
                    "title": "Almost!",
                    "message": "Your code works for the given data, but fails when the data changes: "
                    + actual_error["friendly"],
                }
        problem, expected_output = _first_problem(expect, check_output, expected_ns, expected_out, actual_ns, actual_out)
        if problem and index == 0:
            return {**result, "pass": False, "title": "Not quite", "message": problem, "expectedOutput": expected_output}
        if problem:
            return {
                **result,
                "pass": False,
                "title": "Almost!",
                "message": "Your code gives the right answer for the given data, but not when the data changes. "
                "Calculate the result from the variables (like the ones in Given data) instead of typing the answer in directly.",
            }

    return {**result, "pass": True, "title": "Correct!", "message": "Your code produces exactly the right result."}


def handle(kind, spec_json):
    spec = json.loads(spec_json)
    result = run(spec) if kind == "run" else check(spec)
    return json.dumps(result, default=str)
