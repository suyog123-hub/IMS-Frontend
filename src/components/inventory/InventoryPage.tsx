import { useMemo, useState } from 'react'
import type { Inventory, Product } from '../../types/models'
import { useCollection } from '../../hooks/useCollection'
import { inventoryStorage, categoryStorage, productStorage, stockLocationStorage } from '../../storage'
import { formatNumber } from '../../utils/format'
import { EmptyState } from '../common/EmptyState'
import { ListToolbar } from '../common/ListToolbar'
import { Pagination } from '../common/Pagination'
import { InventoryRow } from './InventoryRow'

const INVENTORY_PER_PAGE = 9

interface StockRow {
  product: Product
  categoryName: string
  records: Inventory[]
}

export function InventoryPage() {
  const { items: products } = useCollection(productStorage)
  const { items: locations } = useCollection(stockLocationStorage)
  const { items: inventory } = useCollection(inventoryStorage)
  const categories = useCollection(categoryStorage)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)

  const locationNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const location of locations) names.set(location.id, location.name)
    return names
  }, [locations])

  const categoryNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const category of categories.items) names.set(category.id, category.name)
    return names
  }, [categories.items])

  const rows = useMemo(() => {
    const byProduct = inventory.reduce((map, record) => {
      const list = map.get(record.productId) ?? []
      list.push(record)
      map.set(record.productId, list)
      return map
    }, new Map<string, Inventory[]>())

    const result: StockRow[] = products
      .map((product) => {
        const records = byProduct.get(product.id) ?? []
        return {
          product,
          categoryName: categoryNames.get(product.categoryId) ?? 'Uncategorized',
          records,
        }
      })
      .filter((row) => row.records.length > 0)

    const q = query.trim().toLowerCase()
    return result.filter((row) => {
      if (categoryId !== 'all' && row.product.categoryId !== categoryId) return false
      if (!q) return true
      return (
        row.product.name.toLowerCase().includes(q) || row.categoryName.toLowerCase().includes(q)
      )
    })
  }, [inventory, products, categoryNames, query, categoryId])

  const distinctProducts = rows.length
  const totalUnits = rows.reduce(
    (sum, row) => sum + row.records.reduce((n, record) => n + record.quantity, 0),
    0
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / INVENTORY_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * INVENTORY_PER_PAGE
  const visibleRows = rows.slice(startIndex, startIndex + INVENTORY_PER_PAGE)

  return (
    <section>
      <div className="page-header">
        <h1>Inventory</h1>
        <p>Click a product to see where its stock is stored.</p>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(distinctProducts)}</span>
          <span className="inventory-stat-label">Products in stock</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(totalUnits)}</span>
          <span className="inventory-stat-label">Total units</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(locations.length)}</span>
          <span className="inventory-stat-label">Stock locations</span>
        </div>
      </div>

<div className="card inventory-card">
          <ListToolbar
            query={query}
            onQueryChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search by product or category…"
            filters={[
              {
                value: categoryId,
                onChange: (value) => {
                  setCategoryId(value)
                  setPage(1)
                },
                options: [
                  { value: 'all', label: 'All categories' },
                  ...categories.items.map((category) => ({ value: category.id, label: category.name })),
                ],
              },
            ]}
          />

        {rows.length === 0 ? (
          <EmptyState
            title="No stock records"
            message="Products are automatically stocked in the Main Warehouse as soon as they are created."
          />
        ) : (
          <div className="inventory-card-grid">
            {visibleRows.map((row) => (
              <InventoryRow
                key={row.product.id}
                product={row.product}
                categoryName={row.categoryName}
                records={row.records}
                locationNames={locationNames}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={rows.length}
        pageSize={INVENTORY_PER_PAGE}
        onPageChange={setPage}
      />
    </section>
  )
}