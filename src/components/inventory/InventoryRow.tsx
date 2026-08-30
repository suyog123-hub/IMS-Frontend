import { useState, type CSSProperties } from 'react'
import type { Inventory, Product } from '../../types/models'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { ProductDetailsModal } from './ProductDetailsModal'

interface InventoryRowProps {
  product: Product
  categoryName: string
  records: Inventory[]
  locationNames: ReadonlyMap<string, string>
}

export function InventoryRow({ product, categoryName, records, locationNames }: InventoryRowProps) {
  const color = nameColor(categoryName)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const totalUnits = records.reduce((sum, record) => sum + record.quantity, 0)

  return (
    <div className="card inventory-card-item" style={{ '--c': color } as CSSProperties}>
      <div className="inventory-card-cover">
        {product.image ? (
          <img src={product.image} alt={product.name} className="inventory-card-avatar-img" />
        ) : (
          <span className="inventory-card-avatar">{product.name.charAt(0).toUpperCase()}</span>
        )}
        <span className="inventory-card-total">{formatNumber(totalUnits)} units</span>
      </div>
      <div className="inventory-card-body">
        <span className="inventory-card-name">{product.name}</span>
        <span className="inventory-card-meta">
          {categoryName} &middot; {records.length} location{records.length === 1 ? '' : 's'}
        </span>
      </div>

      <button
        type="button"
        className="inventory-card-details"
        onClick={() => setDetailsOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Details
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <ProductDetailsModal
        product={product}
        categoryName={categoryName}
        color={color}
        records={records}
        locationNames={locationNames}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  )
}