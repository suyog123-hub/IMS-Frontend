import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import type { Product, ProductVariant, Unit } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { categoryStorage, productStorage, productVariantStorage, unitStorage } from '../../storage'
import { formatCurrency, formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { POPULAR_TAGS } from '../../utils/popularTags'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { PriceRangeFilter } from '../common/PriceRangeFilter'

const VARIANTS_PER_PAGE = 12

interface VariantCardProps {
  variant: ProductVariant
  productName: string
  categoryName: string
  unitName: string
  color: string
}

function VariantCard({ variant, productName, categoryName, unitName, color }: VariantCardProps) {
  const inStock = variant.quantity > 0
  const savedAmount = Math.max(0, variant.costPrice - variant.sellingPrice)
  const image = variant.image || undefined

  return (
    <div className="card pcard">
      <div className={`pcard-cover${inStock ? '' : ' pcard-cover-out'}`}>
        {image ? (
          <img src={image} alt={variant.name} className="pcard-cover-img" />
        ) : (
          <div
            className="pcard-cover-placeholder"
            style={{ '--cover-color': color } as CSSProperties}
          >
            <span>{variant.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="pcard-cover-badges">
          {variant.discountPercent > 0 && (
            <span className="pcard-badge pcard-badge-off">−{variant.discountPercent}%</span>
          )}
          {!inStock && <span className="pcard-badge pcard-badge-stock">Out of stock</span>}
        </div>
      </div>

      <div className="pcard-info">
        <h3 className="pcard-name" title={variant.name}>
          {variant.name}
        </h3>

        {variant.size && <p className="pcard-size">Size: {variant.size}</p>}

        <div className="pcard-meta">
          <span className="chip" style={{ '--chip-color': color } as CSSProperties}>
            <span className="chip-dot" style={{ backgroundColor: color }} />
            {categoryName}
          </span>
          <span className={`pcard-stock${inStock ? '' : ' pcard-stock-low'}`}>
            <span className={`stock-dot${inStock ? '' : ' stock-dot-out'}`} />
            {inStock
              ? `${formatNumber(variant.quantity)} ${unitName.toLowerCase() || 'units'} in stock`
              : 'Out of stock'}
          </span>
        </div>

        <div className="pcard-owner" title={productName}>
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {productName}
        </div>

        <div className="pcard-pricing">
          <span className="pcard-current">{formatCurrency(variant.sellingPrice)}</span>
          {variant.discountPercent > 0 && (
            <span className="pcard-old">{formatCurrency(variant.costPrice)}</span>
          )}
          <span className="pcard-save">Save {formatCurrency(savedAmount)}</span>
        </div>
      </div>
    </div>
  )
}

export function ProductVariantsPage() {
  const products = useCollection(productStorage)
  const variants = useCollection(productVariantStorage)
  const categories = useCollection(categoryStorage)
  const units = useCollection(unitStorage)

  const productById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of products.items) map.set(product.id, product)
    return map
  }, [products.items])

  const categoryNames = useMemo(
    () => new Map(categories.items.map((category) => [category.id, category.name])),
    [categories.items]
  )
  const unitNames = useMemo(
    () => new Map(units.items.map((unit: Unit) => [unit.id, unit.name])),
    [units.items]
  )
  const categoryColors = useMemo(
    () => new Map(categories.items.map((category) => [category.id, nameColor(category.name)])),
    [categories.items]
  )

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [variantQuery, setVariantQuery] = useState('')
  const [colorQuery, setColorQuery] = useState('')
  const [tag, setTag] = useState('')

  const enriched = useMemo(() => {
    return variants.items
      .map((variant) => {
        const product = productById.get(variant.productId)
        return {
          variant,
          productId: variant.productId,
          productName: product?.name ?? 'Unknown Product',
          categoryId: product?.categoryId ?? '',
          categoryName: categoryNames.get(product?.categoryId ?? '') ?? 'Uncategorized',
          unitName: unitNames.get(product?.unitId ?? '') ?? 'units',
          color: categoryColors.get(product?.categoryId ?? '') ?? '#64748b',
        }
      })
      .sort((a, b) => a.variant.name.localeCompare(b.variant.name))
  }, [variants.items, productById, categoryNames, unitNames, categoryColors])

  const maxPrice = useMemo(() => {
    let max = 0
    for (const variant of variants.items) max = Math.max(max, variant.sellingPrice)
    return max
  }, [variants.items])

  const countInRange = useCallback(
    (min: number, max: number): number => {
      const inRange = (price: number) => price >= min && price <= max
      return variants.items.filter((variant) => inRange(variant.sellingPrice)).length
    },
    [variants.items]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const vq = variantQuery.trim().toLowerCase()
    const cq = colorQuery.trim().toLowerCase()
    const parsedMin = Number(priceMin.trim())
    const parsedMax = Number(priceMax.trim())
    const min = priceMin.trim() !== '' && Number.isFinite(parsedMin) ? parsedMin : null
    const max = priceMax.trim() !== '' && Number.isFinite(parsedMax) ? parsedMax : null
    return enriched.filter((row) => {
      if (categoryId !== 'all' && row.categoryId !== categoryId) return false
      if (q) {
        const hit =
          row.variant.name.toLowerCase().includes(q) ||
          row.productName.toLowerCase().includes(q) ||
          row.categoryName.toLowerCase().includes(q)
        if (!hit) return false
      }
      if (vq && !row.variant.name.toLowerCase().includes(vq)) return false
      if (cq && !row.variant.name.toLowerCase().includes(cq)) return false
      if (min !== null || max !== null) {
        const price = row.variant.sellingPrice
        if ((min !== null && price < min) || (max !== null && price > max)) return false
      }
      if (tag) {
        const quantity = row.variant.quantity
        const status = quantity > 50 ? 'in' : quantity >= 10 ? 'low' : 'out'
        if (tag === 'onsale' && row.variant.discountPercent <= 0) return false
        if (tag === 'instock' && status !== 'in') return false
        if (tag === 'lowstock' && status !== 'low') return false
        if (tag === 'outofstock' && status !== 'out') return false
      }
      return true
    })
  }, [enriched, query, categoryId, variantQuery, colorQuery, priceMin, priceMax, tag])

  const resetFilters = () => {
    setPriceMin('')
    setPriceMax('')
    setVariantQuery('')
    setColorQuery('')
    setTag('')
    setPage(1)
  }

  const totalVariants = variants.items.length
  const inStockCount = enriched.filter((row) => row.variant.quantity > 0).length
  const outOfStockCount = totalVariants - inStockCount

  const totalPages = Math.max(1, Math.ceil(filtered.length / VARIANTS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * VARIANTS_PER_PAGE
  const visibleRows = filtered.slice(startIndex, startIndex + VARIANTS_PER_PAGE)

  return (
    <section>
      <div className="page-header">
        <h1>Product Variants</h1>
        <p>Every product variant across all products, with its own stock and pricing.</p>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(totalVariants)}</span>
          <span className="inventory-stat-label">Total variants</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(inStockCount)}</span>
          <span className="inventory-stat-label">In stock</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(outOfStockCount)}</span>
          <span className="inventory-stat-label">Out of stock</span>
        </div>
      </div>

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
          totalCount={variants.items.length}
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
                placeholder="Search variant, product, or category…"
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
              {categories.items.map((category) => (
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

          {enriched.length === 0 ? (
            <div className="card">
              <EmptyState
                title="No variants available"
                message="Add variants to a product (e.g. size or color) to see them here."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState title="No matching variants" message="Try a different search or filter." />
            </div>
          ) : (
            <div className="card-grid card-grid-inside">
              {visibleRows.map((row) => (
                <VariantCard
                  key={row.variant.id}
                  variant={row.variant}
                  productName={row.productName}
                  categoryName={row.categoryName}
                  unitName={row.unitName}
                  color={row.color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={VARIANTS_PER_PAGE}
        onPageChange={setPage}
      />
    </section>
  )
}