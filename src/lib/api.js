import { supabase } from './supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function fetchTables() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tables')
    .select('id, name, status')
    .order('name')
  if (error) return null
  return data
}

/** Resolve table UUID from route param (uuid or "1".."16" → lookup by name). */
export async function resolveTableId(tableId) {
  if (!supabase || !tableId) return null
  if (UUID_REGEX.test(tableId)) return tableId
  const { data } = await supabase
    .from('tables')
    .select('id')
    .eq('name', `Table ${tableId}`)
    .limit(1)
    .single()
  return data?.id ?? null
}

/** Fetch table name and status by id or by name. */
export async function fetchTable(tableId) {
  if (!supabase || !tableId) return null
  const isUuid = UUID_REGEX.test(tableId)
  const { data } = await supabase
    .from('tables')
    .select('name, status')
    .eq(isUuid ? 'id' : 'name', isUuid ? tableId : `Table ${tableId}`)
    .limit(1)
    .maybeSingle()
  return data
}

export async function updateOrderStatus(orderId, status) {
  if (!supabase || !orderId) return false
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  return !error
}

/** Remove all items from an order (keeps order record). */
export async function clearOrderItems(orderId) {
  if (!supabase || !orderId) return false
  const { error } = await supabase.from('order_items').delete().eq('order_id', orderId)
  return !error
}

export async function fetchOpenOrderForTable(tableIdUuid) {
  if (!supabase || !tableIdUuid) return null
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableIdUuid)
    .eq('status', 'open')
    .limit(1)
    .order('created_at', { ascending: false })
    .maybeSingle()
  if (error || !data) return null
  return data.id
}

export async function fetchOrderItems(orderId) {
  if (!supabase || !orderId) return []
  const { data, error } = await supabase
    .from('order_items')
    .select('id, name, price, quantity, menu_item_id')
    .eq('order_id', orderId)
  if (error) return []
  return (data ?? []).map((row) => ({
    id: row.menu_item_id ?? row.id,
    name: row.name,
    price: Number(row.price),
    qty: row.quantity,
  }))
}

export async function createOrderWithItems(tableIdUuid, items) {
  if (!supabase || !tableIdUuid || !items?.length) return null
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ table_id: tableIdUuid, status: 'open' })
    .select('id')
    .single()
  if (orderError || !order) return null
  const rows = items.map(({ name, price, qty, id: menu_item_id }) => ({
    order_id: order.id,
    name,
    price,
    quantity: qty,
    menu_item_id: menu_item_id || null,
  }))
  const { error: itemsError } = await supabase.from('order_items').insert(rows)
  if (itemsError) return null
  return order.id
}

export async function addItemsToOrder(orderId, items) {
  if (!supabase || !orderId || !items?.length) return false
  const rows = items.map(({ name, price, qty, id: menu_item_id }) => ({
    order_id: orderId,
    name,
    price,
    quantity: qty,
    menu_item_id: menu_item_id || null,
  }))
  const { error } = await supabase.from('order_items').insert(rows)
  return !error
}

export async function updateTableStatus(tableIdUuid, status) {
  if (!supabase || !tableIdUuid) return false
  const { error } = await supabase
    .from('tables')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tableIdUuid)
  return !error
}
