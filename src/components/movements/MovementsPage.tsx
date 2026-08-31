import { useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import {
  categoryStorage,
  movementStorage,
  productStorage,
  stockLocationStorage,
} from '../../storage'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import type { MovementType } from '../../types/models'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'
import { MovementRow } from '../common/MovementRow'

const MOVEMENTS_PER_PAGE = 10

export function MovementsPage() {
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const movements = useCollection(movementStorage)

  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | MovementType>('all')
  const [locationId, setLocationId] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const categoryNames = new Map<string, string>()
    for (const category of categories.items) categoryNames.set(category.id, category.name)

    const list = movements.items
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((movement) => type === 'all' || movement.type === type)
      .filter(
        (movement) =>
          locationId === 'all' ||
          movement.fromLocationId === locationId ||
          movement.toLocationId === locationId
      )

    if (!q) return list

    return list.filter((movement) => {
      const product = products.items.find((item) => item.id === movement.productId)
      const name = product?.name.toLowerCase() ?? ''
      const categoryName = categoryNames.get(product?.categoryId ?? '') ?? ''
      return name.includes(q) || categoryName.includes(q)
    })
  }, [movements.items, products.items, categories.items, query, type, locationId])

  const totalPages = Math.max(1, Math.ceil(filtered.length / MOVEMENTS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * MOVEMENTS_PER_PAGE
  const visible = filtered.slice(startIndex, startIndex + MOVEMENTS_PER_PAGE)

  const transferInCount = filtered.filter((movement) => movement.type === 'transfer-in').length
  const transferOutCount = filtered.filter((movement) => movement.type === 'transfer-out').length
  const inboundCount = filtered.filter((movement) => movement.type === 'inbound').length
  const saleCount = filtered.filter((movement) => movement.type === 'sale').length
  const returnCount = filtered.filter((movement) => movement.type === 'return-in').length

  return (
    <section>
      <div className="page-header">
        <h1>Stock Movements</h1>
        <p>Complete history of stock coming in and being moved between locations.</p>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(filtered.length)}</span>
          <span className="inventory-stat-label">Movements</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(transferInCount)}</span>
          <span className="inventory-stat-label">Transfer In</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(transferOutCount)}</span>
          <span className="inventory-stat-label">Transfer Out</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(inboundCount)}</span>
          <span className="inventory-stat-label">Inbound</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(saleCount)}</span>
          <span className="inventory-stat-label">Sold</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(returnCount)}</span>
          <span className="inventory-stat-label">Returns</span>
        </div>
      </div>

      <div className="products-layout">
        <QuickFilterPanel
          groups={[
            {
              label: 'Type',
              kind: 'type',
              value: type,
              options: [
                { value: 'all', label: 'All' },
                { value: 'inbound', label: 'Inbound', color: '#10b981' },
                { value: 'transfer-in', label: 'Transfer In', color: '#6366f1' },
                { value: 'transfer-out', label: 'Transfer Out', color: '#f59e0b' },
                { value: 'sale', label: 'Sold', color: '#ef4444' },
                { value: 'return-in', label: 'Return', color: '#8b5cf6' },
              ],
              onChange: (value) => {
                setType(value as 'all' | MovementType)
                setPage(1)
              },
            },
            {
              label: 'Location',
              kind: 'location',
              value: locationId,
              options: [
                { value: 'all', label: 'All' },
                ...locations.items.map((location) => ({
                  value: location.id,
                  label: location.name,
                  color: nameColor(location.name),
                })),
              ],
              onChange: (value) => {
                setLocationId(value)
                setPage(1)
              },
            },
          ]}
          onReset={() => {
            setType('all')
            setLocationId('all')
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
                placeholder="Search by product or category…"
                className="input products-search"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <EmptyState
                title="No movements found"
                message="Stock movements appear here when stock is received or transferred between locations."
              />
            </div>
          ) : (
            <ul className="movement-card-grid">
              {visible.map((movement) => (
                <MovementRow
                  key={movement.id}
                  movement={movement}
                  products={products.items}
                  categories={categories.items}
                  locations={locations.items}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={MOVEMENTS_PER_PAGE}
        onPageChange={setPage}
      />
    </section>
  )
}