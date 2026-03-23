import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { menuByCategory, categories, menuItems as allMenuItems } from '../data/menu'
import {
  getOrder,
  getStatus,
  setItems,
  setOpenedBy,
  clearOrder as storeClearOrder,
  markPaid as storeMarkPaid,
  setDiscount,
  setAdjustedTotal,
  recordFullPayment,
  addPartialPayment,
  getAmountPaid,
  markOrderSubmitted,
} from '../store/ordersStore'
import { submitOrder } from '../store/submittedOrdersStore'
import { getStaffName, getCurrentStaffRole, verifyPinForRole } from '../store/staffStore'
import { formatGBP } from '../lib/currency'
import PaymentModal from '../components/PaymentModal'
import AddItemModal from '../components/AddItemModal'
import './Order.css'

const COOK_LEVELS = ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done']

const DUMMY_PASTA = {
  id: 900001,
  name: 'Pasta',
  price: 10,
  category: 'Food',
  note: null,
  allergy: null,
  cookLevel: null,
}

function menuItemMeta(id) {
  return allMenuItems.find((m) => m.id === id)
}

/** Strip UI-only flags before persisting to store / kitchen */
function orderItemForStore(i) {
  const { requiresNote, fromModal, ...rest } = i
  return rest
}

/** Parse "10%" or "5" / "£5" → discount amount in currency */
function parseDiscountInput(raw, subtotal) {
  const s = String(raw).trim()
  if (!s) return 0
  if (/%\s*$/.test(s) || (s.includes('%') && !/^[\d.]+\s*£?$/.test(s))) {
    const num = parseFloat(s.replace(/[%,\s]/g, ''))
    return Number.isFinite(num) ? Math.round((subtotal * num) / 100 * 100) / 100 : 0
  }
  const n = parseFloat(s.replace(/[£$,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export default function Order({ tableId, onClose }) {
  const selectedTable = tableId != null ? String(tableId) : null
  const isManagerRole = getCurrentStaffRole() === 'manager'
  const canAdjustTotal = () => {
    const r = getCurrentStaffRole()
    return r === 'owner' || r === 'manager'
  }

  if (!selectedTable) return null

  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [orderItems, setOrderItems] = useState([])
  const [cardQtyById, setCardQtyById] = useState({})
  const [activeDrinkGroup, setActiveDrinkGroup] = useState('Soft Drinks')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [partPayInput, setPartPayInput] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [adjustInput, setAdjustInput] = useState('')
  const [addFeedback, setAddFeedback] = useState('')
  const [orderEditFeedback, setOrderEditFeedback] = useState('')
  const [addFlashItemId, setAddFlashItemId] = useState(null)
  const [addFlashText, setAddFlashText] = useState('Added ✔')
  const [addHighlightItemId, setAddHighlightItemId] = useState(null)
  const [, setVoidedItems] = useState([])
  const [sendFeedback, setSendFeedback] = useState('')
  const [sendState, setSendState] = useState('idle') // idle | sending | success | error
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [skipSendConfirm, setSkipSendConfirm] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('tableone-skip-send-confirm') === '1'
  })
  const [hasExistingOrder, setHasExistingOrder] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [, setStoreTick] = useState(0)
  const [addModalItem, setAddModalItem] = useState(null)
  const addFeedbackTimerRef = useRef(null)
  const addHighlightTimerRef = useRef(null)
  const orderEditFeedbackTimerRef = useRef(null)
  const addTapGuardRef = useRef({})

  const bump = () => setStoreTick((t) => t + 1)
  const canModifyOrder = !hasExistingOrder || !isManagerRole || isEditMode

  const syncItemsToStore = () => {
    setItems(
      selectedTable,
      orderItems.map((i) => orderItemForStore({ ...i })),
      getStaffName()
    )
  }

  useEffect(() => {
    const order = getOrder(selectedTable)
    const existing = !order.isPaid && (order.items?.length || 0) > 0
    setHasExistingOrder(existing)
    setIsEditMode(false)
    if (order.isPaid) {
      setOrderItems([])
    } else {
      setOrderItems(
        order.items.map((i) => {
          const category = allMenuItems.find((m) => m.id === i.id)?.category || 'Food'
          const qty = Number(i.qty) || 0
          const hasExplicitSentQty = i.sentQty != null && Number.isFinite(Number(i.sentQty))
          // Legacy orders may not have sentQty. If the order was already submitted,
          // treat existing lines as already sent so only new additions are sent next.
          const inferredSentQty = order.lastSubmittedAt ? qty : 0
          return {
            ...i,
            qty,
            sentQty: hasExplicitSentQty ? Number(i.sentQty) || 0 : inferredSentQty,
            category: i.category || category,
            route: i.route || (category === 'Drinks' ? 'bar' : 'kitchen'),
            allergy: i.allergy ?? null,
            cookLevel: i.cookLevel ?? null,
            note: i.note ?? null,
          }
        })
      )
    }
    setDiscountInput('')
    setAdjustInput(
      order.adjustedTotal != null && !order.isPaid ? String(order.adjustedTotal) : ''
    )
  }, [selectedTable])

  useEffect(() => {
    return () => {
      if (addFeedbackTimerRef.current) clearTimeout(addFeedbackTimerRef.current)
      if (addHighlightTimerRef.current) clearTimeout(addHighlightTimerRef.current)
      if (orderEditFeedbackTimerRef.current) clearTimeout(orderEditFeedbackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (activeCategory !== 'Drinks') return
    const drinkItems = menuByCategory.Drinks || []
    const groups = [...new Set(drinkItems.map((d) => d.drinkGroup).filter(Boolean))]
    if (groups.length === 0) return
    if (!groups.includes(activeDrinkGroup)) setActiveDrinkGroup(groups[0])
  }, [activeCategory, activeDrinkGroup])

  useEffect(() => {
    const stored = getOrder(selectedTable)
    if (orderItems.length === 0 && stored.items.length > 0) return
    if (isManagerRole && hasExistingOrder) return
    const staffName = getStaffName()
    setItems(
      selectedTable,
      orderItems.map((i) => orderItemForStore({ ...i })),
      staffName
    )
  }, [selectedTable, orderItems, isManagerRole, hasExistingOrder])

  const updateLineField = (index, patch) => {
    if (!canModifyOrder) return
    setOrderItems((prev) =>
      prev.map((i, idx) => (idx === index ? { ...i, ...patch } : i))
    )
  }

  const flashAddFeedback = (itemId, message, btnText = 'Added ✔') => {
    if (addFeedbackTimerRef.current) clearTimeout(addFeedbackTimerRef.current)
    if (addHighlightTimerRef.current) clearTimeout(addHighlightTimerRef.current)
    setAddFeedback(message)
    setAddFlashItemId(itemId)
    setAddFlashText(btnText)
    setAddHighlightItemId(itemId)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12)
    }
    addHighlightTimerRef.current = setTimeout(() => {
      setAddHighlightItemId(null)
      addHighlightTimerRef.current = null
    }, 800)
    addFeedbackTimerRef.current = setTimeout(() => {
      setAddFeedback('')
      setAddFlashItemId(null)
      setAddFlashText('Added ✔')
      addFeedbackTimerRef.current = null
    }, 1500)
  }

  const flashOrderEditFeedback = (message) => {
    if (orderEditFeedbackTimerRef.current) clearTimeout(orderEditFeedbackTimerRef.current)
    setOrderEditFeedback(message)
    orderEditFeedbackTimerRef.current = setTimeout(() => {
      setOrderEditFeedback('')
      orderEditFeedbackTimerRef.current = null
    }, 1500)
  }

  const allowAddTap = (key, windowMs = 500) => {
    const now = Date.now()
    const last = addTapGuardRef.current[key] || 0
    if (now - last < windowMs) return false
    addTapGuardRef.current[key] = now
    return true
  }

  const getCardQty = (itemId) => {
    const n = Number(cardQtyById[itemId])
    return Math.max(1, Math.min(99, Number.isFinite(n) ? n : 1))
  }

  const changeCardQty = (itemId, delta) => {
    if (!canModifyOrder) return
    setCardQtyById((prev) => {
      const next = Math.max(1, Math.min(99, getCardQty(itemId) + delta))
      return { ...prev, [itemId]: next }
    })
  }

  const addItem = (item, qtyToAdd = 1) => {
    if (!canModifyOrder) return
    let feedbackMessage = `Added: ${item.name} x${Math.max(1, Math.min(99, Number(qtyToAdd) || 1))}`
    let feedbackButton = 'Added ✔'
    const qtyAdd = Math.max(1, Math.min(99, Number(qtyToAdd) || 1))
    setOrderItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.id === item.id &&
          !i.note &&
          !i.allergy &&
          !i.cookLevel &&
          !i.requiresNote &&
          !i.fromModal
      )
      const next =
        existingIdx >= 0
          ? prev.map((i, idx) =>
              idx === existingIdx ? { ...i, qty: i.qty + qtyAdd } : i
            )
          : [
              ...prev,
              {
                ...item,
                qty: qtyAdd,
                note: null,
                allergy: null,
                cookLevel: null,
                sentQty: 0,
                category: item.category,
                route: item.route || (item.category === 'Drinks' ? 'bar' : 'kitchen'),
              },
            ]
      if (existingIdx >= 0) {
        feedbackMessage = `Added: ${item.name} x${qtyAdd}`
        feedbackButton = 'Added ✔'
      }
      return next
    })
    setOpenedBy(selectedTable, getStaffName())
    flashAddFeedback(item.id, feedbackMessage, feedbackButton)
  }

  const handleAddModalConfirm = ({ item, qty, allergy, note, cookLevel }) => {
    if (!canModifyOrder) return
    if (!item) return
    setOrderItems((prev) => [
      ...prev,
      {
        ...item,
        qty,
        sentQty: 0,
        allergy,
        note,
        cookLevel,
        category: item.category,
        route: item.route || (item.category === 'Drinks' ? 'bar' : 'kitchen'),
        fromModal: true,
      },
    ])
    setOpenedBy(selectedTable, getStaffName())
    flashAddFeedback(item.id, `Added: ${item.name} x${qty}`)
  }

  const increaseQty = (index) => {
    if (!canModifyOrder) return
    setOrderItems((prev) =>
      prev.map((i, idx) => (idx === index ? { ...i, qty: i.qty + 1 } : i))
    )
  }

  const decreaseQty = (index) => {
    if (!canModifyOrder) return
    setOrderItems((prev) => {
      if (prev[index].qty <= 1) {
        flashOrderEditFeedback('Item removed')
        return prev.filter((_, i) => i !== index)
      }
      return prev.map((i, idx) => (idx === index ? { ...i, qty: i.qty - 1 } : i))
    })
  }

  const removeLine = (index) => {
    if (!canModifyOrder) return
    flashOrderEditFeedback('Item removed')
    setOrderItems((prev) => prev.filter((_, i) => i !== index))
  }

  const voidLine = (index) => {
    if (!canModifyOrder) return
    setOrderItems((prev) => {
      const target = prev[index]
      if (!target) return prev
      setVoidedItems((v) => [
        ...v,
        { name: target.name, qty: target.qty, at: Date.now() },
      ])
      flashOrderEditFeedback(`Voided: ${target.name} x${target.qty}`)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = () => {
    if (!skipSendConfirm) {
      setShowSendConfirm(true)
      return
    }
    handleSubmitConfirmed()
  }

  const handleSubmitConfirmed = () => {
    setShowSendConfirm(false)
    setSendState('sending')
    setSendFeedback('Sending order...')
    try {
      if (!selectedTable) {
        setSendState('error')
        setSendFeedback('Blocked: no selected table.')
        return
      }
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        setSendState('error')
        setSendFeedback('Blocked: no items in order.')
        return
      }

      const forStore = orderItems.map((i) => orderItemForStore({ ...i }))
      const invalid = forStore.find(
        (i) =>
          !i ||
          !i.name ||
          !Number.isFinite(i.price) ||
          !Number.isFinite(i.qty) ||
          i.qty <= 0 ||
          !i.category
      )
      if (invalid) {
        setSendState('error')
        setSendFeedback(`Blocked: invalid item state (${invalid?.name || 'unknown item'}).`)
        return
      }

      const missingDestination = forStore.find((i) => !i.category)
      if (missingDestination) {
        setSendState('error')
        setSendFeedback(`Blocked: kitchen/bar destination missing (${missingDestination.name}).`)
        return
      }

      const unsentItems = forStore
        .map((i) => {
          const sentQty = Number(i.sentQty) || 0
          const qty = Number(i.qty) || 0
          const delta = qty - sentQty
          if (delta <= 0) return null
          return { ...i, qty: delta }
        })
        .filter(Boolean)

      if (unsentItems.length === 0) {
        setSendState('error')
        setSendFeedback('No new items to send')
        return
      }

      const hadPreviousSend = forStore.some((i) => (Number(i.sentQty) || 0) > 0)
      const nextAfterSend = forStore.map((i) => ({ ...i, sentQty: Number(i.qty) || 0 }))

      setItems(selectedTable, nextAfterSend, getStaffName())
      const submissionId = submitOrder(selectedTable, unsentItems, getStaffName())
      if (!submissionId) {
        setSendState('error')
        setSendFeedback('Blocked: missing store update when submitting order.')
        return
      }
      markOrderSubmitted(selectedTable, submissionId)
      setOrderItems((prev) =>
        prev.map((i) => ({ ...i, sentQty: Number(i.qty) || 0 }))
      )
      setSendState('success')
      setSendFeedback(hadPreviousSend ? 'Order updated' : 'Order sent')
      bump()
    } catch (err) {
      setSendState('error')
      setSendFeedback(`Error: ${err?.message || 'failed to send order'}`)
    }
  }

  const handleSaveChanges = () => {
    if (!isManagerRole || !hasExistingOrder || !isEditMode) return
    syncItemsToStore()
    bump()
    setIsEditMode(false)
    flashOrderEditFeedback('Changes saved')
  }

  const handleClearBill = () => {
    storeClearOrder(selectedTable)
    setOrderItems([])
    setPartPayInput('')
    setDiscountInput('')
    setAdjustInput('')
    bump()
  }

  const handleMarkPaidClick = () => {
    syncItemsToStore()
    const sub = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const o = getOrder(selectedTable)
    const disc = o.discount || 0
    const bill =
      o.adjustedTotal != null ? o.adjustedTotal : Math.max(0, sub - disc)
    const paid = getAmountPaid(selectedTable)
    const remaining = Math.max(0, Math.round((bill - paid) * 100) / 100)
    if (orderItems.length === 0 || remaining <= 0) return
    setPaymentModalOpen(true)
  }

  const handlePaymentConfirm = (payments) => {
    syncItemsToStore()
    storeMarkPaid(selectedTable, payments, getStaffName())
    setOrderItems([])
    setPartPayInput('')
    setPaymentModalOpen(false)
    bump()
  }

  const tableStatus = getStatus(selectedTable)

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const order = getOrder(selectedTable)
  const discountAmount = order.discount || 0
  const billTotal =
    order.adjustedTotal != null
      ? order.adjustedTotal
      : Math.max(0, subtotal - discountAmount)
  const paidAmount = getAmountPaid(selectedTable)
  const remaining = Math.max(
    0,
    Math.round((billTotal - paidAmount) * 100) / 100
  )

  const itemsInCategory = menuByCategory[activeCategory] || []
  const drinkGroups =
    activeCategory === 'Drinks'
      ? [...new Set(itemsInCategory.map((d) => d.drinkGroup).filter(Boolean))]
      : []
  const visibleMenuItems =
    activeCategory === 'Drinks' && activeDrinkGroup
      ? itemsInCategory.filter((i) => i.drinkGroup === activeDrinkGroup)
      : itemsInCategory

  const handleCashFull = () => {
    if (orderItems.length === 0 || remaining <= 0) return
    syncItemsToStore()
    recordFullPayment(selectedTable, 'cash', getStaffName())
    if (getOrder(selectedTable).isPaid) setOrderItems([])
    setPartPayInput('')
    bump()
  }

  const handleCardFull = () => {
    if (orderItems.length === 0 || remaining <= 0) return
    syncItemsToStore()
    recordFullPayment(selectedTable, 'card', getStaffName())
    if (getOrder(selectedTable).isPaid) setOrderItems([])
    setPartPayInput('')
    bump()
  }

  const handlePartPay = () => {
    if (orderItems.length === 0) return
    syncItemsToStore()
    const raw = partPayInput.trim()
    if (raw === '') return
    const amt = parseFloat(raw)
    if (!Number.isFinite(amt) || amt <= 0) return
    addPartialPayment(selectedTable, amt, 'cash', getStaffName())
    if (getOrder(selectedTable).isPaid) setOrderItems([])
    setPartPayInput('')
    bump()
  }

  const handleApplyDiscount = () => {
    syncItemsToStore()
    const amt = parseDiscountInput(discountInput, subtotal)
    setDiscount(selectedTable, amt)
    setDiscountInput('')
    bump()
  }

  const handleApplyAdjust = () => {
    if (!canAdjustTotal()) return
    const pin = window.prompt('Owner PIN required to adjust total')
    if (!verifyPinForRole(pin, 'owner')) {
      window.alert('Owner PIN is required')
      return
    }
    syncItemsToStore()
    const raw = adjustInput.trim()
    if (raw === '') {
      setAdjustedTotal(selectedTable, null)
    } else {
      const n = parseFloat(raw)
      if (!Number.isNaN(n)) setAdjustedTotal(selectedTable, n)
    }
    bump()
  }

  return (
    <div className={`order-page ${onClose ? 'order-page--embedded' : ''}`}>
      <header className={`order-header ${onClose ? 'order-header--embedded' : ''}`}>
        {onClose ? (
          <button type="button" className="back-btn" onClick={onClose}>
            ← Back to tables
          </button>
        ) : (
          <Link to="/tables" className="back-link">← Tables</Link>
        )}
        <div className="order-header-info">
          <h1 className="order-title">Table {selectedTable}</h1>
          {!onClose && (
            <span className={`order-status status-${tableStatus}`}>
              {tableStatus}
            </span>
          )}
        </div>
      </header>

      <div className="order-layout">
        <div className="order-menu-area">
          <div className="category-tabs" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {activeCategory === 'Drinks' && drinkGroups.length > 0 && (
            <div className="drink-subtabs" role="tablist" aria-label="Drink groups">
              {drinkGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  role="tab"
                  aria-selected={activeDrinkGroup === group}
                  className={`drink-subtab ${activeDrinkGroup === group ? 'active' : ''}`}
                  onClick={() => setActiveDrinkGroup(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          )}
          {addFeedback && (
            <p className="menu-add-feedback" aria-live="polite">
              {addFeedback}
            </p>
          )}
          <div className="menu-grid" role="tabpanel">
            {visibleMenuItems.map((item) => (
              <div
                key={item.id}
                className={`menu-item-card ${addHighlightItemId === item.id ? 'menu-item-card--added' : ''}`}
              >
                <div className="menu-item-card-head">
                  <span className="menu-item-name">{item.name}</span>
                  <span className="menu-item-price">{formatGBP(item.price)}</span>
                </div>
                <div className="menu-item-qty-row">
                  <button
                    type="button"
                    className="menu-item-qty-btn"
                    onClick={() => changeCardQty(item.id, -1)}
                    aria-label={`Decrease ${item.name} quantity`}
                    disabled={!canModifyOrder}
                  >
                    −
                  </button>
                  <span className="menu-item-qty-value">{getCardQty(item.id)}</span>
                  <button
                    type="button"
                    className="menu-item-qty-btn"
                    onClick={() => changeCardQty(item.id, 1)}
                    aria-label={`Increase ${item.name} quantity`}
                    disabled={!canModifyOrder}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="menu-item-btn-add"
                  onClick={() => {
                    if (!allowAddTap(`add:${item.id}`)) return
                    addItem(item, getCardQty(item.id))
                  }}
                  disabled={!canModifyOrder}
                >
                  {addFlashItemId === item.id ? addFlashText : 'Add'}
                </button>
                <button
                  type="button"
                  className="menu-item-btn-note"
                  onClick={() => {
                    if (!allowAddTap(`note:${item.id}`)) return
                    setAddModalItem(item)
                  }}
                  disabled={!canModifyOrder}
                >
                  Add with note
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside className="summary-panel">
          <h2 className="summary-title">Order</h2>
          {isManagerRole && hasExistingOrder && !isEditMode && (
            <button
              type="button"
              className="clear-order-btn"
              onClick={() => setIsEditMode(true)}
            >
              Edit Order
            </button>
          )}
          {isManagerRole && hasExistingOrder && isEditMode && (
            <button
              type="button"
              className="submit-order-btn"
              onClick={handleSaveChanges}
            >
              Save Changes
            </button>
          )}
          {orderEditFeedback && (
            <p className="summary-send-feedback summary-send-feedback--error" aria-live="polite">
              {orderEditFeedback}
            </p>
          )}
          <div className="summary-list" role="list">
            {orderItems.length === 0 ? (
              <p className="summary-empty">No items yet</p>
            ) : (
              orderItems.map((item, index) => {
                const lineTotal = item.price * item.qty
                const meta = menuItemMeta(item.id)
                const showCook = meta?.cooks === true
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="summary-row"
                    role="listitem"
                  >
                    <div className="summary-row-main">
                      <span className="summary-name">{item.name}</span>
                      <span className="summary-meta">
                        {item.route === 'bar' ? 'Bar' : 'Kitchen'}
                      </span>
                      <span className="summary-meta">
                        {formatGBP(item.price)} × {item.qty} = {formatGBP(lineTotal)}
                      </span>
                    </div>

                    {(item.note || item.allergy || item.cookLevel) && (
                      <div className="summary-item-detail" aria-live="polite">
                        {item.allergy && (
                          <span className="summary-detail-allergy">⚠ {item.allergy}</span>
                        )}
                        {item.cookLevel && (
                          <span className="summary-detail-cook">{item.cookLevel}</span>
                        )}
                        {item.note && (
                          <p className="summary-detail-note">{item.note}</p>
                        )}
                      </div>
                    )}

                    <div className="summary-row-inline">
                      <label className="summary-inline-label">
                        Allergy
                        <input
                          type="text"
                          className="summary-inline-input summary-inline-input--allergy"
                          placeholder="e.g. nuts, shellfish"
                          value={item.allergy ?? ''}
                          disabled={!canModifyOrder}
                          onChange={(e) =>
                            updateLineField(index, {
                              allergy: e.target.value.trim() || null,
                            })
                          }
                        />
                      </label>
                      {showCook && (
                        <div className="summary-cook-chips">
                          <span className="summary-inline-hint">Cook</span>
                          {COOK_LEVELS.map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              className={`cook-chip ${item.cookLevel === lvl ? 'active' : ''}`}
                              disabled={!canModifyOrder}
                              onClick={() =>
                                updateLineField(index, {
                                  cookLevel: item.cookLevel === lvl ? null : lvl,
                                })
                              }
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="summary-inline-label">
                        Comment
                        <input
                          type="text"
                          className="summary-inline-input"
                          placeholder="Extra instructions"
                          value={item.note ?? ''}
                          disabled={!canModifyOrder}
                          onChange={(e) => {
                            const v = e.target.value
                            const trimmed = v.trim() || null
                            updateLineField(index, {
                              note: trimmed,
                              requiresNote: trimmed ? false : item.requiresNote,
                            })
                          }}
                        />
                      </label>
                    </div>

                    <div className="summary-row-actions">
                      <button
                        type="button"
                        className="summary-btn summary-btn-minus"
                        onClick={() => decreaseQty(index)}
                        aria-label="Decrease quantity"
                        disabled={!canModifyOrder}
                      >
                        −
                      </button>
                      <span className="summary-qty">{item.qty}</span>
                      <button
                        type="button"
                        className="summary-btn summary-btn-plus"
                        onClick={() => increaseQty(index)}
                        aria-label="Increase quantity"
                        disabled={!canModifyOrder}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="summary-btn-remove-text"
                        onClick={() => removeLine(index)}
                        aria-label="Remove item"
                        disabled={!canModifyOrder}
                      >
                        X
                      </button>
                      <button
                        type="button"
                        className="summary-btn-void"
                        onClick={() => voidLine(index)}
                        aria-label="Void item"
                        disabled={!canModifyOrder}
                      >
                        Void
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="summary-footer">
            <div className="add-item-primary-row">
              <button
                type="button"
                className="add-item-primary-btn"
                onClick={() => {
                  if (!allowAddTap('add:dummy')) return
                  addItem(DUMMY_PASTA, 1)
                }}
                disabled={!canModifyOrder}
              >
                + Add
              </button>
              <button
                type="button"
                className="add-item-note-btn"
                onClick={() => {
                  if (!allowAddTap('note:dummy')) return
                  setAddModalItem(DUMMY_PASTA)
                }}
                disabled={!canModifyOrder}
              >
                + Add with note
              </button>
            </div>

            <div className="till-box">
              <h3 className="till-title">Till / Payment</h3>
              <div className="till-breakdown">
                <div className="till-row">
                  <span>Subtotal</span>
                  <span>{formatGBP(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="till-row till-row--muted">
                    <span>Discount</span>
                    <span>−{formatGBP(discountAmount)}</span>
                  </div>
                )}
                <div className="till-row till-row--total">
                  <span>Total</span>
                  <span>{formatGBP(billTotal)}</span>
                </div>
                <div className="till-row">
                  <span>Paid</span>
                  <span>{formatGBP(paidAmount)}</span>
                </div>
                <div className="till-row till-row--due">
                  <span>Remaining</span>
                  <span>{formatGBP(remaining)}</span>
                </div>
              </div>

              <div className="till-quick">
                <button
                  type="button"
                  className="till-btn till-btn-cash"
                  onClick={handleCashFull}
                  disabled={orderItems.length === 0 || remaining <= 0}
                >
                  Cash
                </button>
                <button
                  type="button"
                  className="till-btn till-btn-card"
                  onClick={handleCardFull}
                  disabled={orderItems.length === 0 || remaining <= 0}
                >
                  Card
                </button>
              </div>

              <label className="till-partial-label">
                Part pay amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="till-partial-input"
                  value={partPayInput}
                  onChange={(e) => setPartPayInput(e.target.value)}
                  placeholder={remaining > 0 ? remaining.toFixed(2) : '0.00'}
                />
              </label>
              <button
                type="button"
                className="till-btn till-btn-partpay"
                onClick={handlePartPay}
                disabled={orderItems.length === 0 || remaining <= 0}
              >
                Part pay
              </button>

              <div className="till-discount-row">
                <label className="till-partial-label till-partial-label--inline">
                  Discount (% or £)
                  <input
                    type="text"
                    className="till-partial-input"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="e.g. 10% or 5"
                  />
                </label>
                <button
                  type="button"
                  className="till-btn till-btn-discount"
                  onClick={handleApplyDiscount}
                  disabled={orderItems.length === 0}
                >
                  Apply
                </button>
              </div>

              {canAdjustTotal() && (
                <div className="till-discount-row">
                  <label className="till-partial-label till-partial-label--inline">
                    Adjust total (owner)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="till-partial-input"
                      value={adjustInput}
                      onChange={(e) => setAdjustInput(e.target.value)}
                      placeholder="blank = use calc"
                    />
                  </label>
                  <button
                    type="button"
                    className="till-btn till-btn-adjust"
                    onClick={handleApplyAdjust}
                    disabled={orderItems.length === 0}
                  >
                    Set
                  </button>
                </div>
              )}

              <button
                type="button"
                className="till-btn till-btn-clear"
                onClick={handleClearBill}
                disabled={orderItems.length === 0 && paidAmount <= 0 && discountAmount <= 0}
              >
                Clear bill
              </button>
            </div>

          </div>
          <div className="summary-actions">
            {showSendConfirm && (
              <div className="send-confirm-inline" role="dialog" aria-label="Confirm send order">
                <p className="send-confirm-text">Send order to kitchen/bar?</p>
                <div className="send-confirm-actions">
                  <button
                    type="button"
                    className="send-confirm-btn send-confirm-btn-confirm"
                    onClick={handleSubmitConfirmed}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="send-confirm-btn"
                    onClick={() => setShowSendConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
                <label className="send-confirm-skip">
                  <input
                    type="checkbox"
                    checked={skipSendConfirm}
                    onChange={(e) => {
                      const next = e.target.checked
                      setSkipSendConfirm(next)
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('tableone-skip-send-confirm', next ? '1' : '0')
                      }
                    }}
                  />
                  Skip confirmation
                </label>
              </div>
            )}
            {sendFeedback && (
              <p
                className={`summary-send-feedback summary-send-feedback--${sendState}`}
                aria-live="polite"
              >
                {sendFeedback}
              </p>
            )}
            <button
              type="button"
              className="submit-order-btn"
              disabled={orderItems.length === 0}
              onClick={handleSubmit}
            >
              Send order
            </button>
            <button
              type="button"
              className="mark-paid-btn"
              onClick={handleMarkPaidClick}
              disabled={orderItems.length === 0 || remaining <= 0}
            >
              Mark as paid (split)
            </button>
            <button
              type="button"
              className="clear-order-btn"
              onClick={handleClearBill}
              disabled={orderItems.length === 0 && paidAmount <= 0 && discountAmount <= 0}
            >
              Clear bill
            </button>
          </div>
        </aside>
      </div>

      {paymentModalOpen && (
        <PaymentModal
          total={remaining}
          onConfirm={handlePaymentConfirm}
          onClose={() => setPaymentModalOpen(false)}
        />
      )}

      {addModalItem && (
        <AddItemModal
          item={addModalItem}
          initialQty={getCardQty(addModalItem.id)}
          onClose={() => setAddModalItem(null)}
          onConfirm={handleAddModalConfirm}
        />
      )}
    </div>
  )
}
