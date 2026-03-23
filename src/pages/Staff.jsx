import { useState } from 'react'
import {
  getStaffList,
  addStaffMember,
  removeStaffMember,
  updateStaffMember,
} from '../config/setup'
import { getCurrentStaffRole } from '../store/staffStore'
import './Placeholder.css'

export default function Staff() {
  const role = getCurrentStaffRole()
  const canManage = role === 'owner' || role === 'manager'
  if (!canManage) {
    return (
      <div className="placeholder-page">
        <h1 className="placeholder-title">Staff</h1>
        <p className="placeholder-text">Manager or owner access only.</p>
      </div>
    )
  }

  const [, setTick] = useState(0)
  const list = getStaffList()
  const [name, setName] = useState('')
  const [staffRole, setStaffRole] = useState('staff')
  const [pin, setPin] = useState('')

  const refresh = () => setTick((t) => t + 1)

  return (
    <div className="placeholder-page">
      <h1 className="placeholder-title">Staff</h1>
      <p className="placeholder-text">Team access and PIN management.</p>
      <ul style={{ marginTop: '0.75rem', paddingLeft: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        {list.map((s) => (
          <li key={s.id}>
            {s.name} ({s.role}) — PIN: {String(s.pin || '').replace(/\d/g, '•')}
            {canManage && (
              <>
                {' '}
                <button
                  type="button"
                  style={{ marginLeft: '0.35rem' }}
                  onClick={() => {
                    updateStaffMember(s.id, { onShift: !(s.onShift !== false) })
                    refresh()
                  }}
                >
                  {s.onShift !== false ? 'Shift OFF' : 'Shift ON'}
                </button>
                <button
                  type="button"
                  style={{ marginLeft: '0.35rem' }}
                  onClick={() => {
                    const nextRole = window.prompt(
                      `Set role for ${s.name}: staff, cashier, manager, owner`,
                      s.role
                    )
                    if (nextRole == null) return
                    updateStaffMember(s.id, { role: nextRole })
                    refresh()
                  }}
                >
                  Change role
                </button>
                <button
                  type="button"
                  style={{ marginLeft: '0.35rem' }}
                  onClick={() => {
                    const nextPin = window.prompt(`New PIN for ${s.name} (4 digits):`)
                    if (nextPin == null) return
                    updateStaffMember(s.id, { pin: nextPin })
                    refresh()
                  }}
                >
                  Reset PIN
                </button>
                <button
                  type="button"
                  style={{ marginLeft: '0.35rem' }}
                  onClick={() => {
                    removeStaffMember(s.id)
                    refresh()
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '420px' }}>
          <h2 className="placeholder-title" style={{ fontSize: '1.1rem', marginBottom: 0 }}>Add staff</h2>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ minHeight: '40px', padding: '0.45rem 0.55rem' }}
          />
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value)}
            style={{ minHeight: '40px', padding: '0.45rem 0.55rem' }}
          >
            <option value="staff">staff</option>
            <option value="cashier">cashier</option>
            <option value="chef">chef</option>
            <option value="manager">manager</option>
            <option value="owner">owner</option>
          </select>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN (4 digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            style={{ minHeight: '40px', padding: '0.45rem 0.55rem' }}
          />
          <button
            type="button"
            onClick={() => {
              const ok = addStaffMember({ name, role: staffRole, pin })
              if (!ok) {
                window.alert('Enter valid name and 4 digit PIN')
                return
              }
              setName('')
              setStaffRole('staff')
              setPin('')
              refresh()
            }}
          >
            Add staff member
          </button>
        </div>
    </div>
  )
}
