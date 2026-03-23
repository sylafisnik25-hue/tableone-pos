import { Outlet, Link, useLocation } from 'react-router-dom'
import { getRestaurantName } from '../config/setup'
import { useCurrentStaffRole } from '../store/staffStore'
import StaffSelector from './StaffSelector'
import './Layout.css'

const NAV_ITEMS = [
  { path: '/', label: 'Home', roles: ['chef', 'staff', 'cashier', 'manager', 'owner'] },
  { path: '/tables', label: 'Tables', roles: ['staff', 'cashier', 'manager', 'owner'] },
  { path: '/kitchen', label: 'Kitchen', roles: ['manager', 'owner'] },
  { path: '/billing', label: 'Billing', roles: ['cashier', 'manager', 'owner'] },
]

export default function Layout({ children }) {
  const location = useLocation()
  const role = useCurrentStaffRole()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const canSeeNav = (item) => {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">{getRestaurantName()}</Link>
        <nav className="nav">
          {NAV_ITEMS.filter(canSeeNav).map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`nav-link ${isActive(path) ? 'active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <StaffSelector />
      </header>
      <main className="main">
        {children ?? <Outlet />}
      </main>
      <footer className="app-footer">Powered by Table1</footer>
    </div>
  )
}
