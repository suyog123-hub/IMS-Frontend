import { useMemo, type CSSProperties } from 'react'
import type { Inventory, Product, StockMovement } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { movementStorage, unitStorage } from '../../storage'
import { formatDate, formatNumber } from '../../utils/format'
import { movementLabel } from '../../utils/movements'
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

  const recentMovements = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.productId === product.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [movements.items, product.id]
  )

  const totalUnits = records.reduce((sum, record) => sum + record.quantity, 0)

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
        </div>

        <div className="product-details-section">
          <h3>Stock by Location</h3>
          <ul className="product-details-locations">
            {records.map((record) => (
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
          {recentMovements.length === 0 ? (
            <p className="product-details-empty">No movements recorded for this product yet.</p>
          ) : (
            <ul className="product-details-movements">
              {recentMovements.map((movement) => (
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