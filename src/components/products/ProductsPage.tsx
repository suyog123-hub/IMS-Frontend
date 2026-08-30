import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { categoryStorage, productStorage, productVariantStorage, removeInventoryByProduct, removeMovementsByProduct, unitStorage } from '../../storage'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ProductList } from './ProductList'

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
      products.remove(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <h1>Products</h1>
          <p>Each product references a category and a unit.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
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