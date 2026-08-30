import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Unit } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { productStorage, unitStorage, countProductsByUnit } from '../../storage'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { UnitList } from './UnitList'

interface BlockedUnit {
  unit: Unit
  productCount: number
}

export function UnitsPage() {
  const navigate = useNavigate()
  const { items, remove } = useCollection(unitStorage)
  const products = useCollection(productStorage)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [blockedTarget, setBlockedTarget] = useState<BlockedUnit | null>(null)

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products.items) {
      counts.set(product.unitId, (counts.get(product.unitId) ?? 0) + 1)
    }
    return counts
  }, [products.items])

  const handleDelete = (unit: Unit) => {
    const productCount = countProductsByUnit(unit.id)
    if (productCount > 0) {
      setBlockedTarget({ unit, productCount })
    } else {
      setDeleteTarget(unit)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>Units</h1>
          <p>Create and manage the units used by your products.</p>
        </div>
        <Link to="/units/new" className="btn btn-primary">
          Add Unit
        </Link>
      </div>

      <UnitList
        units={items}
        productCounts={productCounts}
        onEdit={(unit) => navigate(`/units/${unit.id}/edit`)}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Unit"
        message={
          <>
            Are you sure you want to delete the unit &ldquo;<strong>{deleteTarget?.name}</strong>
            &rdquo;? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={blockedTarget !== null}
        title="Cannot Delete Unit"
        tone="warning"
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setBlockedTarget(null)}
        onCancel={() => setBlockedTarget(null)}
        message={
          <>
            This unit is currently used by <strong>{blockedTarget?.productCount}</strong> product
            {blockedTarget && blockedTarget.productCount === 1 ? '' : 's'}. Please reassign those
            products before deleting this unit.
          </>
        }
      />
    </section>
  )
}