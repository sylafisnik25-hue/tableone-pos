import { getCurrentStaffRole } from '../store/staffStore'
import './Placeholder.css'

export default function Stock() {
  const role = getCurrentStaffRole()
  if (role !== 'manager' && role !== 'owner') {
    return (
      <div className="placeholder-page">
        <h1 className="placeholder-title">Stock</h1>
        <p className="placeholder-text">Manager or owner access only.</p>
      </div>
    )
  }

  return (
    <div className="placeholder-page">
      <h1 className="placeholder-title">Stock</h1>
      <p className="placeholder-text">Inventory and stock levels.</p>
    </div>
  )
}
