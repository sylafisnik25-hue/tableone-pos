import { useState } from 'react'
import { getStaffList, getRestaurantLocation } from '../config/setup'
import {
  getCurrentStaff,
  authenticateStaffWithPin,
  signOutStaff,
  recordStaffSignIn,
  getLatestStaffSignIn,
} from '../store/staffStore'
import { distanceMeters } from '../lib/geo'
import './StaffSelector.css'

export default function StaffSelector() {
  const list = getStaffList()
  const current = getCurrentStaff()
  const latestSignIn = getLatestStaffSignIn()
  const [open, setOpen] = useState(false)
  const [staffId, setStaffId] = useState(current?.id ? String(current.id) : '')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (list.length === 0) return null

  return (
    <div className="staff-selector">
      <button
        type="button"
        className="staff-selector-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {current?.name ? `${current.name} (${current.role})` : 'Staff PIN'}
      </button>
      {open && (
        <>
          <div className="staff-selector-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <div className="staff-selector-dropdown" role="dialog" aria-label="Staff login">
            <div className="staff-selector-login">
              <label htmlFor="staff-user">Select user</label>
              <select
                id="staff-user"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="">Choose staff</option>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
              <label htmlFor="staff-pin">Enter 4-digit PIN</label>
              <input
                id="staff-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN"
              />
              {error && <p className="staff-selector-error">{error}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const run = async () => {
                    if (!staffId) {
                      setError('Select a user first')
                      return
                    }
                    if (!/^\d{4}$/.test(pin)) {
                      setError('Enter a valid 4-digit PIN')
                      return
                    }
                    if (!navigator.geolocation) {
                      const staffNoGeo = authenticateStaffWithPin(staffId, pin)
                      if (!staffNoGeo) {
                        setError('Invalid PIN for selected user')
                        return
                      }
                      const isDev = window.location.hostname === 'localhost'
                      if (staffNoGeo.role === 'manager' || staffNoGeo.role === 'owner') {
                        recordStaffSignIn(staffNoGeo)
                        setError('Unable to verify location on this device - manager/owner override used')
                        setPin('')
                        setStaffId(String(staffNoGeo.id))
                        setOpen(false)
                        return
                      }
                      if (isDev) {
                        recordStaffSignIn(staffNoGeo)
                        setError('Location unavailable on this device - dev bypass used')
                        setPin('')
                        setStaffId(String(staffNoGeo.id))
                        setOpen(false)
                        return
                      }
                      setError('Unable to verify location on this device')
                      return
                    }
                    setBusy(true)
                    try {
                      const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                          enableHighAccuracy: true,
                          maximumAge: 10000,
                          timeout: 10000,
                        })
                      })
                      const { latitude, longitude } = getRestaurantLocation()
                      const dist = distanceMeters(
                        pos.coords.latitude,
                        pos.coords.longitude,
                        latitude,
                        longitude
                      )
                      if (!Number.isFinite(dist)) {
                        setError('Unable to verify location on this device')
                        return
                      }
                      if (dist > 100) {
                        setError('You must be within 100m of the restaurant to sign in')
                        return
                      }
                      const staff = authenticateStaffWithPin(staffId, pin)
                      if (!staff) {
                        setError('Invalid PIN for selected user')
                        return
                      }
                      recordStaffSignIn(staff)
                      setError('')
                      setPin('')
                      setStaffId(String(staff.id))
                      setOpen(false)
                    } catch (e) {
                      const staffFallback = authenticateStaffWithPin(staffId, pin)
                      if (!staffFallback) {
                        setError('Invalid PIN for selected user')
                        return
                      }
                      const isDev = window.location.hostname === 'localhost'
                      if (staffFallback.role === 'manager' || staffFallback.role === 'owner') {
                        recordStaffSignIn(staffFallback)
                        setError('Unable to verify location on this device - manager/owner override used')
                        setPin('')
                        setStaffId(String(staffFallback.id))
                        setOpen(false)
                        return
                      }
                      if (isDev) {
                        recordStaffSignIn(staffFallback)
                        setError('Location unavailable on this device - dev bypass used')
                        setPin('')
                        setStaffId(String(staffFallback.id))
                        setOpen(false)
                        return
                      }
                      if (e?.code === 1) {
                        setError('Location permission required to sign in')
                      } else {
                        setError('Unable to verify location on this device')
                      }
                    } finally {
                      setBusy(false)
                    }
                  }
                  run()
                }}
              >
                {busy ? 'Verifying...' : 'Login'}
              </button>
            </div>
            <div className="staff-selector-divider" />
            {current?.id && (
              <button
                type="button"
                className="staff-selector-signout"
                onClick={() => {
                  signOutStaff()
                  setOpen(false)
                }}
              >
                Sign out
              </button>
            )}
            {latestSignIn?.staffName && (
              <p className="staff-selector-signedin">
                Signed in at{' '}
                {new Date(latestSignIn.signedInAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · On site
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
