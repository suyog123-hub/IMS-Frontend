import { useMemo, useState, type CSSProperties } from 'react'
import type { Unit } from '../../types/models'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'

interface UnitListProps {
  units: Unit[]
  productCounts: ReadonlyMap<string, number>
  onEdit: (unit: Unit) => void
  onDelete: (unit: Unit) => void
}

const UNITS_PER_PAGE = 9

export function UnitList({ units, productCounts, onEdit, onDelete }: UnitListProps) {
  const [query, setQuery] = useState('')
  const [usage, setUsage] = useState<'all' | 'inuse' | 'unused'>('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return units.filter((unit) => {
      const productCount = productCounts.get(unit.id) ?? 0
      if (usage === 'inuse' && productCount === 0) return false
      if (usage === 'unused' && productCount > 0) return false
      if (!q) return true
      return unit.name.toLowerCase().includes(q)
    })
  }, [units, query, usage, productCounts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / UNITS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * UNITS_PER_PAGE
  const visibleUnits = filtered.slice(startIndex, startIndex + UNITS_PER_PAGE)

  if (units.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No units available" message="Create a unit before adding a product." />
      </div>
    )
  }

  return (
    <div className="products-layout">
      <QuickFilterPanel
        groups={[
          {
            label: 'Status',
            kind: 'status',
            value: usage,
            options: [
              { value: 'all', label: 'All' },
              { value: 'inuse', label: 'In use', color: '#10b981' },
              { value: 'unused', label: 'Unused', color: '#f59e0b' },
            ],
            onChange: (value) => {
              setUsage(value as 'all' | 'inuse' | 'unused')
              setPage(1)
            },
          },
        ]}
        onReset={() => {
          setUsage('all')
          setQuery('')
          setPage(1)
        }}
      />

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
              placeholder="Search units…"
              className="input products-search"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState title="No matching units" message="Try a different search or filter." />
          </div>
        ) : (
          <div className="card-grid card-grid-inside">
        {visibleUnits.map((unit) => {
        const color = nameColor(unit.name)
        const initial = unit.name.charAt(0).toUpperCase()
        const productCount = productCounts.get(unit.id) ?? 0

        return (
          <div className="card master-card" style={{ '--c': color } as CSSProperties} key={unit.id}>
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
                  title="Edit unit"
                  onClick={() => onEdit(unit)}
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
                  title="Delete unit"
                  onClick={() => onDelete(unit)}
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
              <h3 className="master-name" title={unit.name}>
                {unit.name}
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
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="M3.27 6.96 12 12.01l8.73-5.05" />
                  <path d="M12 22.08V12" />
                </svg>
                <span className="master-stat-label">Products using this unit</span>
              </div>
            </div>
          </div>
        )
      })}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={UNITS_PER_PAGE}
        onPageChange={setPage}
      />
      </div>
    </div>
  )
}