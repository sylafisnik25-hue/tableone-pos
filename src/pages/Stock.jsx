import { useEffect, useState } from 'react'
import { getCurrentStaffRole } from '../store/staffStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Stock.css'

export default function Stock() {
  const role = getCurrentStaffRole()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('General')
  const [qty, setQty] = useState('0')
  const [threshold, setThreshold] = useState('5')

  const loadItems = async () => {
    if (!isSupabaseConfigured()) {
      setItems([])
      setLoading(false)
      setError('Supabase not configured.')
      return
    }
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('stock_items')
      .select('id, name, category, quantity, low_stock_threshold')
      .order('name')
    if (fetchError) {
      setItems([])
      setError(fetchError.message || 'Failed to load stock.')
      setLoading(false)
      return
    }
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  if (role !== 'manager' && role !== 'owner') {
    return (
      <div className="stock-page">
        <h1 className="stock-title">Stock</h1>
        <p className="stock-subtitle">Manager or owner access only.</p>
      </div>
    )
  }

  const addStockItem = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured.')
      return
    }
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Enter an item name.')
      return
    }
    const quantity = Number(qty)
    const lowThreshold = Number(threshold)
    if (!Number.isFinite(quantity) || !Number.isFinite(lowThreshold)) {
      setError('Quantity and threshold must be numbers.')
      return
    }
    setError('')
    const { data, error: insertError } = await supabase
      .from('stock_items')
      .insert({
        name: cleanName,
        category: category.trim() || 'General',
        quantity,
        low_stock_threshold: lowThreshold,
      })
      .select('id, name, category, quantity, low_stock_threshold')
      .single()
    if (insertError || !data) {
      setError(insertError?.message || 'Failed to add item.')
      return
    }
    await supabase.from('stock_movements').insert({
      stock_item_id: data.id,
      movement_type: 'increase',
      quantity_delta: quantity,
      previous_quantity: 0,
      next_quantity: quantity,
      note: 'Item created',
    })
    setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setName('')
    setCategory('General')
    setQty('0')
    setThreshold('5')
  }

  const adjustQuantity = async (item, delta) => {
    if (!isSupabaseConfigured()) return
    const previous = Number(item.quantity) || 0
    const next = Math.max(0, Math.round((previous + delta) * 100) / 100)
    const { error: updateError } = await supabase
      .from('stock_items')
      .update({ quantity: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (updateError) {
      setError(updateError.message || 'Failed to update quantity.')
      return
    }
    await supabase.from('stock_movements').insert({
      stock_item_id: item.id,
      movement_type: delta >= 0 ? 'increase' : 'decrease',
      quantity_delta: delta,
      previous_quantity: previous,
      next_quantity: next,
      note: 'Quick adjustment',
    })
    setItems((prevItems) =>
      prevItems.map((row) => (row.id === item.id ? { ...row, quantity: next } : row))
    )
  }

  const editThreshold = async (item) => {
    const raw = window.prompt(`Low stock threshold for ${item.name}:`, String(item.low_stock_threshold))
    if (raw == null) return
    const nextThreshold = Number(raw)
    if (!Number.isFinite(nextThreshold) || nextThreshold < 0) {
      setError('Threshold must be 0 or higher.')
      return
    }
    const { error: updateError } = await supabase
      .from('stock_items')
      .update({ low_stock_threshold: nextThreshold, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (updateError) {
      setError(updateError.message || 'Failed to update threshold.')
      return
    }
    await supabase.from('stock_movements').insert({
      stock_item_id: item.id,
      movement_type: 'set_threshold',
      quantity_delta: 0,
      previous_quantity: Number(item.quantity) || 0,
      next_quantity: Number(item.quantity) || 0,
      note: `Threshold set to ${nextThreshold}`,
    })
    setItems((prevItems) =>
      prevItems.map((row) =>
        row.id === item.id ? { ...row, low_stock_threshold: nextThreshold } : row
      )
    )
  }

  return (
    <div className="stock-page">
      <h1 className="stock-title">Stock</h1>
      <p className="stock-subtitle">Inventory and stock levels.</p>

      <div className="stock-card">
        <div className="stock-add-row">
          <input
            type="text"
            className="stock-input"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            className="stock-input"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="stock-input"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="stock-input"
            placeholder="Low at"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <button type="button" className="stock-btn stock-btn--primary" onClick={addStockItem}>
            Add stock item
          </button>
        </div>
      </div>

      {error && <p className="stock-error">{error}</p>}

      <div className="stock-card">
        {loading ? (
          <p className="stock-empty">Loading stock...</p>
        ) : items.length === 0 ? (
          <p className="stock-empty">No stock items yet.</p>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Current Qty</th>
                <th>Low Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const currentQty = Number(item.quantity) || 0
                const lowThreshold = Number(item.low_stock_threshold) || 0
                const isLow = currentQty <= lowThreshold
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category || 'General'}</td>
                    <td>{currentQty}</td>
                    <td>{lowThreshold}</td>
                    <td className={isLow ? 'stock-status-low' : 'stock-status-ok'}>
                      {isLow ? 'Low' : 'OK'}
                    </td>
                    <td>
                      <div className="stock-actions">
                        <button
                          type="button"
                          className="stock-btn"
                          onClick={() => adjustQuantity(item, 1)}
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="stock-btn"
                          onClick={() => adjustQuantity(item, -1)}
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          className="stock-btn"
                          onClick={() => editThreshold(item)}
                        >
                          Edit threshold
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <button type="button" className="stock-btn" onClick={loadItems}>
        Refresh
      </button>
    </div>
  )
}
