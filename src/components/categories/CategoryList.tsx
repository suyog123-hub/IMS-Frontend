import { useMemo, useState, type CSSProperties } from 'react'
import type { Category } from '../../types/models'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { EmptyState } from '../common/EmptyState'
import { ListToolbar } from '../common/ListToolbar'
import { Pagination } from '../common/Pagination'

interface CategoryListProps {
  categories: Category[]
  productCounts: ReadonlyMap<string, number>
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

const CATEGORIES_PER_PAGE = 9

export function CategoryList({ categories, productCounts, onEdit, onDelete }: CategoryListProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((category) => category.name.toLowerCase().includes(q))
  }, [categories, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / CATEGORIES_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * CATEGORIES_PER_PAGE
  const visibleCategories = filtered.slice(startIndex, startIndex + CATEGORIES_PER_PAGE)

  if (categories.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="No categories available"
          message="Create a category before adding a product."
        />
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
          placeholder="Search categories…"
        />

        {filtered.length === 0 ? (
          <EmptyState title="No matching categories" message="Try a different search." />
        ) : (
          <div className="card-grid card-grid-inside">
        {visibleCategories.map((category) => {
        const color = nameColor(category.name)
        const initial = category.name.charAt(0).toUpperCase()
        const productCount = productCounts.get(category.id) ?? 0

        return (
          <div className="card master-card" style={{ '--c': color } as CSSProperties} key={category.id}>
            <div className="master-cover">
              <span className="master-avatar">{initial}</span>
              <span
                className={`master-chip${productCount > 0 ? '' : ' master-chip-unused'}`}
              >
                {productCount > 0 ? 'In use' : 'Unused'}
              </span>
              <div className="master-actions">
                <button
                  type="button"
                  className="master-action"
                  title="Edit category"
                  onClick={() => onEdit(category)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
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
                  className="master-action master-action-danger"
                  title="Delete category"
                  onClick={() => onDelete(category)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
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

            <div className="master-body">
              <h3 className="master-name" title={category.name}>
                {category.name}
              </h3>
              <div className="master-stat">
                <span className="master-stat-value">{formatNumber(productCount)}</span>
                <svg
                  className="master-stat-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                </svg>
                <span className="master-stat-label">Products in this category</span>
              </div>
            </div>
          </div>
        )
      })}
        </div>
      )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={CATEGORIES_PER_PAGE}
        onPageChange={setPage}
      />
    </>
  )
}