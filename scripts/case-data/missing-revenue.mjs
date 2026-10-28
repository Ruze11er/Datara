// Case #001 "The Missing Revenue": Copperleaf Home, a fictional online homeware shop.
//
// The planted story (every claim is checked by the case's `assertions` in content/cases/missing-revenue/case.yaml):
// - The finance dashboard says September 2025 revenue is down 32% on August (29% in the hidden copy).
// - Part of that is not real: a payment-retry bug recorded some August orders twice (same payment_ref,
//   a minute or two apart), which inflates August. The duplicates are added until the reported drop hits the target.
// - The real cause: the three best-selling kitchen appliances ran out of stock and stayed out all September.
//   Many customers who came for one left without ordering; others bought the rest of their basket.
// - The red herring: on 1 September marketing moved budget from Paid Search to Social. That only changes which
//   channel orders come from, not how many. Channels the change never touched fall just as much.
// - Seasonality: September 2024 was close to August 2024.
// - A few internal test orders (emails at copperleaf.example): real, but far too small to matter.

import { addDays, dateRange, makeRandom, round2, timestamp } from './tools.mjs'

export const caseId = 'missing-revenue'

// [name, category, price, popularity]. Popularity is the relative chance of being picked for an order line.
const PRODUCTS = [
  ['Aurora Espresso Machine', 'Kitchen Appliances', 349.0, 2.8],
  ['Copperleaf Stand Mixer', 'Kitchen Appliances', 279.0, 2.5],
  ['AeroCrisp Air Fryer', 'Kitchen Appliances', 129.0, 5.5],
  ['Countertop Toaster Oven', 'Kitchen Appliances', 159.0, 0.6],
  ['Glass Electric Kettle', 'Kitchen Appliances', 49.0, 1.6],
  ['High-Speed Blender', 'Kitchen Appliances', 89.0, 0.7],
  ['Burr Coffee Grinder', 'Kitchen Appliances', 45.0, 0.9],
  ['Hand Mixer', 'Kitchen Appliances', 39.0, 0.6],
  ['Cast Iron Skillet', 'Cookware', 54.0, 5],
  ['Nonstick Pan Set', 'Cookware', 89.5, 3],
  ['Enamel Dutch Oven', 'Cookware', 119.0, 2],
  ["Chef's Knife", 'Cookware', 64.0, 4],
  ['Stainless Saucepan', 'Cookware', 39.5, 4],
  ['Baking Sheet Set', 'Cookware', 27.0, 6],
  ['Stoneware Dinner Plates (Set of 4)', 'Tableware', 46.0, 6],
  ['Ceramic Mug Set', 'Tableware', 32.0, 9],
  ['Wine Glasses (Set of 4)', 'Tableware', 38.0, 5],
  ['Linen Napkins (Set of 6)', 'Tableware', 22.0, 6],
  ['Serving Bowl', 'Tableware', 29.0, 5],
  ['Flatware Set', 'Tableware', 69.0, 3],
  ['Cotton Sheet Set', 'Bedding', 79.0, 6],
  ['Down Alternative Duvet', 'Bedding', 124.0, 2.5],
  ['Memory Foam Pillow', 'Bedding', 42.0, 7],
  ['Wool Throw Blanket', 'Bedding', 68.0, 4],
  ['Cotton Quilt', 'Bedding', 99.0, 2],
  ['Turkish Towel Set', 'Bath', 48.0, 7],
  ['Bath Mat', 'Bath', 26.0, 6],
  ['Waffle Shower Curtain', 'Bath', 34.0, 4],
  ['Cotton Bathrobe', 'Bath', 72.0, 3],
  ['Soap Dispenser', 'Bath', 18.0, 6],
  ['Linen Throw Pillow', 'Decor', 28.0, 8],
  ['Scented Candle', 'Decor', 19.0, 12],
  ['Ceramic Vase', 'Decor', 36.0, 5],
  ['Round Wall Mirror', 'Decor', 92.0, 2],
  ['Woven Storage Basket', 'Decor', 31.0, 6],
  ['Framed Botanical Print', 'Decor', 58.0, 3],
  ['Brass Table Lamp', 'Lighting', 74.0, 3],
  ['Arc Floor Lamp', 'Lighting', 134.0, 1.5],
  ['LED String Lights', 'Lighting', 24.0, 7],
  ['Rattan Pendant Shade', 'Lighting', 52.0, 2]
]

const CHANNELS = ['Paid Search', 'Social', 'Email', 'Organic Search', 'Direct']
/** Share of orders per channel. The 1 September campaign change moves Paid Search share to Social. */
const CHANNEL_WEIGHTS = { 'Paid Search': 30, Social: 11, Email: 14, 'Organic Search': 29, Direct: 16 }
const CHANNEL_WEIGHTS_AFTER_CHANGE = { ...CHANNEL_WEIGHTS, 'Paid Search': 20, Social: 21 }
/** Visits per order, used to derive marketing_monthly.sessions from the orders customers intended to place. */
const CONVERSION = { 'Paid Search': 0.022, Social: 0.013, Email: 0.045, 'Organic Search': 0.03, Direct: 0.05 }
const SPEND = { 'Paid Search': 17000, Social: 6500, Email: 1200, 'Organic Search': 0, Direct: 0 }
const SPEND_AFTER_CHANGE = { ...SPEND, 'Paid Search': 10200, Social: 13300 }
const CAMPAIGN_CHANGE = '2025-09-01'

/** Demand by calendar month (holidays high, January low). */
const SEASON = { 1: 0.86, 2: 0.88, 3: 0.95, 4: 0.97, 5: 1.0, 6: 0.98, 7: 1.0, 8: 1.02, 9: 1.0, 10: 1.04, 11: 1.22, 12: 1.38 }

const FIRST = ['Ava', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Felix', 'Grace', 'Henry', 'Isla', 'Jack', 'Kara', 'Leo', 'Maya', 'Noah', 'Olivia', 'Owen', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Will', 'Yara', 'Zane', 'Alma', 'Caleb', 'Dina', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena', 'Milo', 'Nina', 'Omar']
const LAST = ['Adams', 'Baker', 'Chen', 'Diaz', 'Evans', 'Foster', 'Garcia', 'Hughes', 'Ito', 'Jensen', 'Kim', 'Lopez', 'Morgan', 'Nguyen', 'Okafor', 'Patel', 'Quinn', 'Reyes', 'Silva', 'Turner', 'Usman', 'Vance', 'Walsh', 'Xu', 'Young', 'Zhang', 'Brooks', 'Cole', 'Doyle', 'Ellis']
const CITIES = [['Portland', 12], ['Seattle', 11], ['Denver', 9], ['Austin', 10], ['Chicago', 12], ['Boston', 9], ['Minneapolis', 7], ['Atlanta', 8], ['Phoenix', 7], ['San Diego', 8], ['Pittsburgh', 5], ['Raleigh', 6]]

const FIRST_DAY = '2024-07-01'
const LAST_DAY = '2025-09-30'
const INVENTORY_FROM = '2025-08-01'

const monthOf = (date) => date.slice(0, 7)

/**
 * settings:
 *   seed, ordersPerDay, priceFactor(rng) -> multiplier per product,
 *   stockout: { products: [names], from, leaveShare }  main stock-out (to the end of the data); leaveShare = share
 *                                           of customers who wanted a missing item and leave without ordering
 *   shortStockout: { product, from, to }    a normal, brief stock-out (noise)
 *   duplicates: { from, to, reportedDrop }  payment-retry bug window and the drop the dashboard ends up showing
 *   testOrders, spendFactor
 */
export function build(settings) {
  const rng = makeRandom(settings.seed)
  const { rand, randInt, pick, weighted, shuffle, balanced } = rng

  const products = PRODUCTS.map(([name, category, price, popularity], i) => ({
    product_id: i + 1,
    product_name: name,
    category,
    price: settings.priceFactor ? round2(price * settings.priceFactor(rng)) : price,
    popularity
  }))
  const byName = new Map(products.map((p) => [p.product_name, p]))
  const stockoutIds = new Set(settings.stockout.products.map((n) => byName.get(n).product_id))
  const shortId = byName.get(settings.shortStockout.product).product_id
  const unavailable = (productId, date) =>
    (stockoutIds.has(productId) && date >= settings.stockout.from) ||
    (productId === shortId && date >= settings.shortStockout.from && date <= settings.shortStockout.to)
  // Balanced pickers keep each channel's product mix, basket size, quantities and statuses steady month to month,
  // so the only big changes in the data are the ones the story plants. Every picker below the channel is kept per
  // channel: a shared one would cycle in step with the channel picker and give one channel smaller baskets.
  const pickChannelBefore = balanced(CHANNELS.map((c) => [c, CHANNEL_WEIGHTS[c]]))
  const pickChannelAfter = balanced(CHANNELS.map((c) => [c, CHANNEL_WEIGHTS_AFTER_CHANGE[c]]))
  const perChannel = (make) => Object.fromEntries(CHANNELS.map((c) => [c, make()]))
  const pickProduct = perChannel(() => balanced(products.map((p) => [p, p.popularity])))
  const pickStatus = perChannel(() => balanced([['completed', 93], ['cancelled', 4], ['refunded', 3]]))
  const pickLineCount = perChannel(() => balanced([[1, 55], [2, 28], [3, 12], [4, 5]]))
  const pickQuantity = perChannel(
    () => new Map(products.map((p) => [p.product_id, balanced(p.price > 100 ? [[1, 92], [2, 8]] : [[1, 78], [2, 17], [3, 5]])]))
  )
  const leaveShare = settings.stockout.leaveShare
  const pickLeaves = perChannel(() => balanced([[true, leaveShare], [false, 1 - leaveShare]]))

  const customers = []
  const usedEmails = new Set()
  function newCustomer(date) {
    const first = pick(FIRST)
    const last = pick(LAST)
    let email = null
    if (rand() > 0.08) {
      do email = `${first}.${last}${randInt(1, 999)}@example.com`.toLowerCase()
      while (usedEmails.has(email))
      usedEmails.add(email)
    }
    const c = { customer_id: customers.length + 1, first_name: first, last_name: last, email, city: weighted(CITIES), signup_date: date }
    customers.push(c)
    return c
  }
  // Customers who signed up before the data starts.
  for (let i = 0; i < 900; i++) newCustomer(addDays(FIRST_DAY, -randInt(1, 700)))
  customers.sort((a, b) => (a.signup_date < b.signup_date ? -1 : 1)).forEach((c, i) => (c.customer_id = i + 1))

  const usedRefs = new Set()
  const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  function paymentRef() {
    let ref
    do ref = 'PAY-' + Array.from({ length: 8 }, () => REF_CHARS[randInt(0, REF_CHARS.length - 1)]).join('')
    while (usedRefs.has(ref))
    usedRefs.add(ref)
    return ref
  }

  // ---- Orders. `intended` counts every order a visitor meant to place, including the ones lost to stock-outs.
  const orders = []
  const intended = {}
  const days = dateRange(FIRST_DAY, LAST_DAY)
  for (const date of days) {
    const month = Number(date.slice(5, 7))
    const monthIndex = (Number(date.slice(0, 4)) - 2024) * 12 + month - 7
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const dayFactor = weekday === 0 || weekday === 6 ? 1.15 : weekday === 1 ? 0.95 : 1
    const expected = settings.ordersPerDay * SEASON[month] * (1 + 0.012 * monthIndex) * dayFactor * (0.9 + 0.2 * rand())
    const count = Math.floor(expected + rand())
    const pickChannel = date >= CAMPAIGN_CHANGE ? pickChannelAfter : pickChannelBefore

    for (let n = 0; n < count; n++) {
      const channel = pickChannel()
      const key = `${monthOf(date)}|${channel}`
      intended[key] = (intended[key] ?? 0) + 1

      const lineCount = pickLineCount[channel]()
      const chosen = new Set()
      while (chosen.size < lineCount) chosen.add(pickProduct[channel](chosen))
      let lines = [...chosen].map((p) => ({ product: p, quantity: pickQuantity[channel].get(p.product_id)() }))
      const blocked = lines.filter((l) => unavailable(l.product.product_id, date))
      if (blocked.length > 0) {
        // Many customers came for the missing item and leave without ordering anything.
        if (blocked.some((l) => stockoutIds.has(l.product.product_id)) && pickLeaves[channel]()) continue
        lines = lines.filter((l) => !blocked.includes(l))
        if (lines.length === 0) continue
      }

      // Everyone in the pool signed up on or before this day (new customers are added as the days go by).
      const customer = rand() < 0.35 ? newCustomer(date) : pick(customers)
      const seconds = randInt(7 * 3600, 23 * 3600 + 3599)
      orders.push({
        customer_id: customer.customer_id,
        ordered_at: timestamp(date, seconds),
        channel,
        status: pickStatus[channel](),
        payment_ref: paymentRef(),
        lines: lines.map((l) => ({ product_id: l.product.product_id, quantity: l.quantity, unit_price: l.product.price })),
        test: false,
        duplicate: false
      })
    }
  }

  // ---- Internal test orders: a few staff accounts placing small orders now and then.
  const cheap = products.filter((p) => p.price < 30)
  const testAccounts = [1, 2, 3].map((i) => {
    const c = newCustomer('2024-06-15')
    c.first_name = 'QA'
    c.last_name = `Tester ${i}`
    c.email = `qa${i}@copperleaf.example`
    return c
  })
  for (let i = 0; i < settings.testOrders; i++) {
    const date = pick(days)
    const p = pick(cheap)
    orders.push({
      customer_id: pick(testAccounts).customer_id,
      ordered_at: timestamp(date, randInt(9 * 3600, 17 * 3600)),
      channel: 'Direct',
      status: 'completed',
      payment_ref: paymentRef(),
      lines: [{ product_id: p.product_id, quantity: 1, unit_price: p.price }],
      test: true,
      duplicate: false
    })
  }
  for (const o of orders) o.order_total = round2(o.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0))

  // ---- The payment-retry bug: duplicate completed orders in the window until the dashboard shows the target drop.
  const revenueOf = (month) =>
    orders.filter((o) => o.status === 'completed' && monthOf(o.ordered_at) === month).reduce((s, o) => s + o.order_total, 0)
  const september = revenueOf('2025-09')
  let august = revenueOf('2025-08')
  const { from: dupFrom, to: dupTo, reportedDrop } = settings.duplicates
  const candidates = shuffle(
    orders.filter((o) => o.status === 'completed' && !o.test && o.ordered_at.slice(0, 10) >= dupFrom && o.ordered_at.slice(0, 10) <= dupTo)
  )
  for (const original of candidates) {
    if (1 - september / august >= reportedDrop) break
    const [day, time] = original.ordered_at.split(' ')
    const [hh, mm, ss] = time.split(':').map(Number)
    const seconds = Math.min(hh * 3600 + mm * 60 + ss + randInt(50, 190), 86399)
    orders.push({ ...original, ordered_at: timestamp(day, seconds), duplicate: true })
    august += original.order_total
  }
  if (1 - september / august < reportedDrop) throw new Error('Not enough orders in the duplicate window to reach the reported drop')

  // ---- IDs follow the time of the order, like a real shop's order numbers.
  orders.sort((a, b) => (a.ordered_at < b.ordered_at ? -1 : a.ordered_at > b.ordered_at ? 1 : 0))
  const orderRows = []
  const itemRows = []
  orders.forEach((o, i) => {
    o.order_id = 50001 + i
    orderRows.push({
      order_id: o.order_id,
      customer_id: o.customer_id,
      ordered_at: o.ordered_at,
      channel: o.channel,
      status: o.status,
      payment_ref: o.payment_ref,
      order_total: o.order_total
    })
    for (const l of o.lines) itemRows.push({ order_item_id: itemRows.length + 1, order_id: o.order_id, ...l })
  })

  // ---- Daily stock snapshots (the warehouse system keeps only the last two months).
  const sold = new Map() // "date|product" -> units shipped that day
  for (const o of orders) {
    if (o.test || o.duplicate || o.status === 'cancelled') continue
    const date = o.ordered_at.slice(0, 10)
    if (date < INVENTORY_FROM) continue
    for (const l of o.lines) sold.set(`${date}|${l.product_id}`, (sold.get(`${date}|${l.product_id}`) ?? 0) + l.quantity)
  }
  const soldOn = (date, id) => sold.get(`${date}|${id}`) ?? 0
  const inventoryDays = dateRange(INVENTORY_FROM, LAST_DAY)
  const inventory = []
  for (const p of products) {
    const id = p.product_id
    let level = randInt(60, 260)
    const levels = inventoryDays.map((date, i) => {
      if (stockoutIds.has(id)) {
        // No deliveries after the last shipment: stock runs down to zero by the end of the day before the stock-out.
        return inventoryDays.slice(i + 1).filter((d) => d < settings.stockout.from).reduce((s, d) => s + soldOn(d, id), 0)
      }
      if (unavailable(id, date) || (id === shortId && inventoryDays[i + 1] === settings.shortStockout.from)) {
        level = 0
        return 0
      }
      if (level < soldOn(date, id) + 5) level += randInt(120, 240)
      level -= soldOn(date, id)
      return level
    })
    inventoryDays.forEach((date, i) => inventory.push({ snapshot_date: date, product_id: id, units_in_stock: levels[i] }))
  }
  inventory.sort((a, b) => (a.snapshot_date < b.snapshot_date ? -1 : a.snapshot_date > b.snapshot_date ? 1 : a.product_id - b.product_id))

  // ---- Monthly marketing numbers per channel.
  const marketing = []
  const months = [...new Set(days.map(monthOf))]
  for (const month of months) {
    const after = `${month}-01` >= CAMPAIGN_CHANGE
    for (const channel of CHANNELS) {
      const spend = (after ? SPEND_AFTER_CHANGE : SPEND)[channel] * (settings.spendFactor ?? 1)
      marketing.push({
        month,
        channel,
        spend: round2(spend * (spend > 0 ? 0.97 + 0.06 * rand() : 1)),
        sessions: Math.round(((intended[`${month}|${channel}`] ?? 0) / CONVERSION[channel]) * (0.97 + 0.06 * rand()))
      })
    }
  }

  const customerRows = [...customers].sort((a, b) => a.customer_id - b.customer_id)
  const productRows = products.map(({ product_id, product_name, category, price }) => ({ product_id, product_name, category, price }))

  return [
    {
      name: 'customers',
      create: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  signup_date TEXT NOT NULL
);`,
      rows: customerRows
    },
    {
      name: 'products',
      create: `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);`,
      rows: productRows
    },
    {
      name: 'orders',
      create: `CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  ordered_at TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_ref TEXT NOT NULL,
  order_total REAL NOT NULL
);`,
      rows: orderRows
    },
    {
      name: 'order_items',
      create: `CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);`,
      rows: itemRows
    },
    {
      name: 'inventory_snapshots',
      create: `CREATE TABLE inventory_snapshots (
  snapshot_date TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  units_in_stock INTEGER NOT NULL,
  PRIMARY KEY (snapshot_date, product_id)
);`,
      rows: inventory
    },
    {
      name: 'marketing_monthly',
      create: `CREATE TABLE marketing_monthly (
  month TEXT NOT NULL,
  channel TEXT NOT NULL,
  spend REAL NOT NULL,
  sessions INTEGER NOT NULL,
  PRIMARY KEY (month, channel)
);`,
      rows: marketing
    }
  ]
}

export const datasets = [
  {
    // What learners investigate. Changing these settings changes every number in the case: bump the dataset version.
    file: 'missing-revenue-v1.sql',
    title: 'Academy case #001 (The Missing Revenue): Copperleaf Home, a fictional online homeware shop.',
    settings: {
      seed: 1001032,
      ordersPerDay: 25,
      stockout: { products: ['Aurora Espresso Machine', 'Copperleaf Stand Mixer', 'AeroCrisp Air Fryer'], from: '2025-09-02', leaveShare: 0.45 },
      shortStockout: { product: 'Linen Throw Pillow', from: '2025-09-14', to: '2025-09-15' },
      duplicates: { from: '2025-08-12', to: '2025-08-19', reportedDrop: 0.32 },
      testOrders: 12
    }
  },
  {
    // The hidden copy: same story and tables, different numbers. Only used to check answers.
    file: 'missing-revenue-v1-hidden.sql',
    title: 'Academy case #001 hidden test data: the same tables with different numbers (used only for checking).',
    settings: {
      seed: 7340017,
      ordersPerDay: 21,
      priceFactor: (rng) => 1.03 + rng.rand() * 0.1,
      stockout: { products: ['Aurora Espresso Machine', 'Copperleaf Stand Mixer', 'AeroCrisp Air Fryer'], from: '2025-09-04', leaveShare: 0.45 },
      shortStockout: { product: 'Ceramic Vase', from: '2025-09-20', to: '2025-09-22' },
      duplicates: { from: '2025-08-13', to: '2025-08-20', reportedDrop: 0.29 },
      testOrders: 9,
      spendFactor: 0.85
    }
  }
]
