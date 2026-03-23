import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrderHistory } from '../store/ordersStore'
import { getRecentSubmissions } from '../store/submittedOrdersStore'
import { formatGBP } from '../lib/currency'
import './Orders.css'

function formatDate(ts) {
  return new Date(ts).toLocaleString()
}

export default function Orders() {
  const [limit] = useState(30)
  const history = getOrderHistory(limit)
  const submissions = getRecentSubmissions(10)

  return (
    <div className="orders-page">
      <h1 className="orders-title">Order history</h1>
      {submissions.length > 0 && (
        <ul className="orders-list" style={{ marginBottom: '1rem' }}>
          {submissions.map((entry) => (
            <li key={`sub-${entry.id}`} className="orders-item">
              <div className="orders-item-header">
                <Link to="/tables" className="orders-item-table">
                  Table {entry.tableId}
                </Link>
                <span className="orders-item-date">{formatDate(entry.submittedAt)}</span>
              </div>
              <div className="orders-item-staff">
                Submitted by {entry.staffName || 'Unknown'} · {entry.lines.length} line(s)
              </div>
            </li>
          ))}
        </ul>
      )}
      {history.length === 0 ? (
        <p className="orders-empty">No completed orders yet.</p>
      ) : (
        <ul className="orders-list">
          {history.map((entry) => (
            <li key={entry.tableId + String(entry.paidAt)} className="orders-item">
              <div className="orders-item-header">
                <Link to="/tables" className="orders-item-table">
                  Table {entry.tableId}
                </Link>
                <span className="orders-item-date">{formatDate(entry.paidAt)}</span>
              </div>
              {entry.closedBy && (
                <div className="orders-item-staff">Closed by {entry.closedBy}</div>
              )}
              {entry.payments?.length > 0 && (
                <div className="orders-item-payments">
                  {entry.payments.map((p, i) => (
                    <span key={i} className="orders-item-pay">
                      {p.method}: {formatGBP(p.amount || 0)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
