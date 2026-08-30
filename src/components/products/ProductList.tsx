import { useMemo, useState, type CSSProperties } from 'react'
import type { Category, Product, ProductVariant, Unit } from '../../types/models'
import { formatCurrency, formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { EmptyState } from '../common/EmptyState'
import { ListToolbar } from '../common/ListToolbar'
import { Pagination } from '../common/Pagination'
import { VariantsModal } from './VariantsModal'

interface ProductCardProps {
  product: Product
  categoryName: string | undefined
  unitName: string | undefined
  color: string
  variants: ProductVariant[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

function ProductCard({
  product,
  categoryName,
  unitName,
  color,
  variants,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const [variantsOpen, setVariantsOpen] = useState(false)
  const totalQuantity = variants.length
    ? variants.reduce((sum, variant) => sum + variant.quantity, 0)
    : product.quantity
  const inStock = totalQuantity > 0
  const discountPercent = product.discountPercent
  const savedAmount = Math.max(0, product.costPrice - product.sellingPrice)

  return (
    <div className="card pcard">
      <div className={`pcard-cover${inStock ? '' : ' pcard-cover-out'}`}>
        {product.image ? (
          <img src={product.image} alt={product.name} className="pcard-cover-img" />
        ) : (
          <div
            className="pcard-cover-placeholder"
            style={{ '--cover-color': color } as CSSProperties}
          >
            <span>{product.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="pcard-cover-badges">
          {discountPercent > 0 && (
            <span className="pcard-badge pcard-badge-off">−{discountPercent}%</span>
          )}
          {!inStock && <span className="pcard-badge pcard-badge-stock">Out of stock</span>}
        </div>
        <div className="pcard-quick-actions">
          <button
            type="button"
            className="btn btn-sm pcard-quick-btn"
            title="Edit product"
            onClick={() => onEdit(product)}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-sm pcard-quick-btn pcard-quick-btn-danger"
            title="Delete product"
            onClick={() => onDelete(product)}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      <div className="pcard-info">
        <h3 className="pcard-name" title={product.name}>
          {product.name}
        </h3>

        <div className="pcard-meta">
          <span className="chip" style={{ '--chip-color': color } as CSSProperties}>
            <span className="chip-dot" style={{ backgroundColor: color }} />
            {categoryName ?? 'Uncategorized'}
          </span>
          <span className={`pcard-stock${inStock ? '' : ' pcard-stock-low'}`}>
            <span className={`stock-dot${inStock ? '' : ' stock-dot-out'}`} />
            {inStock ? `${formatNumber(totalQuantity)} in stock` : 'Out of stock'}
          </span>
        </div>

        <div className="pcard-pricing">
          <span className="pcard-current">{formatCurrency(product.sellingPrice)}</span>
          {discountPercent > 0 && (
            <span className="pcard-old">{formatCurrency(product.costPrice)}</span>
          )}
          <span className="pcard-save">Save {formatCurrency(savedAmount)}</span>
        </div>

        {variants.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline btn-block pcard-variants-btn"
            onClick={() => setVariantsOpen(true)}
          >
            <span>View Variants</span>
            <span className="variants-count-badge">{formatNumber(variants.length)}</span>
            <svg
              className="pcard-chevron"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {variantsOpen && (
        <VariantsModal
          product={product}
          variants={variants}
          unitName={unitName}
          categoryName={categoryName}
          color={color}
          onClose={() => setVariantsOpen(false)}
        />
      )}
    </div>
  )
}

interface ProductListProps {
  products: Product[]
  categories: Category[]
  units: Unit[]
  variants: ProductVariant[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

const PRODUCTS_PER_PAGE = 8

export function ProductList({
  products,
  categories,
  units,
  variants,
  onEdit,
  onDelete,
}: ProductListProps) {
  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )
  const unitName = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.name])),
    [units]
  )
  const categoryColor = useMemo(
    () => new Map(categories.map((category) => [category.id, nameColor(category.name)])),
    [categories]
  )
  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariant[]>()
    variants.forEach((variant) => {
      const list = map.get(variant.productId) ?? []
      list.push(variant)
      map.set(variant.productId, list)
    })
    return map
  }, [variants])

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((product) => {
      if (categoryId !== 'all' && product.categoryId !== categoryId) return false
      if (!q) return true
      const name = product.name.toLowerCase()
      const category = (categoryName.get(product.categoryId) ?? '').toLowerCase()
      return name.includes(q) || category.includes(q)
    })
  }, [products, query, categoryId, categoryName])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
  const visibleProducts = filtered.slice(startIndex, startIndex + PRODUCTS_PER_PAGE)

  if (products.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No products found." message="Add a product to get started." />
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <ListToolbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Search products…"
          filters={[
            {
              value: categoryId,
              onChange: (value) => {
                setCategoryId(value)
                setPage(1)
              },
              options: [
                { value: 'all', label: 'All categories' },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ],
            },
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState title="No matching products" message="Try a different search or filter." />
        ) : (
          <div className="card-grid card-grid-inside">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={categoryName.get(product.categoryId)}
                unitName={unitName.get(product.unitId)}
                color={categoryColor.get(product.categoryId) ?? '#64748b'}
                variants={variantsByProduct.get(product.id) ?? []}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PRODUCTS_PER_PAGE}
        onPageChange={setPage}
      />
    </>
  )
}