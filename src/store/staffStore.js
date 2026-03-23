/**
 * Current staff selection (in-memory). Used for openedBy, updatedBy, closedBy.
 */

import { useSyncExternalStore } from 'react'
import { getStaffList } from '../config/setup'

let currentStaffId = null
let currentStaffName = null
let currentStaffRole = null
let latestSignIn = null
const listeners = new Set()

function notifyStaffChange() {
  for (const cb of listeners) cb()
}

function subscribeStaffChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function ensureCurrentStaff() {
  if (currentStaffId != null && currentStaffName != null) {
    return
  }
  const list = getStaffList()
  if (list.length > 0) {
    const first = list[0]
    currentStaffId = first.id
    currentStaffName = first.name
    currentStaffRole = first.role ?? 'staff'
  }
}

export function getCurrentStaff() {
  ensureCurrentStaff()
  if (currentStaffId != null && currentStaffName != null) {
    const list = getStaffList()
    const staff = list.find((s) => String(s.id) === String(currentStaffId))
    return { id: currentStaffId, name: currentStaffName, role: staff?.role ?? 'staff' }
  }
  return { id: null, name: null, role: 'staff' }
}

export function getCurrentStaffRole() {
  return getCurrentStaff().role ?? 'staff'
}

export function setCurrentStaff(staffId) {
  const list = getStaffList()
  const staff = list.find((s) => String(s.id) === String(staffId))
  if (staff) {
    currentStaffId = staff.id
    currentStaffName = staff.name
    currentStaffRole = staff.role ?? 'staff'
    notifyStaffChange()
  }
}

export function authenticateWithPin(pin) {
  const p = String(pin || '').trim()
  const list = getStaffList()
  const staff = list.find((s) => String(s.pin || '') === p)
  if (!staff) return null
  setCurrentStaff(staff.id)
  return { id: staff.id, name: staff.name, role: staff.role ?? 'staff' }
}

export function authenticateStaffWithPin(staffId, pin) {
  const id = String(staffId || '').trim()
  const p = String(pin || '').trim()
  const list = getStaffList()
  const staff = list.find(
    (s) => String(s.id) === id && String(s.pin || '') === p
  )
  if (!staff) return null
  setCurrentStaff(staff.id)
  return { id: staff.id, name: staff.name, role: staff.role ?? 'staff' }
}

export function verifyPinForRole(pin, role) {
  const p = String(pin || '').trim()
  const list = getStaffList()
  return list.some(
    (s) => String(s.pin || '') === p && (s.role ?? 'staff') === role
  )
}

export function signOutStaff() {
  currentStaffId = null
  currentStaffName = null
  currentStaffRole = null
  notifyStaffChange()
}

export function getStaffName() {
  return getCurrentStaff().name
}

export function isAdminRole() {
  const r = getCurrentStaffRole()
  return r === 'owner' || r === 'manager'
}

export function useCurrentStaffRole() {
  return useSyncExternalStore(subscribeStaffChange, getCurrentStaffRole, getCurrentStaffRole)
}

export function recordStaffSignIn(staff) {
  latestSignIn = {
    staffName: staff?.name || null,
    role: staff?.role || null,
    signedInAt: Date.now(),
    onSite: true,
  }
  notifyStaffChange()
}

export function getLatestStaffSignIn() {
  return latestSignIn
}
