import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  stockLocationStorage,
  unitStorage,
} from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { formatCurrency, formatNumber } from '../../utils/format'
import { MovementRow } from '../common/MovementRow'

const LOW_STOCK_THRESHOLD = 10
const LOW_STOCK_SHOWN = 6
const RECENT_MOVEMENTS_SHOWN = 6

export function Dashboard() {
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const units = useCollection(unitStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)
  const locations = useCollection(stockLocationStorage)

  const categoryNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const category of categories.items) names.set(category.id, category.name)
    return names
  }, [categories.items])

  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const record of inventory.items) {
      map.set(record.productId, (map.get(record.productId) ?? 0) + record.quantity)
    }
    return map
  }, [inventory.items])

  const lowStock = useMemo(() => {
    return products.items
      .map((product) => ({
        product: { id: product.id, name: product.name, image: product.image },
        categoryName: categoryNames.get(product.categoryId) ?? 'Uncategorized',
        stock: stockByProduct.get(product.id) ?? 0,
      }))
      .filter((row) => row.stock < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock)
  }, [products.items, categoryNames, stockByProduct])

  const lowStockShown = lowStock.slice(0, LOW_STOCK_SHOWN)
  const totalQuantity = [...stockByProduct.values()].reduce((sum, qty) => sum + qty, 0)
  const inventoryValue = products.items.reduce(
    (sum, product) => sum + product.costPrice * (stockByProduct.get(product.id) ?? 0),
    0
  )

  const recentMovements = useMemo(() => {
    return movements.items
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_MOVEMENTS_SHOWN)
  }, [movements.items])

  const cardsData = [
    { label: 'Total Categories', value: categories.items.length, to: '/categories' },
    { label: 'Total Units', value: units.items.length, to: '/units' },
    { label: 'Total Products', value: products.items.length, to: '/products' },
    { label: 'Total Quantity', value: formatNumber(totalQuantity), to: '/inventory' },
    { label: 'Inventory Value', value: formatCurrency(inventoryValue), to: '/inventory' },
    { label: 'Low Stock', value: lowStock.length, to: '/inventory' },
  ]

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your inventory.</p>
      </div>

      <div className="stat-grid">
        {cardsData.map((card) => (
          <Link key={card.label} to={card.to} className="stat-card">
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </Link>
        ))}
      </div>

      <div className="card dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Low Stock Alert</h2>
          <Link to="/inventory" className="dashboard-section-link">
            View inventory
          </Link>
        </div>

        {lowStockShown.length === 0 ? (
          <p className="dashboard-empty">
            All products are well stocked. New products added will appear here when their stock is
            running low.
          </p>
        ) : (
          <ul className="low-stock-list">
            {lowStockShown.map((row) => (
              <li key={row.product.id} className="low-stock-item">
                <span className="low-stock-avatar">
                  {row.product.image ? (
                    <img
                      src={row.product.image}
                      alt={row.product.name}
                      className="low-stock-avatar-img"
                    />
                  ) : (
                    row.product.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="low-stock-body">
                  <span className="low-stock-name">{row.product.name}</span>
                  <span className="low-stock-meta">{row.categoryName}</span>
                </span>
                <span
                  className={`low-stock-qty${row.stock === 0 ? ' low-stock-qty-danger' : ''}`}
                >
                  {formatNumber(row.stock)} units
                </span>
              </li>
            ))}
            {lowStock.length > LOW_STOCK_SHOWN && (
              <li className="low-stock-item">
                <span className="low-stock-meta">
                  ...and {formatNumber(lowStock.length - LOW_STOCK_SHOWN)} more product
                  {lowStock.length - LOW_STOCK_SHOWN === 1 ? '' : 's'}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="card dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Recent Movements</h2>
          <Link to="/movements" className="dashboard-section-link">
            View all
          </Link>
        </div>

        {recentMovements.length === 0 ? (
          <p className="dashboard-empty">
            No stock movements yet. Received stock and transfers between locations will show up here.
          </p>
        ) : (
          <ul className="movement-card-grid">
            {recentMovements.map((movement) => (
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

      <div className="card dashboard-hint">
        <h2 className="card-title">Getting started</h2>
        <p>
          Start with your <Link to="/categories">categories</Link>, then your{' '}
          <Link to="/units">units</Link>, then your <Link to="/products">products</Link>. Each
          product references a category and a unit, and the selling price is calculated automatically
          from the cost price and the discount percentage.
        </p>
      </div>
    </section>
  )
}