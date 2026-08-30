import { useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import {
  categoryStorage,
  movementStorage,
  productStorage,
  stockLocationStorage,
} from '../../storage'
import { formatNumber } from '../../utils/format'
import type { MovementType } from '../../types/models'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
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
      </div>

      <div className="card inventory-card">
        <div className="movement-filters">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search by product or category…"
            className="input inventory-search"
          />
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as 'all' | MovementType)
              setPage(1)
            }}
            className="input movement-filter-select"
          >
            <option value="all">All types</option>
            <option value="transfer-in">Transfer In</option>
            <option value="transfer-out">Transfer Out</option>
            <option value="inbound">Inbound</option>
          </select>
          <select
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value)
              setPage(1)
            }}
            className="input movement-filter-select"
          >
            <option value="all">All locations</option>
            {locations.items.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No movements found"
            message="Stock movements appear here when stock is received or transferred between locations."
          />
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