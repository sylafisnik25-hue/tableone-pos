/**
 * In-memory orders per table.
 * Key = tableId (string). Value = {
 *   items, isPaid, amountPaid (derived from payments),
 *   openedBy, updatedBy, closedBy, payments, paidAt, discount, adjustedTotal
 * }.
 * Items: { id, name, price, qty, note?, category?, allergy?, cookLevel? }.
 * Status: isPaid → paid, items.length > 0 → occupied, else → available.
 */

const store = Object.create(null)

function key(tableId) {
  return String(tableId)
}

function lineSubtotal(items) {
  if (!items?.length) return 0
  return items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0)
}

export function getBillSubtotal(tableId) {
  return lineSubtotal(getOrder(tableId).items)
}

/** Total due before payments: adjustedTotal, or subtotal − discount */
export function getBillTotal(tableId) {
  const o = getOrder(tableId)
  const sub = lineSubtotal(o.items)
  const afterDisc = Math.max(0, sub - (o.discount || 0))
  return o.adjustedTotal != null ? o.adjustedTotal : afterDisc
}

/** Sum of recorded payments on this bill (open or closed) */
export function getAmountPaid(tableId) {
  const o = getOrder(tableId)
  return (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
}

export function getRemainingBalance(tableId) {
  const total = getBillTotal(tableId)
  const paid = getAmountPaid(tableId)
  return Math.max(0, Math.round((total - paid) * 100) / 100)
}

export function getOrder(tableId) {
  const k = key(tableId)
  if (!store[k]) {
    store[k] = {
      items: [],
      isPaid: false,
      openedBy: null,
      updatedBy: null,
      closedBy: null,
      payments: [],
      paidAt: null,
      discount: 0,
      adjustedTotal: null,
      lastSubmissionId: null,
      lastSubmittedAt: null,
    }
  }
  return store[k]
}

export function getStatus(tableId) {
  const { items, isPaid } = getOrder(tableId)
  if (isPaid) return 'paid'
  if (items.length > 0) return 'occupied'
  return 'available'
}

export function getItemCount(tableId) {
  const { items } = getOrder(tableId)
  return items.reduce((n, i) => n + (i.qty || 0), 0)
}

export function setItems(tableId, items, staffName = null) {
  const k = key(tableId)
  if (!store[k]) {
    store[k] = {
      items: [],
      isPaid: false,
      openedBy: null,
      updatedBy: null,
      closedBy: null,
      payments: [],
      paidAt: null,
      discount: 0,
      adjustedTotal: null,
      lastSubmissionId: null,
      lastSubmittedAt: null,
    }
  }
  store[k].items = items
  if (items.length > 0) store[k].isPaid = false
  if (staffName) store[k].updatedBy = staffName
}

export function setOpenedBy(tableId, staffName) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  store[k].openedBy = store[k].openedBy || staffName
}

export function clearOrder(tableId) {
  const k = key(tableId)
  store[k] = {
    items: [],
    isPaid: false,
    openedBy: null,
    updatedBy: null,
    closedBy: null,
    payments: [],
    paidAt: null,
    discount: 0,
    adjustedTotal: null,
    lastSubmissionId: null,
    lastSubmittedAt: null,
  }
}

export function setDiscount(tableId, amount) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  store[k].discount = Math.max(0, Number(amount) || 0)
}

export function setAdjustedTotal(tableId, amount) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  const n = amount === null || amount === '' ? null : Number(amount)
  store[k].adjustedTotal = n
}

function settleBill(tableId, staffName) {
  const k = key(tableId)
  store[k].items = []
  store[k].isPaid = true
  store[k].paidAt = Date.now()
  store[k].discount = 0
  store[k].adjustedTotal = null
  if (staffName) store[k].closedBy = staffName
}

/**
 * Partial payment toward current balance.
 */
export function addPartialPayment(tableId, amount, method, staffName = null) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  const remaining = getRemainingBalance(tableId)
  const raw = Number(amount)
  if (!Number.isFinite(raw) || raw <= 0) return
  const pay = Math.min(raw, remaining)
  if (pay <= 0) return
  store[k].payments.push({
    method: method || 'cash',
    amount: Math.round(pay * 100) / 100,
    at: Date.now(),
  })
  if (getRemainingBalance(tableId) <= 0.005) {
    settleBill(tableId, staffName)
  }
}

/**
 * One-tap: pay remaining balance with cash or card (full settle).
 */
export function recordFullPayment(tableId, method, staffName = null) {
  const rem = getRemainingBalance(tableId)
  if (rem <= 0) return
  addPartialPayment(tableId, rem, method, staffName)
}

/**
 * Close bill; merge modal payments with any prior partials on this tab.
 */
export function markPaid(tableId, payments = [], staffName = null) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  const incoming = Array.isArray(payments) ? payments : []
  const prev = [...(store[k].payments || [])]
  const mapped = incoming.map((p) => ({
    method: p.method || 'card',
    amount: Math.round((p.amount || 0) * 100) / 100,
    at: Date.now(),
  }))
  store[k].payments = [...prev, ...mapped]
  store[k].items = []
  store[k].isPaid = true
  store[k].paidAt = Date.now()
  store[k].discount = 0
  store[k].adjustedTotal = null
  if (staffName) store[k].closedBy = staffName
}

export function markOrderSubmitted(tableId, submissionId) {
  const k = key(tableId)
  if (!store[k]) getOrder(tableId)
  store[k].lastSubmissionId = submissionId || null
  store[k].lastSubmittedAt = Date.now()
}

export function getAllOrders() {
  return store
}

export function getOrderHistory(limit = 50) {
  const entries = Object.entries(store).filter(([, o]) => o.paidAt != null)
  entries.sort((a, b) => (b[1].paidAt || 0) - (a[1].paidAt || 0))
  return entries.slice(0, limit).map(([tableId, o]) => ({ tableId, ...o }))
}

export function getActiveTableIds() {
  return Object.entries(store)
    .filter(([, o]) => !o.isPaid && o.items?.length > 0)
    .map(([id]) => id)
}

export function getRevenueSince(startTime) {
  let total = 0
  for (const o of Object.values(store)) {
    if (o.paidAt && o.paidAt >= startTime && o.payments?.length) {
      total += o.payments.reduce((s, p) => s + (p.amount || 0), 0)
    }
  }
  return total
}
