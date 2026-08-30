import { useMemo, useState, type CSSProperties } from 'react'
import type { StockLocation } from '../../types/models'
import { nameColor } from '../../utils/color'
import { formatNumber } from '../../utils/format'
import { EmptyState } from '../common/EmptyState'
import { ListToolbar } from '../common/ListToolbar'
import { Pagination } from '../common/Pagination'

interface StockLocationListProps {
  locations: StockLocation[]
  parentNames: ReadonlyMap<string, string>
  productCounts: ReadonlyMap<string, number>
  isMain: (location: StockLocation) => boolean
  onEdit: (location: StockLocation) => void
  onDelete: (location: StockLocation) => void
}

const LOCATIONS_PER_PAGE = 9

export function StockLocationList({
  locations,
  parentNames,
  productCounts,
  isMain,
  onEdit,
  onDelete,
}: StockLocationListProps) {
  const [query, setQuery] = useState('')
  const [parentId, setParentId] = useState('all')
  const [page, setPage] = useState(1)

  const parentOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: Array<{ value: string; label: string }> = []
    for (const location of locations) {
      if (!location.parentId || seen.has(location.parentId)) continue
      seen.add(location.parentId)
      options.push({ value: location.parentId, label: parentNames.get(location.parentId) ?? 'Unknown' })
    }
    return options
  }, [locations, parentNames])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return locations.filter((location) => {
      if (parentId === 'top' ? location.parentId !== null : parentId !== 'all' && location.parentId !== parentId) {
        return false
      }
      if (!q) return true
      const name = location.name.toLowerCase()
      const code = location.code.toLowerCase()
      const parent = location.parentId ? (parentNames.get(location.parentId) ?? '').toLowerCase() : ''
      return name.includes(q) || code.includes(q) || parent.includes(q)
    })
  }, [locations, query, parentId, parentNames])

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOCATIONS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * LOCATIONS_PER_PAGE
  const visibleLocations = filtered.slice(startIndex, startIndex + LOCATIONS_PER_PAGE)

  if (locations.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="No stock locations yet"
          message="New products are automatically stocked in the Main Warehouse."
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
          placeholder="Search by name, code, or parent…"
          filters={[
            {
              value: parentId,
              onChange: (value) => {
                setParentId(value)
                setPage(1)
              },
              options: [
                { value: 'all', label: 'All locations' },
                { value: 'top', label: 'Top level' },
                ...parentOptions,
              ],
            },
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState title="No matching locations" message="Try a different search or filter." />
        ) : (
          <div className="card-grid card-grid-inside">
        {visibleLocations.map((location) => {
          const color = nameColor(location.name || 'warehouse')
          const initial = (location.name || 'W').charAt(0).toUpperCase()
          const productCount = productCounts.get(location.id) ?? 0
          const main = isMain(location)

          return (
            <div className="card master-card" style={{ '--c': color } as CSSProperties} key={location.id}>
              <div className="master-cover">
                <span className="master-avatar">{initial}</span>
                <span className={`master-chip${productCount > 0 ? '' : ' master-chip-unused'}`}>
                  {main ? 'Main' : productCount > 0 ? 'In use' : 'Empty'}
                </span>
                <div className="master-actions">
                  <button
                    type="button"
                    className="master-action"
                    title="Edit location"
                    onClick={() => onEdit(location)}
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
                    title="Delete location"
                    onClick={() => onDelete(location)}
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
                <h3 className="master-name" title={location.name}>
                  {location.name}
                </h3>
                <div className="location-meta">
                  <span className="location-code">{location.code}</span>
                  {location.parentId ? (
                    <span className="location-parent" title="Parent location">
                      in {parentNames.get(location.parentId) ?? 'Unknown'}
                    </span>
                  ) : (
                    <span className="location-parent location-parent-none">top level</span>
                  )}
                </div>
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
                    <path d="m12 2-8 4.5 8 4.5 8-4.5L12 2Zm-8 9 8 4.5 8-4.5M4 15.5 12 20l8-4.5" />
                  </svg>
                  <span className="master-stat-label">Products stocked here</span>
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
        pageSize={LOCATIONS_PER_PAGE}
        onPageChange={setPage}
      />
    </>
  )
}