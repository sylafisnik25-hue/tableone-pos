import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRevenueSince,
  getAllOrders,
  getOrder,
  clearOrder,
  setDiscount,
  setAdjustedTotal,
} from '../store/ordersStore'
import { getRestaurantName, getConfig } from '../config/setup'
import { getCurrentStaffRole, verifyPinForRole } from '../store/staffStore'
import { formatGBP } from '../lib/currency'
import { getRecentSubmissions, getSubmittedCountSince } from '../store/submittedOrdersStore'
import './Owner.css'

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
function getMonthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const FILTERS = [
  { id: 'today', label: 'Today', start: getTodayStart },
  { id: 'week', label: 'This week', start: getWeekStart },
  { id: 'month', label: 'This month', start: getMonthStart },
]

const tableIds = Array.from({ length: getConfig().tableCount }, (_, i) => i + 1)

export default function Owner() {
  const role = getCurrentStaffRole()
  const canAccess = role === 'owner' || role === 'manager'

  const [filterId, setFilterId] = useState('today')
  const [ownerTableId, setOwnerTableId] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [adjustedInput, setAdjustedInput] = useState('')
  const [tick, setTick] = useState(0)

  const filter = FILTERS.find((f) => f.id === filterId) || FILTERS[0]
  const startTime = typeof filter.start === 'function' ? filter.start() : filter.start
  const todayStart = getTodayStart()

  const revenue = getRevenueSince(startTime)
  const recentSubmissions = getRecentSubmissions(20)
  const ordersToday = getSubmittedCountSince(todayStart)
  const allOrders = getAllOrders()
  const openTablesCount = Object.keys(allOrders).filter(
    (id) => allOrders[id].items?.length > 0 && !allOrders[id].isPaid
  ).length

  const handleDeleteBill = () => {
    if (!ownerTableId) return
    const pin = window.prompt('Owner PIN required to void/delete bill')
    if (!verifyPinForRole(pin, 'owner')) {
      window.alert('Owner PIN is required')
      return
    }
    clearOrder(ownerTableId)
    setOwnerTableId('')
    setTick((t) => t + 1)
  }
  const handleApplyDiscount = () => {
    if (!ownerTableId) return
    const amount = parseFloat(discountInput)
    if (!Number.isNaN(amount)) setDiscount(ownerTableId, amount)
    setDiscountInput('')
    setTick((t) => t + 1)
  }
  const handleAdjustTotal = () => {
    if (!ownerTableId) return
    const pin = window.prompt('Owner PIN required to adjust total')
    if (!verifyPinForRole(pin, 'owner')) {
      window.alert('Owner PIN is required')
      return
    }
    if (adjustedInput === '' || adjustedInput === null) {
      setAdjustedTotal(ownerTableId, null)
    } else {
      const amount = parseFloat(adjustedInput)
      if (!Number.isNaN(amount)) setAdjustedTotal(ownerTableId, amount)
    }
    setAdjustedInput('')
    setTick((t) => t + 1)
  }

  const previewOrder = ownerTableId ? getOrder(ownerTableId) : null
  const previewItems = previewOrder?.items ?? []
  const previewSub = previewItems.reduce((s, i) => s + i.price * i.qty, 0)
  const previewTotal =
    previewOrder?.adjustedTotal != null
      ? previewOrder.adjustedTotal
      : Math.max(0, previewSub - (previewOrder?.discount || 0))

  let cardTotal = 0
  let cashTotal = 0
  for (const o of Object.values(allOrders)) {
    if (!o.payments?.length) continue
    for (const p of o.payments) {
      if (p.method === 'card') cardTotal += p.amount || 0
      if (p.method === 'cash') cashTotal += p.amount || 0
    }
  }

  if (!canAccess) {
    return (
      <div className="owner-page">
        <h1 className="owner-title">{getRestaurantName()}</h1>
        <p className="owner-empty">Owner / Manager access only. Switch staff in the header.</p>
      </div>
    )
  }

  return (
    <div className="owner-page">
      <h1 className="owner-title">{getRestaurantName()} — Owner / Manager</h1>

      <div className="owner-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filterId === f.id ? 'active' : ''}
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="owner-cards">
        <div className="owner-card">
          <span className="owner-card-label">Revenue ({filter.label.toLowerCase()})</span>
          <span className="owner-card-value">{formatGBP(revenue)}</span>
        </div>
        <div className="owner-card">
          <span className="owner-card-label">Active tables</span>
          <span className="owner-card-value">{openTablesCount}</span>
        </div>
        <div className="owner-card">
          <span className="owner-card-label">Orders today</span>
          <span className="owner-card-value">{ordersToday}</span>
        </div>
      </div>

      <div className="owner-section">
        <h2 className="owner-section-title">Payment split (all time)</h2>
        <p className="owner-payment-split">
          Card: {formatGBP(cardTotal)} — Cash: {formatGBP(cashTotal)}
        </p>
      </div>

      <div className="owner-section">
        <h2 className="owner-section-title">Table bill (edit / void / discount)</h2>
        <div className="owner-controls">
          <label>
            Table
            <select
              value={ownerTableId}
              onChange={(e) => setOwnerTableId(e.target.value)}
              className="owner-select"
            >
              <option value="">Select table</option>
              {tableIds.map((id) => (
                <option key={id} value={id}>Table {id}</option>
              ))}
            </select>
          </label>
          {ownerTableId && previewOrder && (
            <div className="owner-bill-preview">
              <p className="owner-bill-preview-total">
                Bill total: {formatGBP(previewTotal)}
                {previewOrder.discount > 0 && ` (discount ${formatGBP(previewOrder.discount)})`}
              </p>
              {previewItems.length > 0 && (
                <ul className="owner-bill-preview-lines">
                  {previewItems.map((it, i) => (
                    <li key={i}>
                      {it.name} × {it.qty} — {formatGBP(it.price * it.qty)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button type="button" className="owner-btn owner-btn-danger" onClick={handleDeleteBill} disabled={!ownerTableId}>
            Void / delete bill
          </button>
          <label>
            Discount (£)
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="owner-input"
              placeholder="0"
            />
          </label>
          <button type="button" className="owner-btn" onClick={handleApplyDiscount} disabled={!ownerTableId}>
            Apply discount
          </button>
          <label>
            Adjust total (£)
            <input
              type="number"
              step="0.01"
              min="0"
              value={adjustedInput}
              onChange={(e) => setAdjustedInput(e.target.value)}
              className="owner-input"
              placeholder="Override total"
            />
          </label>
          <button type="button" className="owner-btn" onClick={handleAdjustTotal} disabled={!ownerTableId}>
            Set adjusted total
          </button>
        </div>
      </div>

      <div className="owner-section">
        <h2 className="owner-section-title">Recent submitted orders</h2>
        {recentSubmissions.length === 0 ? (
          <p className="owner-empty">No submitted orders yet.</p>
        ) : (
          <ul className="owner-history">
            {recentSubmissions.slice(0, 12).map((entry) => (
              <li key={`sub-${entry.id}`}>
                <Link to="/tables">Table {entry.tableId}</Link>
                <span className="owner-history-meta">
                  {entry.staffName && ` · ${entry.staffName}`}
                  {' · '}
                  {entry.lines.length} line(s)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
