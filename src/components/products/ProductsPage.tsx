import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { categoryStorage, productStorage, productVariantStorage, removeInventoryByProduct, removeMovementsByProduct, unitStorage } from '../../storage'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ProductList } from './ProductList'
import { toastError, toastSuccess } from '../../utils/toast'

export function ProductsPage() {
  const navigate = useNavigate()
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const units = useCollection(unitStorage)
  const variants = useCollection(productVariantStorage)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const confirmDelete = () => {
    if (deleteTarget) {
      variants.removeWhere((variant) => variant.productId === deleteTarget.id)
      removeInventoryByProduct(deleteTarget.id)
      removeMovementsByProduct(deleteTarget.id)
      const removed = products.remove(deleteTarget.id)
      if (removed) {
        toastSuccess(`Product "${deleteTarget.name}" deleted.`)
      } else {
        toastError('Could not delete the product. It may no longer exist.')
      }
    }
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>Inventory Manager</h1>
          <p>Search and manage all your products in one place.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Product
        </Link>
      </div>

      <ProductList
        products={products.items}
        categories={categories.items}
        units={units.items}
        variants={variants.items}
        onEdit={(product) => navigate(`/products/${product.id}/edit`)}
        onDelete={setDeleteTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Product"
        message={
          <>
            Are you sure you want to delete the product &ldquo;<strong>{deleteTarget?.name}</strong>
            &rdquo;? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}