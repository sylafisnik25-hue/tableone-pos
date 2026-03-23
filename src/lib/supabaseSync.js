import { supabase, isSupabaseConfigured } from './supabase'
import {
  getAllOrders,
  replaceAllOrders,
  subscribeOrdersChange,
  getStatus,
} from '../store/ordersStore'
import {
  getConfig,
  getStaffList,
  setStaffList,
  subscribeConfigChanges,
} from '../config/setup'

let initialized = false
let isHydrating = false
let ordersSyncTimer = null
let staffSyncTimer = null

function normalizeRole(role) {
  if (role === 'owner' || role === 'manager' || role === 'cashier' || role === 'chef') return role
  if (role === 'till') return 'cashier'
  return 'staff'
}

function makeDefaultTableRows() {
  const cfg = getConfig()
  const total = Number(cfg.tableCount) || 0
  const rows = []
  for (let i = 1; i <= total; i += 1) {
    rows.push({
      local_table_id: i,
      name: `Table ${i}`,
      status: getStatus(i),
    })
  }
  return rows
}

async function ensureTablesSeeded() {
  const defaultRows = makeDefaultTableRows()
  if (!defaultRows.length) return
  await supabase.from('tables').upsert(defaultRows, { onConflict: 'local_table_id' })
}

async function loadStaffFromSupabase() {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role, pin, on_shift')
    .order('name')
  if (error || !Array.isArray(data)) return
  const rows = data.map((s) => ({
    id: String(s.id),
    name: String(s.name || '').trim(),
    role: normalizeRole(s.role),
    pin: String(s.pin || ''),
    onShift: s.on_shift !== false,
  }))
  if (rows.length > 0) setStaffList(rows)
}

async function loadOrdersFromSupabase() {
  const { data: orderRows, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, local_table_id, is_paid, opened_by, updated_by, closed_by, paid_at, discount, adjusted_total, last_submission_id, last_submitted_at'
    )
  if (orderError || !Array.isArray(orderRows)) return
  if (orderRows.length === 0) {
    replaceAllOrders({})
    return
  }

  const orderIds = orderRows.map((o) => o.id)
  const { data: itemRows } = await supabase
    .from('order_items')
    .select(
      'order_id, menu_item_id, name, price, quantity, note, category, allergy, cook_level, route, sent_qty'
    )
    .in('order_id', orderIds)
  const { data: paymentRows } = await supabase
    .from('payments')
    .select('order_id, method, amount, paid_at')
    .in('order_id', orderIds)

  const itemByOrderId = new Map()
  for (const row of itemRows || []) {
    const list = itemByOrderId.get(row.order_id) || []
    list.push({
      id: row.menu_item_id ?? row.name,
      name: row.name,
      price: Number(row.price) || 0,
      qty: Number(row.quantity) || 0,
      note: row.note || null,
      category: row.category || null,
      allergy: row.allergy || null,
      cookLevel: row.cook_level || null,
      route: row.route || null,
      sentQty: Number(row.sent_qty) || 0,
    })
    itemByOrderId.set(row.order_id, list)
  }
  const paymentByOrderId = new Map()
  for (const row of paymentRows || []) {
    const list = paymentByOrderId.get(row.order_id) || []
    list.push({
      method: row.method || 'card',
      amount: Number(row.amount) || 0,
      at: row.paid_at ? new Date(row.paid_at).getTime() : Date.now(),
    })
    paymentByOrderId.set(row.order_id, list)
  }

  const hydrated = {}
  for (const o of orderRows) {
    const tableId = String(o.local_table_id)
    if (!tableId) continue
    hydrated[tableId] = {
      items: itemByOrderId.get(o.id) || [],
      isPaid: o.is_paid === true,
      openedBy: o.opened_by || null,
      updatedBy: o.updated_by || null,
      closedBy: o.closed_by || null,
      payments: paymentByOrderId.get(o.id) || [],
      paidAt: o.paid_at ? new Date(o.paid_at).getTime() : null,
      discount: Number(o.discount) || 0,
      adjustedTotal: o.adjusted_total == null ? null : Number(o.adjusted_total),
      lastSubmissionId: o.last_submission_id || null,
      lastSubmittedAt: o.last_submitted_at ? new Date(o.last_submitted_at).getTime() : null,
    }
  }
  replaceAllOrders(hydrated)
}

async function syncStaffToSupabase() {
  if (!isSupabaseConfigured()) return
  if (isHydrating) return
  const rows = getStaffList().map((s) => ({
    id: String(s.id),
    name: String(s.name || '').trim(),
    role: normalizeRole(s.role),
    pin: String(s.pin || ''),
    on_shift: s.onShift !== false,
  }))
  if (!rows.length) return
  await supabase.from('staff').upsert(rows, { onConflict: 'id' })
}

async function syncOrdersToSupabase() {
  if (!isSupabaseConfigured()) return
  if (isHydrating) return
  const all = getAllOrders()
  const tableRows = makeDefaultTableRows()
  if (tableRows.length) {
    await supabase.from('tables').upsert(tableRows, { onConflict: 'local_table_id' })
  }

  const { data: dbTables } = await supabase
    .from('tables')
    .select('id, local_table_id')
    .in(
      'local_table_id',
      tableRows.map((r) => r.local_table_id)
    )

  const tableUuidByLocal = new Map((dbTables || []).map((t) => [String(t.local_table_id), t.id]))
  const localTableIds = Object.keys(all)
  const orderUpserts = localTableIds
    .filter((tableId) => tableUuidByLocal.has(String(tableId)))
    .map((tableId) => {
      const order = all[tableId]
      return {
        local_table_id: Number(tableId),
        table_id: tableUuidByLocal.get(String(tableId)),
        status: order.isPaid ? 'paid' : order.items?.length ? 'open' : 'open',
        is_paid: order.isPaid === true,
        opened_by: order.openedBy || null,
        updated_by: order.updatedBy || null,
        closed_by: order.closedBy || null,
        paid_at: order.paidAt ? new Date(order.paidAt).toISOString() : null,
        discount: Number(order.discount) || 0,
        adjusted_total: order.adjustedTotal == null ? null : Number(order.adjustedTotal),
        last_submission_id: order.lastSubmissionId || null,
        last_submitted_at: order.lastSubmittedAt ? new Date(order.lastSubmittedAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      }
    })

  if (!orderUpserts.length) return
  const { data: savedOrders } = await supabase
    .from('orders')
    .upsert(orderUpserts, { onConflict: 'local_table_id' })
    .select('id, local_table_id')
  if (!Array.isArray(savedOrders)) return

  const savedByLocal = new Map(savedOrders.map((o) => [String(o.local_table_id), o.id]))
  const orderIds = savedOrders.map((o) => o.id)
  if (orderIds.length) {
    await supabase.from('order_items').delete().in('order_id', orderIds)
    await supabase.from('payments').delete().in('order_id', orderIds)
  }

  const itemRows = []
  const paymentRows = []
  for (const [tableId, order] of Object.entries(all)) {
    const orderId = savedByLocal.get(String(tableId))
    if (!orderId) continue
    for (const item of order.items || []) {
      itemRows.push({
        order_id: orderId,
        menu_item_id: item.id == null ? null : Number(item.id) || null,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.qty) || 0,
        note: item.note || null,
        category: item.category || null,
        allergy: item.allergy || null,
        cook_level: item.cookLevel || null,
        route: item.route || null,
        sent_qty: Number(item.sentQty) || 0,
      })
    }
    for (const payment of order.payments || []) {
      paymentRows.push({
        order_id: orderId,
        method: payment.method || 'card',
        amount: Number(payment.amount) || 0,
        paid_at: payment.at ? new Date(payment.at).toISOString() : new Date().toISOString(),
      })
    }
  }
  if (itemRows.length) await supabase.from('order_items').insert(itemRows)
  if (paymentRows.length) await supabase.from('payments').insert(paymentRows)
}

function scheduleOrdersSync() {
  if (!isSupabaseConfigured()) return
  if (ordersSyncTimer) window.clearTimeout(ordersSyncTimer)
  ordersSyncTimer = window.setTimeout(() => {
    syncOrdersToSupabase().catch(() => null)
  }, 350)
}

function scheduleStaffSync() {
  if (!isSupabaseConfigured()) return
  if (staffSyncTimer) window.clearTimeout(staffSyncTimer)
  staffSyncTimer = window.setTimeout(() => {
    syncStaffToSupabase().catch(() => null)
  }, 350)
}

export async function initializeSupabaseSync() {
  if (initialized) return
  initialized = true
  if (!isSupabaseConfigured()) return

  isHydrating = true
  try {
    await ensureTablesSeeded()
    await loadStaffFromSupabase()
    await loadOrdersFromSupabase()
  } catch {
    // Keep app usable in offline/fallback mode.
  } finally {
    isHydrating = false
  }

  subscribeOrdersChange(scheduleOrdersSync)
  subscribeConfigChanges(scheduleStaffSync)
  scheduleStaffSync()
  scheduleOrdersSync()
}
