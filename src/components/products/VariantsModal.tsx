import type { CSSProperties } from 'react'
import type { Product, ProductVariant } from '../../types/models'
import { formatCurrency, formatNumber } from '../../utils/format'
import { Modal } from '../common/Modal'

interface VariantsModalProps {
  product: Product
  variants: ProductVariant[]
  unitName: string | undefined
  categoryName: string | undefined
  color: string
  onClose: () => void
}

export function VariantsModal({
  product,
  variants,
  unitName,
  categoryName,
  color,
  onClose,
}: VariantsModalProps) {
  const totalQuantity = variants.reduce((sum, variant) => sum + variant.quantity, 0)
  const inStock = totalQuantity > 0
  const discountedCount = variants.filter((variant) => variant.discountPercent > 0).length

  return (
    <Modal open onClose={onClose} title={product.name}>
      <div className="variants-modal">
        <div className="variants-modal-hero">
          {product.image ? (
            <img src={product.image} alt={product.name} className="variant-modal-hero-img" />
          ) : (
            <div
              className="variant-modal-hero-placeholder"
              style={{ '--cover-color': color } as CSSProperties}
            >
              <span>{product.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="variants-modal-heading">
          <span className="chip" style={{ '--chip-color': color } as CSSProperties}>
            <span className="chip-dot" style={{ backgroundColor: color }} />
            {categoryName ?? 'Uncategorized'}
          </span>
          <span className={`variants-modal-stock${inStock ? '' : ' variants-modal-stock-low'}`}>
            <span className={`stock-dot${inStock ? '' : ' stock-dot-out'}`} />
            {inStock ? `${formatNumber(totalQuantity)} ${unitName ?? 'units'} in stock` : 'Out of stock'}
          </span>
        </div>

        <div className="variants-modal-summary">
          <span className="variants-modal-summary-item">
            <strong>{formatNumber(variants.length)}</strong> variants
          </span>
          <span className="variants-modal-summary-item">
            <strong>{formatNumber(totalQuantity)}</strong> units in stock
          </span>
          {discountedCount > 0 && (
            <span className="variants-modal-summary-item">
              <strong>{discountedCount}</strong> on discount
            </span>
          )}
        </div>

        <div className="variants-modal-list">
          <div className="variant-row variant-row-header">
            <span className="variant-thumb" />
            <span className="variant-row-name">Type</span>
            <span className="variant-row-size">Size</span>
            <span className="variant-row-meta">Quantity</span>
            <span className="variant-row-price">Selling Price</span>
          </div>
          {variants.map((variant) => (
            <div className="variant-row" key={variant.id}>
              <span className="variant-thumb">
                {variant.image ? (
                  <img src={variant.image} alt={variant.name} />
                ) : (
                  <span>{variant.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="variant-row-name">{variant.name}</span>
              <span className="variant-row-size">{variant.size || '—'}</span>
              <span className="variant-row-meta">
                <span className="variant-qty-chip">{formatNumber(variant.quantity)}</span>
                {unitName ?? ''}
                {variant.discountPercent > 0 && variant.costPrice > 0 && (
                  <span className="variant-off-chip">-{variant.discountPercent}%</span>
                )}
              </span>
              <span className="variant-row-price">{formatCurrency(variant.sellingPrice)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}