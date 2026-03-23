import { useState, useEffect } from 'react'
import { formatGBP } from '../lib/currency'
import './AddItemModal.css'

const COOK_LEVELS = ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done']

export default function AddItemModal({ item, initialQty = 1, onClose, onConfirm }) {
  const [qty, setQty] = useState(1)
  const [allergy, setAllergy] = useState('')
  const [note, setNote] = useState('')
  const [cookLevel, setCookLevel] = useState(null)

  const showCook = item?.cooks === true

  useEffect(() => {
    if (item) {
      setQty(Math.max(1, Math.min(99, Number(initialQty) || 1)))
      setAllergy('')
      setNote('')
      setCookLevel(null)
    }
  }, [item?.id, initialQty])

  if (!item) return null

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleConfirm = () => {
    const q = Math.max(1, Math.min(99, Math.floor(qty) || 1))
    onConfirm({
      item,
      qty: q,
      allergy: allergy.trim() || null,
      note: note.trim() || null,
      cookLevel: showCook ? cookLevel : null,
    })
    onClose()
  }

  return (
    <div className="add-item-modal-backdrop" onClick={handleBackdrop} role="presentation">
      <div
        className="add-item-modal-sheet"
        role="dialog"
        aria-labelledby="add-item-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-item-modal-handle" aria-hidden />
        <h2 id="add-item-modal-title" className="add-item-modal-title">
          {item.name}
        </h2>
        <p className="add-item-modal-price">{formatGBP(item.price)} each</p>

        <div className="add-item-modal-field">
          <span className="add-item-modal-label">Quantity</span>
          <div className="add-item-modal-qty">
            <button
              type="button"
              className="add-item-modal-qty-btn"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="add-item-modal-qty-val">{qty}</span>
            <button
              type="button"
              className="add-item-modal-qty-btn"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <label className="add-item-modal-field">
          <span className="add-item-modal-label">Allergy</span>
          <input
            type="text"
            className="add-item-modal-input"
            placeholder="e.g. nuts, dairy"
            value={allergy}
            onChange={(e) => setAllergy(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="add-item-modal-field">
          <span className="add-item-modal-label">Comment</span>
          <input
            type="text"
            className="add-item-modal-input"
            placeholder="Extra instructions"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
          />
        </label>

        {showCook && (
          <div className="add-item-modal-field">
            <span className="add-item-modal-label">Cook level</span>
            <div className="add-item-modal-cook">
              {COOK_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`add-item-modal-cook-chip ${cookLevel === lvl ? 'active' : ''}`}
                  onClick={() => setCookLevel(cookLevel === lvl ? null : lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="add-item-modal-actions">
          <button type="button" className="add-item-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="add-item-modal-confirm" onClick={handleConfirm}>
            Add to order
          </button>
        </div>
      </div>
    </div>
  )
}
