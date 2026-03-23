import { useState } from 'react'
import { formatGBP } from '../lib/currency'
import './PaymentModal.css'

export default function PaymentModal({ total, onConfirm, onClose }) {
  const [mode, setMode] = useState('full') // full | split
  const [numPeople, setNumPeople] = useState(2)
  const [payments, setPayments] = useState([]) // [{ method: 'card'|'cash', amount }]

  const perPerson = mode === 'split' && numPeople >= 1 ? total / numPeople : total

  const handleConfirm = () => {
    if (total <= 0) {
      onConfirm([])
    } else if (mode === 'full') {
      onConfirm([{ method: 'card', amount: total }])
    } else {
      const amount = Math.round((perPerson * 100)) / 100
      const p = []
      for (let i = 0; i < numPeople; i++) {
        p.push({ method: i === 0 ? 'card' : 'cash', amount })
      }
      if (numPeople * amount < total) p[0].amount += (total - numPeople * amount)
      onConfirm(p)
    }
    onClose()
  }

  return (
    <div className="payment-modal-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="payment-modal-title">Payment</h3>
        <p className="payment-modal-total">Total: {formatGBP(total)}</p>
        <div className="payment-modal-options">
          <label className="payment-option">
            <input
              type="radio"
              name="mode"
              checked={mode === 'full'}
              onChange={() => setMode('full')}
            />
            <span>Full payment</span>
          </label>
          <label className="payment-option">
            <input
              type="radio"
              name="mode"
              checked={mode === 'split'}
              onChange={() => setMode('split')}
            />
            <span>Split evenly</span>
          </label>
        </div>
        {mode === 'split' && (
          <div className="payment-split">
            <label>
              Number of people
              <input
                type="number"
                min={2}
                max={20}
                value={numPeople}
                onChange={(e) => setNumPeople(Number(e.target.value) || 2)}
              />
            </label>
            <p className="payment-per-person">
              {formatGBP(perPerson)} per person
            </p>
          </div>
        )}
        <div className="payment-modal-actions">
          <button type="button" className="payment-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="payment-modal-confirm" onClick={handleConfirm}>
            Confirm payment
          </button>
        </div>
      </div>
    </div>
  )
}
