import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { StockLocation } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import {
  inventoryStorage,
  isMainLocation,
  stockLocationStorage,
  countProductsAtLocation,
} from '../../storage'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { StockLocationList } from './StockLocationList'
import { toastError, toastSuccess } from '../../utils/toast'

interface BlockedLocation {
  location: StockLocation
  productCount: number
  childCount: number
}

export function StockLocationsPage() {
  const navigate = useNavigate()
  const { items, remove } = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const [deleteTarget, setDeleteTarget] = useState<StockLocation | null>(null)
  const [blockedTarget, setBlockedTarget] = useState<BlockedLocation | null>(null)

  const parentNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const location of items) names.set(location.id, location.name)
    return names
  }, [items])

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const seen = new Set<string>()
    for (const record of inventory.items) {
      const key = `${record.locationId}\u0000${record.productId}`
      if (seen.has(key)) continue
      seen.add(key)
      counts.set(record.locationId, (counts.get(record.locationId) ?? 0) + 1)
    }
    return counts
  }, [inventory.items])

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const location of items) {
      if (location.parentId) {
        counts.set(location.parentId, (counts.get(location.parentId) ?? 0) + 1)
      }
    }
    return counts
  }, [items])

  const handleDelete = (location: StockLocation) => {
    const productCount = countProductsAtLocation(location.id)
    const childCount = childCounts.get(location.id) ?? 0
    if (isMainLocation(location) || productCount > 0 || childCount > 0) {
      setBlockedTarget({ location, productCount, childCount })
    } else {
      setDeleteTarget(location)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      const removed = remove(deleteTarget.id)
      if (removed) {
        toastSuccess(`Location "${deleteTarget.name}" deleted.`)
      } else {
        toastError('Could not delete the location. It may no longer exist.')
      }
    }
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>Stock Locations</h1>
          <p>Warehouses and sub-locations where your products are stored.</p>
        </div>
        <Link to="/stock-locations/new" className="btn btn-primary">
          Add Location
        </Link>
      </div>

      <StockLocationList
        locations={items}
        parentNames={parentNames}
        productCounts={productCounts}
        isMain={isMainLocation}
        onEdit={(location) => navigate(`/stock-locations/${location.id}/edit`)}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Stock Location"
        message={
          <>
            Are you sure you want to delete the location &ldquo;<strong>{deleteTarget?.name}</strong>
            &rdquo;? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={blockedTarget !== null}
        title="Cannot Delete Location"
        tone="warning"
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setBlockedTarget(null)}
        onCancel={() => setBlockedTarget(null)}
        message={
          <>
            {blockedTarget && isMainLocation(blockedTarget.location) && (
              <>
                The <strong>Main Warehouse</strong> is the default location where new products are
                stored and cannot be deleted.
              </>
            )}
            {blockedTarget && !isMainLocation(blockedTarget.location) && blockedTarget.productCount > 0 && (
              <>
                This location currently holds <strong>{blockedTarget.productCount}</strong> product
                {blockedTarget.productCount === 1 ? '' : 's'}. Move that stock elsewhere before
                deleting it.
              </>
            )}
            {blockedTarget && !isMainLocation(blockedTarget.location) && blockedTarget.childCount > 0 && (
              <>
                {blockedTarget.productCount > 0 ? ' It also has ' : 'This location has '}
                <strong>{blockedTarget.childCount}</strong> child location
                {blockedTarget.childCount === 1 ? '' : 's'} below it. Move or delete them first.
              </>
            )}
          </>
        }
      />
    </section>
  )
}