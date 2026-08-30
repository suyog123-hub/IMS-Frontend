import { useState } from 'react'
import type { ProductVariantFormErrors } from '../../utils/validation'
import { toNumber } from '../../utils/numbers'
import { calculateSellingPrice } from '../../utils/pricing'
import { formatCurrency } from '../../utils/format'
import { newVariantDraft, type VariantDraft } from './variantDrafts'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

interface ProductDraft {
  name: string
  costPrice: string
  discountPercent: string
}

interface ProductVariantsProps {
  drafts: VariantDraft[]
  errors: Record<string, Partial<ProductVariantFormErrors>>
  productDraft: ProductDraft
  onChange: (next: VariantDraft[]) => void
}

export function ProductVariants({ drafts, errors, productDraft, onChange }: ProductVariantsProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})

  const update = (key: string, patch: Partial<VariantDraft>) => {
    onChange(drafts.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
  }

  const remove = (key: string) => {
    onChange(drafts.filter((draft) => draft.key !== key))
    setImageErrors((prev) => {
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  const addVariant = () => {
    onChange([...drafts, newVariantDraft()])
  }

  const handleImage = (key: string, file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageErrors((prev) => ({ ...prev, [key]: 'Only images are allowed.' }))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageErrors((prev) => ({ ...prev, [key]: 'Image must be under 2 MB.' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update(key, { image: String(reader.result ?? '') })
      setImageErrors((prev) => {
        const { [key]: _cleared, ...rest } = prev
        return rest
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="variants-editor">
      <div className="variants-editor-header">
        <h3 className="card-title">Product Variants</h3>
        <button type="button" className="btn btn-sm" onClick={addVariant}>
          + Add Variant
        </button>
      </div>
      <p className="variants-editor-hint">
        Optional. Add variations such as size, color, or volume. Leave the name, cost price, or
        discount blank to inherit the product's value.
      </p>

      {drafts.length === 0 && <p className="variants-empty">No variants yet.</p>}

      <div className="variants-list">
        {drafts.map((draft) => {
          const error = errors[draft.key] ?? {}
          const resolvedName = draft.name.trim() || productDraft.name.trim()
          const resolvedCost =
            toNumber(draft.costPrice) ?? toNumber(productDraft.costPrice) ?? null
          const resolvedDiscount =
            toNumber(draft.discountPercent) ?? toNumber(productDraft.discountPercent) ?? null
          const price =
            resolvedCost !== null && resolvedDiscount !== null
              ? formatCurrency(calculateSellingPrice(resolvedCost, resolvedDiscount))
              : '—'

          return (
            <div className="variant-editor-row" key={draft.key}>
              <div className="variant-field variant-img-field">
                <label className="field-label">Image</label>
                <div className="variant-img-wrap">
                  <label className={`variant-img${draft.image ? ' variant-img-has' : ''}`}>
                    {draft.image ? (
                      <img src={draft.image} alt={draft.name || 'Variant'} />
                    ) : (
                      <span className="variant-img-plus">+</span>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="file-input"
                      onChange={(event) => handleImage(draft.key, event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {draft.image && (
                    <button
                      type="button"
                      className="variant-img-remove"
                      title="Remove image"
                      aria-label="Remove image"
                      onClick={() => update(draft.key, { image: '' })}
                    >
                      ×
                    </button>
                  )}
                </div>
                {imageErrors[draft.key] && (
                  <span className="field-error">{imageErrors[draft.key]}</span>
                )}
              </div>
              <div className="variant-field">
                <label className="field-label">Variant Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => update(draft.key, { name: event.target.value })}
                  placeholder={resolvedName ? `Defaults to "${resolvedName}"` : 'Variant name'}
                  className="input"
                />
                {error.name && <span className="field-error">{error.name}</span>}
              </div>
              <div className="variant-field">
                <label className="field-label">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.quantity}
                  onChange={(event) => update(draft.key, { quantity: event.target.value })}
                  placeholder="0"
                  className="input"
                />
                {error.quantity && <span className="field-error">{error.quantity}</span>}
              </div>
              <div className="variant-field">
                <label className="field-label">Cost Price</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.costPrice}
                  onChange={(event) => update(draft.key, { costPrice: event.target.value })}
                  placeholder={
                    toNumber(productDraft.costPrice) !== null
                      ? `Defaults to ${formatCurrency(toNumber(productDraft.costPrice) ?? 0)}`
                      : '0'
                  }
                  className="input"
                />
                {error.costPrice && <span className="field-error">{error.costPrice}</span>}
              </div>
              <div className="variant-field">
                <label className="field-label">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={draft.discountPercent}
                  onChange={(event) => update(draft.key, { discountPercent: event.target.value })}
                  placeholder={
                    toNumber(productDraft.discountPercent) !== null
                      ? `Defaults to ${toNumber(productDraft.discountPercent) ?? 0}%`
                      : '0'
                  }
                  className="input"
                />
                {error.discountPercent && (
                  <span className="field-error">{error.discountPercent}</span>
                )}
              </div>
              <div className="variant-field">
                <label className="field-label">Selling Price</label>
                <input type="text" value={price} readOnly className="input input-readonly" />
              </div>
              <div className="variant-field">
                <label className="field-label">&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-sm btn-danger-outline variant-remove"
                  onClick={() => remove(draft.key)}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}