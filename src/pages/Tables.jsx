import { useState } from 'react'
import { getStatus, getItemCount } from '../store/ordersStore'
import { getAreas, getTablesByArea } from '../config/setup'
import Order from './Order'
import './Tables.css'

export default function Tables() {
  const areas = getAreas()
  const [selectedArea, setSelectedArea] = useState(areas[0]?.id ?? 'downstairs')
  const [selectedTable, setSelectedTable] = useState(null)
  const visibleTables = getTablesByArea(selectedArea)
  const selectedAreaName = areas.find((a) => a.id === selectedArea)?.name ?? 'Tables'

  if (selectedTable != null) {
    return (
      <div className="tables-page">
        <Order
          tableId={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      </div>
    )
  }

  return (
    <div className="tables-page">
      <h1 className="tables-header">
        <span className="tables-header-area">{selectedAreaName}</span>
        <span className="tables-header-sep"> — Select Table</span>
      </h1>
      <div className="area-tabs" role="tablist">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            role="tab"
            aria-selected={selectedArea === area.id}
            className={`area-tab ${selectedArea === area.id ? 'active' : ''}`}
            onClick={() => setSelectedArea(area.id)}
          >
            {area.name}
          </button>
        ))}
      </div>
      <div className="tables-grid">
        {visibleTables.map((table) => {
          const status = getStatus(table.id)
          const itemCount = getItemCount(table.id)
          return (
            <button
              key={table.id}
              type="button"
              className={`table-card status-${status}`}
              onClick={() => setSelectedTable(table.id)}
            >
              <span className="table-name">{table.name}</span>
              <span className="table-status">{status}</span>
              {itemCount > 0 && (
                <span className="table-badge" aria-label={`${itemCount} items`}>
                  {itemCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
