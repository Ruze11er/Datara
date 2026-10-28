---
id: py-dicts
title: Dictionaries
summary: Store values under names (keys). Perfect for records like products, customers, and orders.
minutes: 7
practice:
  - py-product-lookup
  - py-update-inventory
  - py-safe-lookup
  - py-boss-order-summary
sources:
  - id: 1
    title: "5. Data Structures (5.5 Dictionaries), The Python Tutorial"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/tutorial/datastructures.html
    accessed: 2026-10-28
    verified: true
  - id: 2
    title: "Built-in Types (Mapping Types: dict)"
    publisher: Python Software Foundation
    url: https://docs.python.org/3/library/stdtypes.html
    accessed: 2026-10-28
    verified: true
quiz:
  - question: 'If product = {"name": "Air Fryer", "price": 119.0}, how do you get the price?'
    options:
      - "product[1]"
      - "product[\"price\"]"
      - "product.price"
      - "price[product]"
    answer: 1
    explanation: Dictionaries are looked up by key, written in square brackets.
  - question: What happens with product["stock"] if there is no "stock" key?
    options:
      - It returns 0
      - It returns None
      - It raises a KeyError
      - It adds the key
    answer: 2
    explanation: Looking up a missing key with [ ] is an error. Use product.get("stock", 0) to get a default instead.
  - question: What does inventory["Mug"] = 50 do if "Mug" isn't in the dictionary yet?
    options:
      - Raises a KeyError
      - Adds the key "Mug" with the value 50
      - Does nothing
      - Replaces the whole dictionary
    answer: 1
    explanation: Assigning to a key adds it if it's new, or updates it if it already exists.
---

## Keys and values

A list finds items by **position**. A dictionary finds them by **name**. The Python tutorial says: "It is best to think of a
dictionary as a set of key: value pairs, with the requirement that the keys are unique (within one dictionary)."[^1]

```python
product = {"name": "Air Fryer", "price": 119.0, "stock": 25}
```

Here `"name"`, `"price"`, and `"stock"` are the **keys**. A dictionary like this is one **record**, much like one row of
the `products` table in the SQL Lab, with the keys as column names.

## Looking up values

```python
product["price"]                       # 119.0
product["price"] * product["stock"]    # 2975.0  (value of the stock)
```

Keys must match exactly, including capital letters. "Extracting a value for a non-existent key by subscripting (`d[key]`)
raises a `KeyError`."[^1]

### Safe lookups with .get() and in

Real data is often incomplete. Two tools prevent crashes:

- `.get(key, default)` will "return the value for key if key is in the dictionary, else default."[^2]
  If you leave out the default, it gives `None`, and it never raises a `KeyError`.[^2]
- "To check whether a single key is in the dictionary, use the `in` keyword."[^1]

```python
prices = {"Electric Kettle": 49.99, "Air Fryer": 119.0}
prices.get("Desk Lamp", 0)        # 0       (missing, so the default)
"Air Fryer" in prices             # True
```

## Adding and updating

The same syntax adds a new key or updates an existing one:

```python
inventory = {"Yoga Mat": 130}
inventory["Yoga Mat"] = inventory["Yoga Mat"] - 5   # update: 125
inventory["Yoga Mat"] -= 5                          # shortcut for the same thing: 120
inventory["Lip Balm Trio"] = 400                    # add a new key
```

## Looping through a dictionary

"When looping through dictionaries, the key and corresponding value can be retrieved at the same time using the `items()`
method."[^1]

```python
for name, units in inventory.items():
    print(f"{name}: {units} in stock")
```

You'll practise loops in the next lessons.

## Nested data

Values can be lists or other dictionaries. This is very common in real data:

```python
order = {"order_id": 1042, "items": ["Yoga Mat", "Water Bottle"], "prices": [28.0, 22.0]}
len(order["items"])     # 2
sum(order["prices"])    # 50.0
```

A **list of dictionaries** is how Python often holds a whole table: each dictionary is one row.

## Key takeaways

- A dictionary maps **unique keys** to values: `{"key": value}`.
- Look up with `d["key"]`; a missing key raises **KeyError**.
- Use `d.get("key", default)` and `"key" in d` for **safe lookups**.
- `d["key"] = value` **adds or updates**. Loop with `.items()`.
