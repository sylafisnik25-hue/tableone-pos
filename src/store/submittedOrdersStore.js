/**
 * Submitted orders for Kitchen/Bar display.
 * When "Submit order" is pressed, we push a snapshot. Items are routed by category: Drinks → Bar, Food/Desserts → Kitchen.
 */

const submissions = []
let nextId = 1

const DESTINATION_BAR = 'bar'
const DESTINATION_KITCHEN = 'kitchen'

function getDestination(item) {
  if (item?.route === DESTINATION_BAR) return DESTINATION_BAR
  if (item?.route === DESTINATION_KITCHEN) return DESTINATION_KITCHEN
  if (item?.category === 'Drinks') return DESTINATION_BAR
  return DESTINATION_KITCHEN
}

export function submitOrder(tableId, items, staffName = null) {
  const id = String(nextId++)
  const at = Date.now()
  const lines = items.map((item) => ({
    id: `${id}-${item.id}-${Math.random().toString(36).slice(2)}`,
    name: item.name,
    price: item.price,
    qty: item.qty,
    note: item.note || null,
    allergy: item.allergy || null,
    cookLevel: item.cookLevel || null,
    category: item.category,
    route: item.route || null,
    destination: getDestination(item),
    status: 'preparing',
    tableId,
    submittedAt: at,
  }))
  submissions.push({
    id,
    tableId,
    lines,
    staffName,
    submittedAt: at,
  })
  return id
}

export function getKitchenLines() {
  const out = []
  for (const sub of submissions) {
    for (const line of sub.lines) {
      if (line.destination === DESTINATION_KITCHEN) {
        out.push({ ...line, orderId: sub.id, staffName: sub.staffName })
      }
    }
  }
  return out.sort((a, b) => b.submittedAt - a.submittedAt)
}

export function getBarLines() {
  const out = []
  for (const sub of submissions) {
    for (const line of sub.lines) {
      if (line.destination === DESTINATION_BAR) {
        out.push({ ...line, orderId: sub.id, staffName: sub.staffName })
      }
    }
  }
  return out.sort((a, b) => b.submittedAt - a.submittedAt)
}

export function setLineStatus(lineId, status) {
  for (const sub of submissions) {
    const line = sub.lines.find((l) => l.id === lineId)
    if (line) {
      line.status = status
      return
    }
  }
}

export function getRecentSubmissions(limit = 20) {
  return [...submissions].reverse().slice(0, limit)
}

export function getSubmittedCountSince(startTime) {
  return submissions.filter((s) => s.submittedAt >= startTime).length
}

export function getOrderStatusSummary() {
  const summary = {
    preparing: 0,
    ready: 0,
    total: 0,
  }
  for (const sub of submissions) {
    for (const line of sub.lines) {
      summary.total += 1
      if (line.status === 'ready' || line.status === 'completed') summary.ready += 1
      else summary.preparing += 1
    }
  }
  return summary
}
