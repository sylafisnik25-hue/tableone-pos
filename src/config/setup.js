/**
 * Simple setup/config for the restaurant.
 * Easy to change later; no wizard. Structure ready for multi-restaurant later.
 */

const defaultConfig = {
  restaurantName: 'Mi Piace',
  location: {
    latitude: 51.5074,
    longitude: -0.1278,
  },
  /** Plan assignment by restaurant (no promo codes). */
  plan: {
    name: 'Founder Plan',
    price: 99,
    tills: 1,
    devices: 3,
    isFounder: true,
  },
  /** Order: Downstairs → Terrace → Upstairs (tabs and display). */
  areas: [
    { id: 'downstairs', name: 'Downstairs' },
    { id: 'terrace', name: 'Terrace' },
    { id: 'upstairs', name: 'Upstairs' },
  ],
  tableCount: 34,
  /** table number (1-based) → area id. Downstairs 1–16, Terrace 17–22, Upstairs 23–34. */
  tableAreaMap: (() => {
    const map = {}
    for (let i = 1; i <= 16; i++) map[i] = 'downstairs'
    for (let i = 17; i <= 22; i++) map[i] = 'terrace'
    for (let i = 23; i <= 34; i++) map[i] = 'upstairs'
    return map
  })(),
  staff: [
    { id: '1', name: 'Alex', role: 'staff', pin: '1111', onShift: true },
    { id: '4', name: 'Taylor', role: 'cashier', pin: '3333', onShift: true },
    { id: '2', name: 'Sam', role: 'manager', pin: '2222', onShift: true },
    { id: '3', name: 'Jordan', role: 'owner', pin: '9999', onShift: true },
  ],
}

let config = {
  ...defaultConfig,
  staff: defaultConfig.staff.map((s) => ({ ...s })),
}

export function getConfig() {
  return config
}

export function getAreas() {
  return config.areas
}

export function getTableArea(tableId) {
  const n = Number(tableId)
  if (Number.isNaN(n)) return config.areas[0]?.id ?? 'downstairs'
  return config.tableAreaMap[n] ?? config.areas[0]?.id ?? 'downstairs'
}

export function getTablesByArea(areaId) {
  const tables = []
  for (let i = 1; i <= config.tableCount; i++) {
    if (getTableArea(i) === areaId) {
      tables.push({ id: i, name: `Table ${i}` })
    }
  }
  return tables
}

export function getStaffList() {
  return config.staff
}

function normalizeRole(role) {
  if (role === 'owner' || role === 'manager' || role === 'cashier' || role === 'chef') return role
  if (role === 'till') return 'cashier'
  return 'staff'
}

export function getActiveStaffList() {
  return config.staff.filter((s) => s.onShift !== false)
}

export function addStaffMember({ name, role, pin }) {
  const id = String(Date.now())
  const cleanName = String(name || '').trim()
  const cleanRole = normalizeRole(role)
  const cleanPin = String(pin || '').trim()
  if (!cleanName || !/^\d{4}$/.test(cleanPin)) return false
  config.staff = [
    ...config.staff,
    { id, name: cleanName, role: cleanRole, pin: cleanPin, onShift: true },
  ]
  return true
}

export function removeStaffMember(staffId) {
  const before = config.staff.length
  config.staff = config.staff.filter((s) => String(s.id) !== String(staffId))
  return config.staff.length < before
}

export function updateStaffMember(staffId, updates) {
  let changed = false
  config.staff = config.staff.map((s) => {
    if (String(s.id) !== String(staffId)) return s
    changed = true
    const next = { ...s }
    if (updates?.name != null) next.name = String(updates.name).trim() || s.name
    if (updates?.role != null) {
      next.role = normalizeRole(updates.role)
    }
    if (updates?.pin != null && /^\d{4}$/.test(String(updates.pin).trim())) {
      next.pin = String(updates.pin).trim()
    }
    if (updates?.onShift != null) next.onShift = !!updates.onShift
    return next
  })
  return changed
}

export function getRestaurantName() {
  return config.restaurantName
}

export function getRestaurantPlan() {
  // Direct per-restaurant assignment: Mi Piace founder plan, others default plan.
  const name = String(config.restaurantName || '').trim().toLowerCase()
  if (name === 'mi piace') {
    return {
      name: 'Founder Plan',
      price: 99,
      tills: 1,
      devices: 3,
      isFounder: true,
    }
  }
  return config.plan || {
    name: 'Standard Plan',
    price: 149,
    tills: 1,
    devices: 2,
    isFounder: false,
  }
}

export function getRestaurantLocation() {
  return config.location || { latitude: 0, longitude: 0 }
}

export function updateConfig(updates) {
  config = { ...config, ...updates }
}
