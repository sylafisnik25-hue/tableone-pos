import { Navigate, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Tables from './pages/Tables'
import Orders from './pages/Orders'
import Kitchen from './pages/Kitchen'
import Stock from './pages/Stock'
import Owner from './pages/Owner'
import Staff from './pages/Staff'
import Billing from './pages/Billing'
import { useCurrentStaffRole } from './store/staffStore'

export default function App() {
  const role = useCurrentStaffRole()
  const normalizedRole = role === 'till' ? 'cashier' : role
  const homeElement =
    normalizedRole === 'staff'
      ? <Navigate to="/tables" replace />
      : <Home />
  const canAccess = (path) => {
    if (normalizedRole === 'owner') return true
    if (normalizedRole === 'chef') {
      return ['/'].includes(path)
    }
    if (normalizedRole === 'manager') {
      return ['/','/tables','/orders','/kitchen','/stock','/staff','/billing','/owner'].includes(path)
    }
    if (normalizedRole === 'cashier') {
      return ['/','/tables','/billing'].includes(path)
    }
    return ['/tables','/orders'].includes(path)
  }
  const guard = (path, el) => (canAccess(path) ? el : <Navigate to="/tables" replace />)

  return (
    <Layout>
      <Routes>
        <Route path="/" element={homeElement} />
        <Route path="/tables" element={guard('/tables', <Tables />)} />
        <Route path="/orders" element={guard('/orders', <Orders />)} />
        <Route path="/kitchen" element={guard('/kitchen', <Kitchen />)} />
        <Route path="/stock" element={guard('/stock', <Stock />)} />
        <Route path="/owner" element={guard('/owner', <Owner />)} />
        <Route path="/staff" element={guard('/staff', <Staff />)} />
        <Route path="/billing" element={guard('/billing', <Billing />)} />
      </Routes>
    </Layout>
  )
}
