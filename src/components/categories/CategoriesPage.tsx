import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Category } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { categoryStorage, productStorage, countProductsByCategory } from '../../storage'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { CategoryList } from './CategoryList'
import { toastError, toastSuccess } from '../../utils/toast'

interface BlockedCategory {
  category: Category
  productCount: number
}

export function CategoriesPage() {
  const navigate = useNavigate()
  const { items, remove } = useCollection(categoryStorage)
  const products = useCollection(productStorage)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [blockedTarget, setBlockedTarget] = useState<BlockedCategory | null>(null)

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products.items) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
    }
    return counts
  }, [products.items])

  const handleDelete = (category: Category) => {
    const productCount = countProductsByCategory(category.id)
    if (productCount > 0) {
      setBlockedTarget({ category, productCount })
    } else {
      setDeleteTarget(category)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      const removed = remove(deleteTarget.id)
      if (removed) {
        toastSuccess(`Category "${deleteTarget.name}" deleted.`)
      } else {
        toastError('Could not delete the category. It may no longer exist.')
      }
    }
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>Categories</h1>
          <p>Create and manage the categories used by your products.</p>
        </div>
        <Link to="/categories/new" className="btn btn-primary">
          Add Category
        </Link>
      </div>

      <CategoryList
        categories={items}
        productCounts={productCounts}
        onEdit={(category) => navigate(`/categories/${category.id}/edit`)}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Category"
        message={
          <>
            Are you sure you want to delete the category &ldquo;<strong>{deleteTarget?.name}</strong>
            &rdquo;? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={blockedTarget !== null}
        title="Cannot Delete Category"
        tone="warning"
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setBlockedTarget(null)}
        onCancel={() => setBlockedTarget(null)}
        message={
          <>
            This category is currently used by <strong>{blockedTarget?.productCount}</strong> product
            {blockedTarget && blockedTarget.productCount === 1 ? '' : 's'}. Please reassign those
            products before deleting this category.
          </>
        }
      />
    </section>
  )
}