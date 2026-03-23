import { Link } from 'react-router-dom'
import { getOrderHistory, getActiveTableIds } from '../store/ordersStore'
import { formatGBP } from '../lib/currency'
import { getRestaurantPlan } from '../config/setup'
import { getCurrentStaffRole } from '../store/staffStore'
import './Placeholder.css'

export default function Billing() {
  const role = getCurrentStaffRole()
  if (role === 'staff') {
    return (
      <div className="placeholder-page">
        <h1 className="placeholder-title">Billing</h1>
        <p className="placeholder-text">Cashier, manager, or owner access required.</p>
      </div>
    )
  }

  const history = getOrderHistory(20)
  const openTables = getActiveTableIds().length
  const plan = getRestaurantPlan()
  const planName = plan.isFounder ? 'Founder Plan' : (plan.name || 'Standard Plan')
  const totalBilled = history.reduce(
    (sum, h) => sum + (h.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0),
    0
  )
  return (
    <div className="placeholder-page">
      <h1 className="placeholder-title">Billing</h1>
      <p className="placeholder-text">Account and sales overview.</p>

      <h2 className="placeholder-title" style={{ fontSize: '1.1rem', marginTop: '0.9rem', marginBottom: '0.35rem' }}>
        Your TableOne Plan
      </h2>
      <div style={{ marginBottom: '0.9rem' }}>
        <p className="placeholder-text">Plan: {planName}</p>
        <p className="placeholder-text">Monthly price: {formatGBP(plan.price)}</p>
        <p className="placeholder-text">Included tills: {plan.tills}</p>
        <p className="placeholder-text">Included devices: {plan.devices}</p>
      </div>

      <h2 className="placeholder-title" style={{ fontSize: '1.1rem', marginTop: '0.2rem', marginBottom: '0.35rem' }}>
        Restaurant Sales
      </h2>
      <p className="placeholder-text" style={{ marginTop: '0.5rem' }}>
        Recent paid bills: {history.length}
      </p>
      <p className="placeholder-text" style={{ marginTop: '0.35rem' }}>
        Open tables: {openTables}
      </p>
      <p className="placeholder-text" style={{ marginTop: '0.4rem' }}>
        Total billed: {formatGBP(totalBilled)}
      </p>
      <p className="placeholder-text" style={{ marginTop: '0.75rem' }}>
        <Link to="/orders">Open full order history</Link>
      </p>
    </div>
  )
}
