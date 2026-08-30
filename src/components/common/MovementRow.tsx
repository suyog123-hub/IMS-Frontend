import type { CSSProperties } from 'react'
import type { Category, Product, StockLocation, StockMovement } from '../../types/models'
import { formatDate, formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { movementLabel } from '../../utils/movements'

interface MovementRowProps {
  movement: StockMovement
  products: Product[]
  categories: Category[]
  locations: StockLocation[]
}

export function MovementRow({ movement, products, categories, locations }: MovementRowProps) {
  const product = products.find((item) => item.id === movement.productId)
  const productName = product?.name ?? 'Unknown Product'
  const categoryName =
    categories.find((item) => item.id === product?.categoryId)?.name ?? 'Uncategorized'
  const color = nameColor(categoryName)
  const locationName = (id: string | null) =>
    id ? locations.find((location) => location.id === id)?.name ?? 'Unknown' : null
  const from = locationName(movement.fromLocationId)
  const to = locationName(movement.toLocationId)
  const label = movementLabel(movement.type)
  const incoming = movement.type !== 'transfer-out'
  const sign = incoming ? '+' : '\u2212'

  return (
    <li className="card movement-card-item" style={{ '--c': color } as CSSProperties}>
      <div className="movement-card-top">
        <span className="movement-thumb">{productName.charAt(0).toUpperCase()}</span>
        <span className={`movement-type-badge movement-type-${movement.type}`}>{label}</span>
      </div>

      <div className="movement-card-body">
        <span className="movement-card-name">{productName}</span>
        <span className="movement-card-meta">
          {categoryName} &middot; {formatDate(movement.createdAt)}
        </span>
        <span className="movement-card-route">
          {movement.type === 'inbound' ? (
            <>
              <span className="movement-route-label">Incoming at</span>
              <span className="movement-loc">{to ?? 'Unknown'}</span>
            </>
          ) : movement.type === 'transfer-out' ? (
            <>
              <span className="movement-route-label">Out of</span>
              <span className="movement-loc">{from ?? 'Unknown'}</span>
              <span className="movement-card-arrow">&rarr;</span>
              <span className="movement-loc">{to ?? 'Unknown'}</span>
            </>
          ) : (
            <>
              <span className="movement-loc">{from ?? 'Unknown'}</span>
              <span className="movement-card-arrow">&rarr;</span>
              <span className="movement-route-label">Into</span>
              <span className="movement-loc">{to ?? 'Unknown'}</span>
            </>
          )}
        </span>
      </div>

      <span className={`movement-card-qty${incoming ? ' movement-card-qty-in' : ' movement-card-qty-out'}`}>
        <span className="movement-card-sign">{sign}</span>
        {formatNumber(movement.quantity)}
      </span>
    </li>
  )
}