// Generates the databases for the SQL Lab: a fictional online shop.
// Output (CREATE TABLE + INSERT statements):
//   content/datasets/store.sql         the practice shop learners see
//   content/datasets/store-hidden.sql  a second shop with the same tables and different data, used only
//                                      to check answers, so typed-in values (instead of calculations) fail
//
// The random generator is seeded, so this always produces exactly the same data.
// Level answers are computed live from each level's reference solution, but level
// task text can mention specific values, so re-run `npm run verify` after any change.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const datasetsDir = join(root, 'content', 'datasets')

// Deterministic pseudo-random numbers (mulberry32). Each shop resets the seed before it starts.
let seed = 0
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (list) => list[Math.floor(rand() * list.length)]
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [value, w] of pairs) if ((r -= w) < 0) return value
  return pairs[pairs.length - 1][0]
}

const DAY = 86_400_000
const toDate = (ms) => new Date(ms).toISOString().slice(0, 10)
const dateMs = (iso) => Date.parse(`${iso}T00:00:00Z`)
const randomDate = (fromIso, toIso) => toDate(randInt(dateMs(fromIso) / DAY, dateMs(toIso) / DAY) * DAY)

// ---- Products (hand-written; every price is unique so "top N" questions have no ties)
// [name, category, price, cost, stock_quantity]
const PRODUCTS = [
  ['Wireless Earbuds', 'Electronics', 59.99, 28.5, 120],
  ['Bluetooth Speaker', 'Electronics', 45.0, 21.0, 85],
  ['USB-C Charger', 'Electronics', 19.99, 7.8, 300],
  ['Noise-Cancelling Headphones', 'Electronics', 189.0, 98.0, 40],
  ['Smartwatch', 'Electronics', 149.5, 80.0, 0],
  ['Portable Power Bank', 'Electronics', 34.95, 15.2, 150],
  ['Mechanical Keyboard', 'Electronics', 89.9, 44.0, 60],
  ['Wireless Mouse', 'Electronics', 24.5, 9.9, 210],
  ['4K Webcam', 'Electronics', 74.99, 36.0, 0],
  ['Stainless Steel Water Bottle', 'Home & Kitchen', 22.0, 8.4, 260],
  ['Ceramic Coffee Mug Set', 'Home & Kitchen', 27.75, 11.0, 95],
  ['Non-Stick Frying Pan', 'Home & Kitchen', 39.9, 17.5, 70],
  ['Electric Kettle', 'Home & Kitchen', 49.99, 23.0, 55],
  ['Bamboo Cutting Board', 'Home & Kitchen', 18.25, 6.1, 140],
  ['Cotton Bath Towel Set', 'Home & Kitchen', 32.4, 13.8, 0],
  ['Scented Soy Candle', 'Home & Kitchen', 14.99, 4.2, 330],
  ['Air Fryer', 'Home & Kitchen', 119.0, 64.0, 25],
  ['SQL for Beginners', 'Books', 29.99, 12.0, 75],
  ['Python Step by Step', 'Books', 34.5, 14.5, 64],
  ['The Data Story', 'Books', 24.99, 9.5, 48],
  ['Mystery at Harbor Lane', 'Books', 12.99, 4.8, 110],
  ['Cooking on a Budget', 'Books', 19.5, 7.25, 90],
  ['Mindful Mornings', 'Books', 16.75, 5.9, 35],
  ['Yoga Mat', 'Sports & Outdoors', 28.0, 10.5, 130],
  ['Adjustable Dumbbells', 'Sports & Outdoors', 159.0, 92.0, 18],
  ['Running Shoes', 'Sports & Outdoors', 99.95, 47.0, 66],
  ['Camping Tent (2-Person)', 'Sports & Outdoors', 129.99, 70.0, 12],
  ['Resistance Bands Set', 'Sports & Outdoors', 21.49, 7.1, 175],
  ['Cycling Helmet', 'Sports & Outdoors', 64.5, 30.0, 40],
  ['Vitamin C Serum', 'Beauty', 26.9, 8.6, 140],
  ['Hydrating Face Cream', 'Beauty', 31.2, 10.4, 88],
  ['Sunscreen SPF 50', 'Beauty', 17.8, 6.3, 205],
  ['Hair Dryer', 'Beauty', 54.75, 25.6, 0],
  ['Lip Balm Trio', 'Beauty', 9.99, 2.7, 400],
  ['Building Blocks Set', 'Toys & Games', 44.95, 19.8, 77],
  ['Wooden Puzzle', 'Toys & Games', 15.6, 5.1, 120],
  ['Remote Control Car', 'Toys & Games', 69.0, 33.5, 30],
  ['Board Game Night Pack', 'Toys & Games', 36.8, 16.2, 54],
  ['Plush Teddy Bear', 'Toys & Games', 18.9, 6.8, 160],
  ['Art & Craft Kit', 'Toys & Games', 25.6, 9.7, 85]
]

// ---- Customers (generated)
const FIRST_NAMES = [
  'Maria', 'James', 'Ana', 'Liam', 'Sofia', 'Noah', 'Grace', 'Ethan', 'Chloe', 'Lucas',
  'Isabel', 'Mason', 'Emma', 'Daniel', 'Olivia', 'Miguel', 'Ava', 'Samuel', 'Mia', 'Paolo',
  'Hannah', 'Jacob', 'Lily', 'Ryan', 'Zoe', 'Nathan', 'Ella', 'Carlo', 'Amelia', 'Joshua'
]
const LAST_NAMES = [
  'Santos', 'Smith', 'Reyes', 'Johnson', 'Cruz', 'Brown', 'Garcia', 'Wilson', 'Bautista', 'Taylor',
  'Lee', 'Martin', 'Mendoza', 'Thompson', 'Nguyen', 'White', 'Ramos', 'Harris', 'Clarke', 'Walker',
  'Tan', 'Young', 'Lopez', 'King', 'Flores', 'Wright', 'Patel', 'Scott', 'Aquino', 'Green'
]
// [country, weight, cities]
const LOCATIONS = [
  ['USA', 30, ['New York', 'Chicago', 'Austin', 'Seattle']],
  ['Philippines', 25, ['Manila', 'Cebu City', 'Davao City']],
  ['UK', 18, ['London', 'Manchester']],
  ['Canada', 15, ['Toronto', 'Vancouver']],
  ['Australia', 12, ['Sydney', 'Melbourne']]
]


const STATUSES = [['Delivered', 70], ['Shipped', 10], ['Cancelled', 12], ['Returned', 8]]
const PAYMENTS = [['Credit Card', 50], ['PayPal', 25], ['Debit Card', 15], ['Bank Transfer', 10]]

/**
 * Builds one shop. Everything random comes from a single seeded stream, in a fixed order,
 * so the same settings always give exactly the same data.
 */
function buildShop({ startSeed, adjustProducts, customerCount, orderCount, neverReviewed }) {
  seed = startSeed
  const products = adjustProducts ? adjustProducts(PRODUCTS) : PRODUCTS

  // ---- Customers (generated)
  const customers = []
  const usedNames = new Set()
  while (customers.length < customerCount) {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    if (usedNames.has(`${first} ${last}`)) continue
    usedNames.add(`${first} ${last}`)
    const [country, , cities] = weighted(LOCATIONS.map((l) => [l, l[1]]))
    customers.push({
      customer_id: customers.length + 1,
      first_name: first,
      last_name: last,
      // About 1 in 10 customers never gave an email address (for NULL practice).
      // example.com is reserved for examples, so these are never real addresses.
      email: rand() < 0.1 ? null : `${first}.${last}${randInt(1, 99)}@example.com`.toLowerCase(),
      city: pick(cities),
      country,
      signup_date: randomDate('2023-01-01', '2025-06-30')
    })
  }

  // ---- Orders and order items (generated)
  // About 1 in 8 customers never orders anything (useful for LEFT JOIN later).
  const buyers = customers.filter(() => rand() > 0.125)
  const orders = []
  const items = []

  const rawOrders = []
  for (let i = 0; i < orderCount; i++) {
    const customer = pick(buyers)
    const earliest = customer.signup_date > '2025-01-01' ? customer.signup_date : '2025-01-01'
    rawOrders.push({ customer, date: randomDate(earliest, '2025-12-31') })
  }
  // Order IDs follow the date, like a real shop's order numbers.
  rawOrders.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  for (const { customer, date } of rawOrders) {
    const order_id = orders.length + 1001
    const lineCount = weighted([[1, 45], [2, 30], [3, 17], [4, 8]])
    const chosen = new Set()
    while (chosen.size < lineCount) chosen.add(randInt(0, products.length - 1))

    let total = 0
    for (const p of chosen) {
      const quantity = weighted([[1, 70], [2, 22], [3, 8]])
      const unit_price = products[p][2]
      total += quantity * unit_price
      items.push({ order_item_id: items.length + 1, order_id, product_id: p + 1, quantity, unit_price })
    }

    orders.push({
      order_id,
      customer_id: customer.customer_id,
      order_date: date,
      status: weighted(STATUSES),
      payment_method: weighted(PAYMENTS),
      total_amount: Math.round(total * 100) / 100
    })
  }

  // ---- Reviews (generated AFTER everything above, so adding them did not change any earlier data)
  // Some delivered order items get a review. A few products never get one, which is
  // useful for LEFT JOIN practice ("which products have no reviews?").
  const orderById = new Map(orders.map((o) => [o.order_id, o]))
  const reviews = []
  for (const item of items) {
    const order = orderById.get(item.order_id)
    if (order.status !== 'Delivered' || neverReviewed.has(item.product_id) || rand() > 0.4) continue
    const delay = randInt(3, 30)
    const reviewDate = toDate(dateMs(order.order_date) + delay * DAY)
    reviews.push({
      review_id: reviews.length + 1,
      product_id: item.product_id,
      customer_id: order.customer_id,
      rating: weighted([[5, 40], [4, 30], [3, 15], [2, 8], [1, 7]]),
      review_date: reviewDate > '2025-12-31' ? '2025-12-31' : reviewDate
    })
  }

  const productRows = products.map(([product_name, category, price, cost, stock_quantity], i) => ({
    product_id: i + 1,
    product_name,
    category,
    price,
    cost,
    stock_quantity
  }))
  return { customers, productRows, orders, items, reviews }
}

/**
 * The hidden shop's products: the same names and categories, but different prices and stock.
 * A query that hard-codes a value read from the practice data (an average price, a stock level)
 * then gives a different answer here. Prices stay unique so "top N" levels have no ties.
 */
function hiddenProducts(products) {
  const used = new Set()
  return products.map(([name, category, price, cost]) => {
    // Prices rise by 5–45%, so the averages move well away from the practice shop's values.
    const factor = 1.05 + rand() * 0.4
    let newPrice = Math.round(price * factor * 100) / 100
    while (used.has(newPrice)) newPrice = Math.round((newPrice + 0.01) * 100) / 100
    used.add(newPrice)
    const stock = rand() < 0.12 ? 0 : randInt(5, 320)
    return [name, category, newPrice, Math.round(cost * factor * 100) / 100, stock]
  })
}

// ---- Write SQL
const sqlValue = (v) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
const insert = (table, rows) =>
  rows.length === 0
    ? ''
    : `INSERT INTO ${table} (${Object.keys(rows[0]).join(', ')}) VALUES\n` +
      rows.map((r) => `  (${Object.values(r).map(sqlValue).join(', ')})`).join(',\n') +
      ';\n'

const toSql = (title, { customers, productRows, orders, items, reviews }) => `-- ${title}
-- Generated by scripts/generate-dataset.mjs. Do not edit by hand.

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  signup_date TEXT NOT NULL
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL,
  stock_quantity INTEGER NOT NULL
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  total_amount REAL NOT NULL
);

CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE reviews (
  review_id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  rating INTEGER NOT NULL,
  review_date TEXT NOT NULL
);

${insert('customers', customers)}
${insert('products', productRows)}
${insert('orders', orders)}
${insert('order_items', items)}
${insert('reviews', reviews)}`

const SHOPS = [
  {
    // The practice shop learners see. Never change these settings: every level is written against this data.
    file: 'store.sql',
    title: 'Datara practice database: a fictional online shop.',
    settings: { startSeed: 20251028, customerCount: 60, orderCount: 250, neverReviewed: new Set([8, 16, 24, 32, 40]) }
  },
  {
    // The hidden shop: same tables, different data. Answers are also checked here, so a query that types in
    // a number read from the practice data (instead of calculating it) fails. Learners never see this data.
    file: 'store-hidden.sql',
    title: 'Datara hidden test database: the same tables as store.sql with different data (used only for checking).',
    settings: {
      startSeed: 31337,
      adjustProducts: hiddenProducts,
      customerCount: 52,
      orderCount: 214,
      neverReviewed: new Set([3, 12, 21, 30, 39])
    }
  }
]

await mkdir(datasetsDir, { recursive: true })
for (const { file, title, settings } of SHOPS) {
  const shop = buildShop(settings)
  await writeFile(join(datasetsDir, file), toSql(title, shop), 'utf8')
  console.log(
    `[dataset] ${file}: ${shop.customers.length} customers, ${shop.productRows.length} products, ` +
      `${shop.orders.length} orders, ${shop.items.length} order items, ${shop.reviews.length} reviews`
  )
}
