import { useMemo, type CSSProperties } from 'react'
import type { Inventory, Product, StockMovement } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { movementStorage, unitStorage, productVariantStorage, ensureMainStock } from '../../storage'
import { STOCK_LOCATION_MAIN_ID } from '../../constants'
import { formatDate, formatCurrency, formatNumber } from '../../utils/format'
import { movementLabel } from '../../utils/movements'
import { AppImage } from '../common/AppImage'
import { Modal } from '../common/Modal'

interface ProductDetailsModalProps {
  product: Product
  categoryName: string
  color: string
  records: Inventory[]
  locationNames: ReadonlyMap<string, string>
  open: boolean
  onClose: () => void
}

export function ProductDetailsModal({
  product,
  categoryName,
  color,
  records,
  locationNames,
  open,
  onClose,
}: ProductDetailsModalProps) {
  const units = useCollection(unitStorage)
  const movements = useCollection(movementStorage)

  const unitName = units.items.find((unit) => unit.id === product.unitId)?.name ?? '—'
  const variants = productVariantStorage.getByProduct(product.id)

  const recentMovements = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.productId === product.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [movements.items, product.id]
  )

  const variantUnits = variants.reduce((sum, v) => sum + v.quantity, 0)
  const recordUnits = records.reduce((sum, record) => sum + record.quantity, 0)
  const totalUnits = variants.length > 0 ? variantUnits : recordUnits

  const displayRecords = useMemo(() => {
    if (variants.length > 0 && variantUnits > 0) {
      const totalRecordQty = records.reduce((s, r) => s + r.quantity, 0)
      if (totalRecordQty === 0) {
        ensureMainStock(product.id, variantUnits)
        return records.map((r) =>
          r.locationId === STOCK_LOCATION_MAIN_ID ? { ...r, quantity: variantUnits } : r
        )
      }
    }
    return records
  }, [product.id, records, variants.length, variantUnits])

  const displayMovements = useMemo(() => {
    return recentMovements.map((m) => {
      if (m.type === 'inbound' && m.quantity === 0 && variantUnits > 0) {
        return { ...m, quantity: variantUnits }
      }
      return m
    })
  }, [recentMovements, variantUnits])

  return (
    <Modal open={open} onClose={onClose} title={product.name} width="md">
      <div className="product-details">
        <div className="product-details-stats">
          <div className="product-details-stat">
            <span className="product-details-stat-value">{categoryName}</span>
            <span className="product-details-stat-label">Category</span>
          </div>
          <div className="product-details-stat">
            <span className="product-details-stat-value">{unitName}</span>
            <span className="product-details-stat-label">Unit</span>
          </div>
          <div className="product-details-stat">
            <span className="product-details-stat-value">{formatNumber(totalUnits)}</span>
            <span className="product-details-stat-label">Total units</span>
          </div>
          <div className="product-details-stat">
            <span className="product-details-stat-value">{formatNumber(variants.length)}</span>
            <span className="product-details-stat-label">Variants</span>
          </div>
        </div>

        {variants.length > 0 && (
          <div className="product-details-section">
            <h3>Product Variants ({variants.length})</h3>
            <ul className="product-details-locations">
              {variants.map((variant) => (
                <li className="product-details-location" key={variant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {variant.image ? (
                      <AppImage src={variant.image} alt={variant.name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <span className="product-details-location-dot" style={{ '--c': color } as CSSProperties} />
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px' }}>{variant.name}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {[variant.size ? `Size: ${variant.size}` : '', variant.color ? `Color: ${variant.color}` : ''].filter(Boolean).join(' | ') || 'Standard'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="product-details-location-qty" style={{ display: 'block' }}>
                      {formatNumber(variant.quantity)} units
                    </span>
                    {variant.sellingPrice > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatCurrency(variant.sellingPrice)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="product-details-section">
          <h3>Stock by Location</h3>
          <ul className="product-details-locations">
            {displayRecords.map((record) => (
              <li className="product-details-location" key={record.id}>
                <span className="product-details-location-dot" style={{ '--c': color } as CSSProperties} />
                <span className="product-details-location-name">
                  {locationNames.get(record.locationId) ?? 'Unknown'}
                </span>
                <span className="product-details-location-qty">
                  {formatNumber(record.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="product-details-section">
          <h3>Recent Movements</h3>
          {displayMovements.length === 0 ? (
            <p className="product-details-empty">No movements recorded for this product yet.</p>
          ) : (
            <ul className="product-details-movements">
              {displayMovements.map((movement) => (
                <ProductDetailsMovementRow
                  key={movement.id}
                  movement={movement}
                  locationNames={locationNames}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ProductDetailsMovementRow({
  movement,
  locationNames,
}: {
  movement: StockMovement
  locationNames: ReadonlyMap<string, string>
}) {
  const from = movement.fromLocationId
    ? locationNames.get(movement.fromLocationId)
    : null
  const to = movement.toLocationId ? locationNames.get(movement.toLocationId) : null
  const incoming = movement.type !== 'transfer-out'
  const sign = incoming ? '+' : '\u2212'

  return (
    <li className="product-details-movement">
      <span className={`movement-type-badge movement-type-${movement.type}`}>
        {movementLabel(movement.type)}
      </span>
      <span className="product-details-movement-route">
        {from ?? 'Inbound'} &rarr; {to ?? 'Outbound'}
      </span>
      <span className="product-details-movement-date">{formatDate(movement.createdAt)}</span>
      <span className={`product-details-movement-qty${incoming ? ' qty-in' : ' qty-out'}`}>
        {sign}
        {formatNumber(movement.quantity)}
      </span>
    </li>
  )
}