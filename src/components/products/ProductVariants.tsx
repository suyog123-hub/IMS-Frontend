import { useMemo, useRef, useState } from 'react'
import type { ProductVariantFormErrors } from '../../utils/validation'
import { toNumber } from '../../utils/numbers'
import { calculateSellingPrice } from '../../utils/pricing'
import { formatCurrency } from '../../utils/format'
import { toastError } from '../../utils/toast'
import { saveImageBlob } from '../../storage'
import { AppImage } from '../common/AppImage'
import { OversizedImageModal } from '../common/OversizedImageModal'
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
  const [oversizedVariantFile, setOversizedVariantFile] = useState<{ key: string; file: File } | null>(null)
  const [oversizedSizeMB, setOversizedSizeMB] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

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
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, 60)
  }

  const handleImage = async (key: string, file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toastError('Only images are allowed.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setOversizedVariantFile({ key, file })
      setOversizedSizeMB(sizeMB)
      return
    }
    try {
      const blobId = `img_var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await saveImageBlob(blobId, file)
      update(key, { image: blobId })
      setImageErrors((prev) => {
        const { [key]: _cleared, ...rest } = prev
        return rest
      })
    } catch {
      toastError('Failed to save image. Please try again.')
    }
  }

  const handleCompressedVariantUpload = async (compressedBlob: Blob) => {
    if (!oversizedVariantFile) return
    const blobId = `img_var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    await saveImageBlob(blobId, compressedBlob)
    update(oversizedVariantFile.key, { image: blobId })
  }

  const visibleDrafts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return drafts

    return drafts.filter((draft) => {
      const isEmptyDraft =
        !draft.name.trim() && !draft.size.trim() && !draft.color.trim() && !draft.quantity.trim()
      if (isEmptyDraft) return true
      const effectiveCostStr = draft.costPrice !== '' ? draft.costPrice : productDraft.costPrice
      const effectiveDiscountStr =
        draft.discountPercent !== '' ? draft.discountPercent : productDraft.discountPercent
      const cost = toNumber(effectiveCostStr) ?? 0
      const discount = toNumber(effectiveDiscountStr) ?? 0
      const calculatedSellingPrice = calculateSellingPrice(cost, discount)
      const manualSelling = toNumber(draft.sellingPrice)
      const effectiveSellingPrice = manualSelling ?? calculatedSellingPrice

      const nameMatch = draft.name.toLowerCase().includes(q)
      const sizeMatch = draft.size.toLowerCase().includes(q)
      const colorMatch = draft.color.toLowerCase().includes(q)
      const priceMatch =
        effectiveSellingPrice.toString().includes(q) ||
        formatCurrency(effectiveSellingPrice).toLowerCase().includes(q) ||
        draft.sellingPrice.toLowerCase().includes(q)

      return nameMatch || sizeMatch || colorMatch || priceMatch
    })
  }, [drafts, searchQuery, productDraft.costPrice, productDraft.discountPercent])

  return (
    <div className="variants-editor">
      <div className="variants-editor-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 className="variants-editor-title">Product Variants</h2>
          <p className="variants-editor-sub">
            Add sizes and pricing options for this product. Cost and discount default to the main
            product values above unless overridden here.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {drafts.length > 0 && (
            <div className="search-wrap" style={{ width: '280px' }}>
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, size, color, price..."
                className="input"
                style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
              />
            </div>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addVariant}>
            + Add Variant
          </button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="variants-empty">
          <p>No variants created yet. Click "+ Add Variant" to add one.</p>
        </div>
      ) : visibleDrafts.length === 0 ? (
        <div className="variants-empty">
          <p>No variants match "{searchQuery}".</p>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginTop: '8px' }}
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="variants-editor-list" ref={listRef}>
          {visibleDrafts.map((draft) => {
            const err = errors[draft.key] ?? {}
            const effectiveCostStr = draft.costPrice !== '' ? draft.costPrice : productDraft.costPrice
            const effectiveDiscountStr =
              draft.discountPercent !== '' ? draft.discountPercent : productDraft.discountPercent
            const cost = toNumber(effectiveCostStr) ?? 0
            const discount = toNumber(effectiveDiscountStr) ?? 0
            const calculatedSellingPrice = calculateSellingPrice(cost, discount)
            const defaultPricePlaceholder = calculatedSellingPrice > 0 ? String(calculatedSellingPrice) : '0'

            return (
              <div className="variant-editor-row" key={draft.key}>
                <div className="variant-field variant-img-field">
                  <label className="field-label">Image</label>
                  <div className="variant-img-wrap">
                    <label className={`variant-img${draft.image ? ' variant-img-has' : ''}`}>
                      {draft.image ? (
                        <AppImage src={draft.image} alt={draft.name || 'Variant'} />
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
                </div>

                <div className="variant-field">
                  <label className="field-label">Variant Name</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => update(draft.key, { name: event.target.value })}
                    placeholder="e.g. Large, Medium, Small"
                    className="input"
                  />
                  {err.name && <span className="field-error">{err.name}</span>}
                </div>

                <div className="variant-field">
                  <label className="field-label">Size</label>
                  <input
                    type="text"
                    value={draft.size}
                    onChange={(event) => update(draft.key, { size: event.target.value })}
                    placeholder="e.g. S, M, L, XL"
                    className="input"
                  />
                  {err.size && <span className="field-error">{err.size}</span>}
                </div>

                <div className="variant-field">
                  <label className="field-label">Color</label>
                  <input
                    type="text"
                    value={draft.color}
                    onChange={(event) => update(draft.key, { color: event.target.value })}
                    placeholder="e.g. Red, Blue, Black"
                    className="input"
                  />
                  {err.color && <span className="field-error">{err.color}</span>}
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
                  {err.quantity && <span className="field-error">{err.quantity}</span>}
                </div>

                <div className="variant-field">
                  <label className="field-label">Cost Price</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.costPrice}
                    onChange={(event) => update(draft.key, { costPrice: event.target.value })}
                    placeholder="e.g. 500, 750, 1000"
                    className="input"
                  />
                  {err.costPrice && <span className="field-error">{err.costPrice}</span>}
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
                    placeholder="e.g. 10, 20, 30"
                    className="input"
                  />
                  {err.discountPercent && (
                    <span className="field-error">{err.discountPercent}</span>
                  )}
                </div>

                <div className="variant-field">
                  <label className="field-label">Selling Price</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.sellingPrice}
                    onChange={(event) => update(draft.key, { sellingPrice: event.target.value })}
                    placeholder={defaultPricePlaceholder}
                    className="input"
                  />
                  {err.sellingPrice && <span className="field-error">{err.sellingPrice}</span>}
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
      )}

      <OversizedImageModal
        open={Boolean(oversizedVariantFile)}
        file={oversizedVariantFile?.file ?? null}
        fileSizeMB={oversizedSizeMB}
        onClose={() => {
          setOversizedVariantFile(null)
          setOversizedSizeMB(null)
        }}
        onCompressed={handleCompressedVariantUpload}
      />
    </div>
  )
}