import { useEffect, useState, type FormEvent } from 'react'
import type { ProductVariant } from '../../types/models'
import { Modal } from '../common/Modal'
import { Field } from '../common/Field'
import { AppImage } from '../common/AppImage'
import { productVariantStorage, saveImageBlob } from '../../storage'
import { calculateSellingPrice } from '../../utils/pricing'
import { formatCurrency } from '../../utils/format'
import { toNumber } from '../../utils/numbers'
import { toastError, toastSuccess } from '../../utils/toast'
import { OversizedImageModal } from '../common/OversizedImageModal'

interface EditVariantModalProps {
  open: boolean
  variant: ProductVariant | null
  onClose: () => void
  onSuccess?: () => void
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export function EditVariantModal({ open, variant, onClose, onSuccess }: EditVariantModalProps) {
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [costPrice, setCostPrice] = useState('0')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [image, setImage] = useState('')
  const [errors, setErrors] = useState<{
    name?: string
    quantity?: string
    costPrice?: string
  }>({})

  const [oversizedFile, setOversizedFile] = useState<File | null>(null)
  const [oversizedSizeMB, setOversizedSizeMB] = useState<string | null>(null)

  useEffect(() => {
    if (variant) {
      setName(variant.name || '')
      setSize(variant.size || '')
      setColor(variant.color || '')
      setQuantity(String(variant.quantity ?? 0))
      setCostPrice(String(variant.costPrice ?? 0))
      setDiscountPercent(String(variant.discountPercent ?? 0))
      setImage(variant.image || '')
      setErrors({})
    }
  }, [variant])

  if (!open || !variant) return null

  const parsedCost = toNumber(costPrice) ?? 0
  const parsedDiscount = toNumber(discountPercent) ?? 0
  const sellingPrice = calculateSellingPrice(parsedCost, parsedDiscount)

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toastError('Only image files are allowed.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setOversizedFile(file)
      setOversizedSizeMB((file.size / (1024 * 1024)).toFixed(2))
      return
    }
    try {
      const blobId = `img_var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await saveImageBlob(blobId, file)
      setImage(blobId)
    } catch {
      toastError('Failed to upload image.')
    }
  }

  const handleCompressedUpload = async (blob: Blob) => {
    const blobId = `img_var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    await saveImageBlob(blobId, blob)
    setImage(blobId)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const newErrors: { name?: string; quantity?: string; costPrice?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Variant name is required.'
    }
    const qty = toNumber(quantity)
    if (qty === null || !Number.isInteger(qty) || qty < 0) {
      newErrors.quantity = 'Quantity must be 0 or a positive whole number.'
    }
    const cost = toNumber(costPrice)
    if (cost === null || cost < 0) {
      newErrors.costPrice = 'Cost price must be 0 or positive.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toastError('Please fix highlighted fields before saving.')
      return
    }

    const updated = productVariantStorage.update(variant.id, {
      name: name.trim(),
      size: size.trim(),
      color: color.trim(),
      quantity: qty ?? 0,
      costPrice: cost ?? 0,
      discountPercent: parsedDiscount,
      image: image || undefined,
    })

    if (updated) {
      toastSuccess(`Variant "${updated.name}" updated successfully!`)
      onSuccess?.()
      onClose()
    } else {
      toastError('Failed to update variant.')
    }
  }

  return (
    <>
      <Modal open={open} title="Edit Product Variant" onClose={onClose} width="md">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field label="Variant Name *" error={errors.name} className="field-span-2">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder="e.g. Acer Laptop S Black"
                className="input"
              />
            </Field>

            <Field label="Size (Optional)">
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. S / 16GB"
                className="input"
              />
            </Field>

            <Field label="Color (Optional)">
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Black / Silver"
                className="input"
              />
            </Field>

            <Field label="Stock Quantity *" error={errors.quantity}>
              <input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  setErrors((prev) => ({ ...prev, quantity: undefined }))
                }}
                placeholder="e.g. 298"
                className="input"
              />
            </Field>

            <Field label="Cost Price ($) *" error={errors.costPrice}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => {
                  setCostPrice(e.target.value)
                  setErrors((prev) => ({ ...prev, costPrice: undefined }))
                }}
                placeholder="e.g. 250.00"
                className="input"
              />
            </Field>

            <Field label="Discount (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="e.g. 0"
                className="input"
              />
            </Field>

            <Field label="Selling Price" hint="Calculated automatically">
              <input
                type="text"
                readOnly
                value={formatCurrency(sellingPrice)}
                className="input"
                style={{ background: 'var(--surface-muted)', fontWeight: 600, color: 'var(--primary)' }}
              />
            </Field>

            <Field label="Variant Image (Optional)" className="field-span-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                className="input"
              />
              {image && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <AppImage src={image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary-outline"
                    onClick={() => setImage('')}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </Field>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {oversizedFile && oversizedSizeMB && (
        <OversizedImageModal
          open={Boolean(oversizedFile)}
          file={oversizedFile}
          sizeMB={oversizedSizeMB}
          maxSizeMB="2"
          onClose={() => {
            setOversizedFile(null)
            setOversizedSizeMB(null)
          }}
          onCompressedUpload={handleCompressedUpload}
        />
      )}
    </>
  )
}
