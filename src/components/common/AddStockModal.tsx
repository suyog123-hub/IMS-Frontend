import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { Field } from './Field'
import { AppImage } from './AppImage'
import {
  inventoryStorage,
  productVariantStorage,
  recordInbound,
  stockLocationStorage,
} from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { toNumber } from '../../utils/numbers'
import { formatNumber } from '../../utils/format'
import { toastError, toastSuccess } from '../../utils/toast'

export interface RestockItem {
  id: string
  name: string
  productId: string
  variantId?: string
  currentStock: number
  image?: string
}

interface AddStockModalProps {
  open: boolean
  onClose: () => void
  item?: RestockItem | null
  onSuccess?: () => void
}

export function AddStockModal({ open, onClose, item, onSuccess }: AddStockModalProps) {
  const locations = useCollection(stockLocationStorage)
  const [locationId, setLocationId] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [errors, setErrors] = useState<{ locationId?: string; quantity?: string }>({})

  if (!open || !item) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const newErrors: { locationId?: string; quantity?: string } = {}

    if (!locationId) {
      newErrors.locationId = 'Please select a location to add stock to.'
    }

    const qty = toNumber(quantity)
    if (qty === null || !Number.isInteger(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be a positive whole number.'
    }

    if (newErrors.locationId || newErrors.quantity) {
      setErrors(newErrors)
      toastError('Please fix highlighted fields before adding stock.')
      return
    }

    const addedQty = qty ?? 0

    if (item.variantId) {
      const variant = productVariantStorage.getById(item.variantId)
      if (variant) {
        productVariantStorage.update(item.variantId, {
          quantity: variant.quantity + addedQty,
        })
      }
    }

    const inventoryItems = inventoryStorage.getAll()
    const targetInventory = inventoryItems.find(
      (r) => r.productId === item.productId && r.locationId === locationId
    )

    if (targetInventory) {
      inventoryStorage.update(targetInventory.id, {
        quantity: targetInventory.quantity + addedQty,
      })
    } else {
      inventoryStorage.create({
        productId: item.productId,
        locationId,
        quantity: addedQty,
      })
    }

    recordInbound(item.productId, locationId, addedQty, item.variantId)

    const locName =
      locations.items.find((loc) => loc.id === locationId)?.name ?? 'Location'

    toastSuccess(
      `Added +${formatNumber(addedQty)} units to "${item.name}" at ${locName}.`
    )
    onSuccess?.()
    onClose()
  }

  return (
    <Modal open={open} title="Add Stock / Restock" onClose={onClose} width="sm">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '6px',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--primary)',
            }}
          >
            {item.image ? (
              <AppImage
                src={item.image}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{item.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '14px', display: 'block', color: 'var(--text)' }}>
              {item.name}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Current stock: <strong>{formatNumber(item.currentStock)} units</strong>
            </span>
          </div>
        </div>

        <Field label="Add Stock To Location *" error={errors.locationId}>
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value)
              setErrors((prev) => ({ ...prev, locationId: undefined }))
            }}
            className="input"
          >
            <option value="">Select location…</option>
            {locations.items.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Quantity to Add *" error={errors.quantity}>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setErrors((prev) => ({ ...prev, quantity: undefined }))
            }}
            placeholder="e.g. 10"
            className="input"
          />
        </Field>

        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            + Add Stock
          </button>
        </div>
      </form>
    </Modal>
  )
}
