import { useState } from 'react'
import { getKitchenLines, getBarLines, setLineStatus } from '../store/submittedOrdersStore'
import { getCurrentStaffRole } from '../store/staffStore'
import './Kitchen.css'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSince(ts) {
  const deltaMs = Date.now() - Number(ts || 0)
  const mins = Math.max(0, Math.floor(deltaMs / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m ago`
}

function LineCard({ line, onStatusChange, onBumpReady }) {
  const statusOptions = ['preparing', 'ready']
  const normalizedStatus =
    line.status === 'completed' || line.status === 'ready'
      ? 'ready'
      : 'preparing'
  return (
    <div className="kitchen-line-card">
      <div className="kitchen-line-header">
        <span className="kitchen-line-table">Table {line.tableId}</span>
        <span className="kitchen-line-time">
          {formatTime(line.submittedAt)} · {formatSince(line.submittedAt)}
        </span>
      </div>
      <div className="kitchen-line-body">
        <span className="kitchen-line-name">{line.name} × {line.qty}</span>
        {line.allergy && <span className="kitchen-line-allergy">⚠ {line.allergy}</span>}
        {line.cookLevel && <span className="kitchen-line-cook">{line.cookLevel}</span>}
        {line.note && <span className="kitchen-line-note">{line.note}</span>}
      </div>
      {line.staffName && (
        <div className="kitchen-line-staff">By {line.staffName}</div>
      )}
      <div className="kitchen-line-actions">
        <select
          value={normalizedStatus}
          onChange={(e) => onStatusChange(line.id, e.target.value)}
          className="kitchen-line-select"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {normalizedStatus === 'ready' && (
          <button type="button" className="kitchen-line-select" onClick={() => onBumpReady(line.id)}>
            Bump
          </button>
        )}
      </div>
    </div>
  )
}

export default function Kitchen() {
  const role = getCurrentStaffRole()
  if (role === 'staff' || role === 'cashier' || role === 'till' || role === 'chef') {
    return (
      <div className="kitchen-page">
        <h1 className="kitchen-title">Kitchen / Bar</h1>
        <p className="kitchen-empty">Manager or owner access only.</p>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState('kitchen') // kitchen | bar
  const kitchenLines = getKitchenLines()
  const barLines = getBarLines()
  const lines = activeTab === 'kitchen' ? kitchenLines : barLines

  const [tick, setTick] = useState(0)
  const [hideReady, setHideReady] = useState(false)
  const [bumpedReadyIds, setBumpedReadyIds] = useState([])
  const handleStatusChange = (lineId, status) => {
    setLineStatus(lineId, status)
    setTick((t) => t + 1)
  }
  const handleBumpReady = (lineId) => {
    setBumpedReadyIds((prev) => [...prev, lineId])
  }
  const visibleLines = lines.filter((line) => {
    const isReady = line.status === 'ready' || line.status === 'completed'
    if (bumpedReadyIds.includes(line.id)) return false
    if (hideReady && isReady) return false
    return true
  })

  return (
    <div className="kitchen-page">
      <h1 className="kitchen-title">
        {activeTab === 'kitchen' ? 'Kitchen' : 'Bar'}
      </h1>
      <div className="kitchen-tabs">
        <button
          type="button"
          className={activeTab === 'kitchen' ? 'active' : ''}
          onClick={() => setActiveTab('kitchen')}
        >
          Kitchen
        </button>
        <button
          type="button"
          className={activeTab === 'bar' ? 'active' : ''}
          onClick={() => setActiveTab('bar')}
        >
          Bar
        </button>
        <button
          type="button"
          className={hideReady ? 'active' : ''}
          onClick={() => setHideReady((v) => !v)}
        >
          {hideReady ? 'Show Ready' : 'Hide Ready'}
        </button>
      </div>
      <div className="kitchen-grid">
        {visibleLines.length === 0 ? (
          <p className="kitchen-empty">No orders</p>
        ) : (
          visibleLines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              onStatusChange={handleStatusChange}
              onBumpReady={handleBumpReady}
            />
          ))
        )}
      </div>
    </div>
  )
}
