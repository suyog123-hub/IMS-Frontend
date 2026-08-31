import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Category, Product, ProductVariant, Unit } from '../../types/models'
import { formatCurrency, formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { POPULAR_TAGS } from '../../utils/popularTags'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { PriceRangeFilter } from '../common/PriceRangeFilter'
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

const PRODUCTS_PER_PAGE = 6
let skeletonShown = false

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

  const maxPrice = useMemo(() => {
    let max = 0
    for (const product of products) {
      max = Math.max(max, product.sellingPrice)
      for (const variant of variantsByProduct.get(product.id) ?? []) {
        max = Math.max(max, variant.sellingPrice)
      }
    }
    return max
  }, [products, variantsByProduct])

  const countInRange = useCallback(
    (min: number, max: number): number => {
      return products.filter((product) => {
        const productVariants = variantsByProduct.get(product.id) ?? []
        const inRange = (price: number) => price >= min && price <= max
        return inRange(product.sellingPrice) || productVariants.some((v) => inRange(v.sellingPrice))
      }).length
    },
    [products, variantsByProduct]
  )

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [variantQuery, setVariantQuery] = useState('')
  const [colorQuery, setColorQuery] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(() => {
    if (skeletonShown) return false
    skeletonShown = true
    return true
  })

  useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => setLoading(false), 550)
    return () => window.clearTimeout(timer)
  }, [loading])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const vq = variantQuery.trim().toLowerCase()
    const cq = colorQuery.trim().toLowerCase()
    const parsedMin = Number(priceMin.trim())
    const parsedMax = Number(priceMax.trim())
    const min = priceMin.trim() !== '' && Number.isFinite(parsedMin) ? parsedMin : null
    const max = priceMax.trim() !== '' && Number.isFinite(parsedMax) ? parsedMax : null
    return products.filter((product) => {
      if (categoryId !== 'all' && product.categoryId !== categoryId) return false
      const name = product.name.toLowerCase()
      const category = (categoryName.get(product.categoryId) ?? '').toLowerCase()
      if (q && !name.includes(q) && !category.includes(q)) return false
      const productVariants = variantsByProduct.get(product.id) ?? []
      if (vq && !productVariants.some((variant) => variant.name.toLowerCase().includes(vq))) {
        return false
      }
      if (cq && !productVariants.some((variant) => variant.name.toLowerCase().includes(cq))) {
        return false
      }
      if (min !== null || max !== null) {
        const inRange = (price: number) =>
          (min === null || price >= min) && (max === null || price <= max)
        const priceMatch =
          inRange(product.sellingPrice) ||
          productVariants.some((variant) => inRange(variant.sellingPrice))
        if (!priceMatch) return false
      }
      if (tag) {
        const quantity = productVariants.length
          ? productVariants.reduce((sum, variant) => sum + variant.quantity, 0)
          : product.quantity
        const status = quantity > 50 ? 'in' : quantity >= 10 ? 'low' : 'out'
        if (tag === 'onsale' && product.discountPercent <= 0) return false
        if (tag === 'instock' && status !== 'in') return false
        if (tag === 'lowstock' && status !== 'low') return false
        if (tag === 'outofstock' && status !== 'out') return false
      }
      return true
    })
  }, [products, query, categoryId, categoryName, variantsByProduct, variantQuery, colorQuery, priceMin, priceMax, tag])

  const resetFilters = () => {
    setPriceMin('')
    setPriceMax('')
    setVariantQuery('')
    setColorQuery('')
    setTag('')
    setPage(1)
  }

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
    <div className="products-layout">
      <aside className="card filter-panel">
        <div className="filter-panel-head">
          <h3 className="filter-panel-title">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54Z" />
            </svg>
            Quick Filters
          </h3>
          <button type="button" className="filter-reset" onClick={resetFilters}>
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
</div>

        <PriceRangeFilter
          appliedMin={priceMin}
          appliedMax={priceMax}
          maxValue={maxPrice}
          totalCount={products.length}
          countInRange={countInRange}
          onApply={(min, max) => {
            setPriceMin(min)
            setPriceMax(max)
            setPage(1)
          }}
          onClear={() => {
            setPriceMin('')
            setPriceMax('')
            setPage(1)
          }}
        />

        <div className="filter-group">
          <label htmlFor="filter-variant">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Search Variant
          </label>
          <input
            id="filter-variant"
            type="text"
            value={variantQuery}
            onChange={(event) => {
              setVariantQuery(event.target.value)
              setPage(1)
            }}
            placeholder="e.g. Large, XL"
            className="input filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-color">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21.4 6.3 15.7a7 7 0 1 1 11.4 0Z" />
            </svg>
            Search Color
          </label>
          <input
            id="filter-color"
            type="text"
            value={colorQuery}
            onChange={(event) => {
              setColorQuery(event.target.value)
              setPage(1)
            }}
            placeholder="e.g. Red, Black"
            className="input filter-input"
          />
        </div>

        <div className="filter-group">
          <label>
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.6 13.4 11 3H3v8l10.4 10.6a2 2 0 0 0 2.8 0l4.4-4.4a2 2 0 0 0 0-2.8Z" />
              <circle cx="7.5" cy="7.5" r="1.5" />
            </svg>
            Popular Tags
          </label>
          <div className="filter-chips" role="group" aria-label="Filter by popular tag">
            <button
              type="button"
              className={`chip-btn${tag === '' ? ' chip-btn-active' : ''}`}
              onClick={() => {
                setTag('')
                setPage(1)
              }}
            >
              All
            </button>
            {POPULAR_TAGS.map((popularTag) => (
              <button
                key={popularTag.id}
                type="button"
                className={`chip-btn${tag === popularTag.id ? ' chip-btn-active' : ''}`}
                style={
                  tag === popularTag.id
                    ? ({ '--chip-btn-color': popularTag.color } as CSSProperties)
                    : undefined
                }
                onClick={() => {
                  setTag(popularTag.id)
                  setPage(1)
                }}
              >
                {popularTag.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="products-main">
        <div className="products-toolbar">
        <div className="search-wrap">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search products…"
            className="input products-search"
          />
        </div>
        <div className="category-pills" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`pill${categoryId === 'all' ? ' pill-active' : ''}`}
            onClick={() => {
              setCategoryId('all')
              setPage(1)
            }}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`pill${categoryId === category.id ? ' pill-active' : ''}`}
              onClick={() => {
                setCategoryId(category.id)
                setPage(1)
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card-grid card-grid-inside card-grid-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="card pcard pp-skeleton" key={i}>
              <div className="pcard-cover">
                <span className="sk sk-cover-block" />
              </div>
              <div className="pcard-info">
                <span className="sk sk-line sk-name-line" />
                <span className="sk sk-line sk-meta-line" />
                <span className="sk sk-line sk-pricing-line" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No matching products" message="Try a different search or filter." />
        </div>
      ) : (
        <div className="card-grid card-grid-inside card-grid-3">
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PRODUCTS_PER_PAGE}
        onPageChange={setPage}
      />
      </div>
    </div>
  )
}