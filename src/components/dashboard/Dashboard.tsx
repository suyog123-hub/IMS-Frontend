import { useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  productVariantStorage,
  stockLocationStorage,
  unitStorage,
} from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { formatCurrency, formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import {
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  locationChannel,
} from '../../utils/channels'
import type { Inventory, LocationChannel, MovementType, ProductVariant, StockLocation, StockMovement } from '../../types/models'
import { MovementRow } from '../common/MovementRow'
import { AddStockModal, type RestockItem } from '../common/AddStockModal'

const LOW_STOCK_THRESHOLD = 5
const LOW_STOCK_SHOWN = 6
const RECENT_MOVEMENTS_SHOWN = 6

const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="19"
    height="19"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

const icons: Record<string, ReactElement> = {
  categories: icon(<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />),
  units: icon(<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />),
  products: icon(
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  quantity: icon(
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.27 6.96 12 12l8.73-5.05" />
      <path d="M12 22V12" />
    </>
  ),
  value: icon(
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </>
  ),
  lowStock: icon(
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
}

const MOVEMENT_MIX_COLORS: Record<MovementType, string> = {
  inbound: '#10b981',
  'transfer-in': '#6366f1',
  'transfer-out': '#f59e0b',
  sale: '#ef4444',
  'return-in': '#8b5cf6',
}

function computeVariantLocationBreakdown(
  productId: string,
  variantId: string | undefined,
  variantStock: number,
  locations: StockLocation[],
  inventoryItems: Inventory[],
  movements: StockMovement[]
): Array<{ locationId: string; locationName: string; quantity: number }> {
  if (!variantId) {
    return locations
      .map((loc) => ({
        locationId: loc.id,
        locationName: loc.name,
        quantity:
          inventoryItems.find((r) => r.productId === productId && r.locationId === loc.id)
            ?.quantity ?? 0,
      }))
      .filter((b) => b.quantity > 0)
  }

  const varMovements = movements.filter((m) => m.variantId === variantId)
  if (varMovements.length > 0) {
    const locMap = new Map<string, number>()
    for (const m of varMovements) {
      if (m.type === 'inbound' || m.type === 'transfer-in' || m.type === 'return-in') {
        if (m.toLocationId) locMap.set(m.toLocationId, (locMap.get(m.toLocationId) ?? 0) + m.quantity)
      }
      if (m.type === 'transfer-out' || m.type === 'sale') {
        if (m.fromLocationId) locMap.set(m.fromLocationId, (locMap.get(m.fromLocationId) ?? 0) - m.quantity)
      }
    }
    const list = locations
      .map((loc) => ({
        locationId: loc.id,
        locationName: loc.name,
        quantity: Math.max(0, locMap.get(loc.id) ?? 0),
      }))
      .filter((b) => b.quantity > 0)

    if (list.length > 0) return list
  }

  const productLocs = locations
    .map((loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      quantity:
        inventoryItems.find((r) => r.productId === productId && r.locationId === loc.id)
          ?.quantity ?? 0,
    }))
    .filter((b) => b.quantity > 0)

  const totalProductStock = productLocs.reduce((sum, b) => sum + b.quantity, 0)
  if (totalProductStock === 0) return []

  let remaining = variantStock
  const result: Array<{ locationId: string; locationName: string; quantity: number }> = []

  for (let i = 0; i < productLocs.length; i++) {
    const loc = productLocs[i]
    if (i === productLocs.length - 1) {
      if (remaining > 0) {
        result.push({ locationId: loc.locationId, locationName: loc.locationName, quantity: remaining })
      }
    } else {
      const allocated = Math.min(
        remaining,
        Math.round(variantStock * (loc.quantity / totalProductStock))
      )
      if (allocated > 0) {
        result.push({ locationId: loc.locationId, locationName: loc.locationName, quantity: allocated })
        remaining -= allocated
      }
    }
  }

  return result
}

function withinDays(iso: string, days: number): boolean {
  const then = new Date(iso).getTime()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return then >= cutoff
}

export function Dashboard() {
  const products = useCollection(productStorage)
  const variants = useCollection(productVariantStorage)
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

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariant[]>()
    for (const variant of variants.items) {
      const list = map.get(variant.productId) ?? []
      list.push(variant)
      map.set(variant.productId, list)
    }
    return map
  }, [variants.items])

  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const record of inventory.items) {
      map.set(record.productId, (map.get(record.productId) ?? 0) + record.quantity)
    }
    return map
  }, [inventory.items])

  const totalQuantity = useMemo(() => {
    let total = 0
    for (const product of products.items) {
      const pVariants = variantsByProduct.get(product.id) ?? []
      if (pVariants.length > 0) {
        total += pVariants.reduce((sum, v) => sum + v.quantity, 0)
      } else {
        total += stockByProduct.get(product.id) ?? 0
      }
    }
    return total
  }, [products.items, variantsByProduct, stockByProduct])

  const inventoryValue = useMemo(() => {
    let total = 0
    for (const product of products.items) {
      const pVariants = variantsByProduct.get(product.id) ?? []
      if (pVariants.length > 0) {
        total += pVariants.reduce((sum, v) => sum + v.costPrice * v.quantity, 0)
      } else {
        total += product.costPrice * (stockByProduct.get(product.id) ?? 0)
      }
    }
    return total
  }, [products.items, variantsByProduct, stockByProduct])

  const lowStock = useMemo(() => {
    const list: Array<{
      id: string
      product: { id: string; name: string; image?: string }
      categoryName: string
      stock: number
      productId: string
      variantId?: string
      locationBreakdown: Array<{ locationId: string; locationName: string; quantity: number }>
    }> = []

    for (const product of products.items) {
      const pVariants = variantsByProduct.get(product.id) ?? []
      if (pVariants.length > 0) {
        for (const variant of pVariants) {
          if (variant.quantity < LOW_STOCK_THRESHOLD) {
            const details = [
              variant.size ? `Size: ${variant.size}` : '',
              variant.color ? `Color: ${variant.color}` : '',
            ]
              .filter(Boolean)
              .join(' | ')

            const breakdown = computeVariantLocationBreakdown(
              product.id,
              variant.id,
              variant.quantity,
              locations.items,
              inventory.items,
              movements.items
            )

            list.push({
              id: variant.id,
              product: {
                id: product.id,
                name: `${variant.name} (${product.name}${details ? ` — ${details}` : ''})`,
                image: variant.image || product.image,
              },
              categoryName: categoryNames.get(product.categoryId) ?? 'Uncategorized',
              stock: variant.quantity,
              productId: product.id,
              variantId: variant.id,
              locationBreakdown: breakdown,
            })
          }
        }
      } else {
        const stock = stockByProduct.get(product.id) ?? 0
        if (stock < LOW_STOCK_THRESHOLD) {
          const breakdown = computeVariantLocationBreakdown(
            product.id,
            undefined,
            stock,
            locations.items,
            inventory.items,
            movements.items
          )

          list.push({
            id: product.id,
            product: { id: product.id, name: product.name, image: product.image },
            categoryName: categoryNames.get(product.categoryId) ?? 'Uncategorized',
            stock,
            productId: product.id,
            locationBreakdown: breakdown,
          })
        }
      }
    }

    return list.sort((a, b) => a.stock - b.stock)
  }, [products.items, variantsByProduct, stockByProduct, categoryNames, locations.items, inventory.items, movements.items])

  const [showLowStockDetails, setShowLowStockDetails] = useState(true)
  const [restockItem, setRestockItem] = useState<RestockItem | null>(null)
  const lowStockShown = lowStock.slice(0, LOW_STOCK_SHOWN)

  const addedThisWeek = products.items.filter((product) => withinDays(product.createdAt, 7)).length
  const categoriesInUse = [...categoryNames.keys()].filter((id) =>
    products.items.some((product) => product.categoryId === id)
  ).length
  const unitsInUse = products.items.reduce((set, product) => set.add(product.unitId), new Set<string>())
    .size

  const movementActivity = useMemo(() => {
    const totals = new Map<string, number>()
    for (const movement of movements.items) {
      const key = new Date(movement.createdAt).toDateString()
      totals.set(key, (totals.get(key) ?? 0) + movement.quantity)
    }
    const days: Array<{ key: string; label: string; value: number }> = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toDateString()
      days.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        value: totals.get(key) ?? 0,
      })
    }
    const max = Math.max(...days.map((day) => day.value), 1)
    return days.map((day) => ({ ...day, pct: Math.round((day.value / max) * 100) }))
  }, [movements.items])

  const movedThisWeek = movementActivity.reduce((sum, day) => sum + day.value, 0)

  const stockByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const product of products.items) {
      const stock = stockByProduct.get(product.id) ?? 0
      if (stock <= 0) continue
      totals.set(product.categoryId, (totals.get(product.categoryId) ?? 0) + stock)
    }
    const totalStock = [...totals.values()].reduce((sum, stock) => sum + stock, 0)
    const rows = [...totals.entries()]
      .map(([categoryId, stock]) => ({
        categoryId,
        stock,
        name: categoryNames.get(categoryId) ?? 'Uncategorized',
        color: nameColor(categoryNames.get(categoryId) ?? 'Uncategorized'),
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 6)
      .map((row) => ({
        ...row,
        pct: totalStock > 0 ? Math.round((row.stock / totalStock) * 1000) / 10 : 0,
      }))
    return { rows, totalStock }
  }, [products.items, stockByProduct, categoryNames])

  const recentMovements = useMemo(() => {
    return movements.items
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_MOVEMENTS_SHOWN)
  }, [movements.items])

  const channelOverview = useMemo(() => {
    const acc = new Map<LocationChannel, { units: number; products: Set<string> }>()
    for (const location of locations.items) {
      const channel = locationChannel(location)
      for (const record of inventory.items) {
        if (record.locationId !== location.id) continue
        const entry = acc.get(channel) ?? { units: 0, products: new Set<string>() }
        entry.units += record.quantity
        entry.products.add(record.productId)
        acc.set(channel, entry)
      }
    }
    const rows = [...acc.entries()]
      .map(([channel, data]) => ({
        channel,
        label: CHANNEL_LABELS[channel],
        color: CHANNEL_COLORS[channel],
        units: data.units,
        products: data.products.size,
      }))
      .sort((a, b) => b.units - a.units)
    const totalUnits = rows.reduce((sum, row) => sum + row.units, 0)
    return rows.map((row) => ({
      ...row,
      pct: totalUnits > 0 ? Math.round((row.units / totalUnits) * 1000) / 10 : 0,
    }))
  }, [locations.items, inventory.items])

  const salesReturns = useMemo(() => {
    const soldByDay = new Map<string, number>()
    const returnedByDay = new Map<string, number>()
    for (const movement of movements.items) {
      const key = new Date(movement.createdAt).toDateString()
      if (movement.type === 'sale') {
        soldByDay.set(key, (soldByDay.get(key) ?? 0) + movement.quantity)
      } else if (movement.type === 'return-in') {
        returnedByDay.set(key, (returnedByDay.get(key) ?? 0) + movement.quantity)
      }
    }
    const days: Array<{
      key: string
      label: string
      sold: number
      returned: number
      total: number
      soldPct: number
      returnPct: number
    }> = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toDateString()
      const sold = soldByDay.get(key) ?? 0
      const returned = returnedByDay.get(key) ?? 0
      days.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        sold,
        returned,
        total: sold + returned,
        soldPct: 0,
        returnPct: 0,
      })
    }
    const max = Math.max(...days.map((day) => day.total), 1)
    return days.map((day) => ({
      ...day,
      soldPct: Math.round((day.sold / max) * 100),
      returnPct: Math.round((day.returned / max) * 100),
    }))
  }, [movements.items])
  const hasSalesActivity = salesReturns.some((day) => day.total > 0)

  const topSellers = useMemo(() => {
    const soldByProduct = new Map<string, number>()
    for (const movement of movements.items) {
      if (movement.type !== 'sale') continue
      soldByProduct.set(
        movement.productId,
        (soldByProduct.get(movement.productId) ?? 0) + movement.quantity
      )
    }
    const rows = [...soldByProduct.entries()]
      .map(([productId, qty]) => {
        const product = products.items.find((item) => item.id === productId)
        const categoryName = categoryNames.get(product?.categoryId ?? '') ?? 'Uncategorized'
        return {
          productId,
          name: product?.name ?? 'Unknown product',
          qty,
          color: nameColor(categoryName),
        }
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    const max = Math.max(...rows.map((row) => row.qty), 1)
    return rows.map((row) => ({ ...row, pct: Math.round((row.qty / max) * 100) }))
  }, [movements.items, products.items, categoryNames])

  const movementMix = useMemo(() => {
    const counts: Array<{ type: MovementType; label: string; color: string; count: number }> = [
      { type: 'inbound', label: 'Inbound', color: MOVEMENT_MIX_COLORS.inbound, count: 0 },
      { type: 'transfer-in', label: 'Transfer In', color: MOVEMENT_MIX_COLORS['transfer-in'], count: 0 },
      { type: 'transfer-out', label: 'Transfer Out', color: MOVEMENT_MIX_COLORS['transfer-out'], count: 0 },
      { type: 'sale', label: 'Sold', color: MOVEMENT_MIX_COLORS.sale, count: 0 },
      { type: 'return-in', label: 'Return', color: MOVEMENT_MIX_COLORS['return-in'], count: 0 },
    ]
    for (const movement of movements.items) {
      if (!withinDays(movement.createdAt, 30)) continue
      const row = counts.find((entry) => entry.type === movement.type)
      if (row) row.count += movement.quantity
    }
    const rows = counts.filter((entry) => entry.count > 0)
    const total = rows.reduce((sum, row) => sum + row.count, 0)
    return { rows, total }
  }, [movements.items])

  const movementMixSegments = useMemo(() => {
    const perim = 2 * Math.PI * 50
    const parts: Array<{ row: (typeof movementMix.rows)[number]; start: number }> = []
    let start = 0
    for (const row of movementMix.rows) {
      parts.push({ row, start })
      start += (row.count / movementMix.total) * perim
    }
    return parts.map(({ row, start: offset }) => {
      const length = (row.count / movementMix.total) * perim
      return (
        <circle
          key={row.type}
          cx="60"
          cy="60"
          r="50"
          fill="none"
          strokeWidth="16"
          stroke={row.color}
          strokeDasharray={`${length} ${perim - length}`}
          strokeDashoffset={-offset}
          transform="rotate(-90 60 60)"
        />
      )
    })
  }, [movementMix])

  const valueByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const product of products.items) {
      const stock = stockByProduct.get(product.id) ?? 0
      if (stock <= 0) continue
      totals.set(product.categoryId, (totals.get(product.categoryId) ?? 0) + product.costPrice * stock)
    }
    const rows = [...totals.entries()]
      .map(([categoryId, value]) => ({
        categoryId,
        value,
        name: categoryNames.get(categoryId) ?? 'Uncategorized',
        color: nameColor(categoryNames.get(categoryId) ?? 'Uncategorized'),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0)
    return {
      rows: rows.map((row) => ({
        ...row,
        pct: totalValue > 0 ? Math.round((row.value / totalValue) * 1000) / 10 : 0,
      })),
      totalValue,
    }
  }, [products.items, stockByProduct, categoryNames])

  const cardsData = [
    {
      label: 'Total Categories',
      value: formatNumber(categories.items.length),
      to: '/categories',
      iconKey: 'categories',
      caption: `${categoriesInUse} used by products`,
    },
    {
      label: 'Total Units',
      value: formatNumber(units.items.length),
      to: '/units',
      iconKey: 'units',
      caption: `${unitsInUse} used by products`,
    },
    {
      label: 'Total Products',
      value: formatNumber(products.items.length),
      to: '/products',
      iconKey: 'products',
      caption: `${addedThisWeek} added this week`,
    },
    {
      label: 'Total Quantity',
      value: formatNumber(totalQuantity),
      to: '/inventory',
      iconKey: 'quantity',
      caption: `${formatNumber(movedThisWeek)} units moved this week`,
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(inventoryValue),
      to: '/inventory',
      iconKey: 'value',
      caption: 'valued at cost price',
    },
    {
      label: 'Low Stock',
      value: formatNumber(lowStock.length),
      to: '/inventory',
      iconKey: 'lowStock',
      caption: `below ${LOW_STOCK_THRESHOLD} units each`,
    },
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
            <span className="stat-icon">{icons[card.iconKey]}</span>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
            <span className="stat-delta">{card.caption}</span>
          </Link>
        ))}
      </div>

      <div className="dashboard-charts">
        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Movement Mix</h2>
            <span className="dashboard-chart-sub">Last 30 days · units moved</span>
          </div>
          {!movementMix.total ? (
            <p className="dashboard-empty">
              No stock movements in the last 30 days. Record movements to see the mix here.
            </p>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <svg viewBox="0 0 120 120" className="donut-svg">
                  {movementMixSegments}
                </svg>
                <div className="donut-center">
                  <strong>{formatNumber(movementMix.total)}</strong>
                  <span>units</span>
                </div>
              </div>
              <div className="donut-legend">
                {movementMix.rows.map((row) => (
                  <span className="donut-legend-item" key={row.type}>
                    <span className="donut-legend-dot" style={{ '--c': row.color } as CSSProperties} />
                    {row.label}
                    <strong>{formatNumber(row.count)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Inventory Value by Category</h2>
            <span className="dashboard-chart-sub">{formatCurrency(valueByCategory.totalValue)} at cost</span>
          </div>
          {valueByCategory.totalValue === 0 ? (
            <p className="dashboard-empty">
              Stock products to see how inventory value is split across categories.
            </p>
          ) : (
            <div className="category-bars">
              {valueByCategory.rows.map((row) => (
                <div className="category-bar-row" key={row.categoryId}>
                  <span className="category-bar-label" title={row.name}>
                    {row.name}
                  </span>
                  <span className="category-bar-track">
                    <span
                      className="category-bar-fill"
                      style={{ width: `${row.pct}%`, '--c': row.color } as CSSProperties}
                    />
                  </span>
                  <span className="category-bar-value">
                    {formatCurrency(row.value)} · {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Movement Activity</h2>
            <span className="dashboard-chart-sub">Last 7 days</span>
          </div>
          {movedThisWeek === 0 ? (
            <p className="dashboard-empty">
              No movement yet. Receive or transfer stock to see activity here.
            </p>
          ) : (
            <div className="chart-bars">
              {movementActivity.map((day) => (
                <div className="chart-bar-wrap" key={day.key}>
                  <span className="chart-value">{formatNumber(day.value)}</span>
                  <span className="chart-bar" style={{ height: `${Math.max(7, day.pct)}%` }} />
                  <span className="chart-days">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Stock by Category</h2>
            <span className="dashboard-chart-sub">{formatNumber(stockByCategory.totalStock)} units</span>
          </div>
          {stockByCategory.totalStock === 0 ? (
            <p className="dashboard-empty">
              Stock products to see the distribution across categories.
            </p>
          ) : (
            <div className="category-bars">
              {stockByCategory.rows.map((row) => (
                <div className="category-bar-row" key={row.categoryId}>
                  <span className="category-bar-label" title={row.name}>
                    {row.name}
                  </span>
                  <span className="category-bar-track">
                    <span
                      className="category-bar-fill"
                      style={{ width: `${row.pct}%`, '--c': row.color } as CSSProperties}
                    />
                  </span>
                  <span className="category-bar-value">
                    {formatNumber(row.stock)} · {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Sales vs Returns</h2>
            <span className="dashboard-chart-sub">Last 7 days</span>
          </div>
          {!hasSalesActivity ? (
            <p className="dashboard-empty">
              Record sales or returns to see the daily sold vs returned trend here.
            </p>
          ) : (
            <div className="chart-grouped">
              <div className="grouped-bars">
                {salesReturns.map((day) => (
                  <div className="chart-groupday" key={day.key}>
                    <span className="chart-value">{formatNumber(day.total)}</span>
                    <div className="chart-group-bars">
                      <span
                        className="chart-bar chart-bar-sale"
                        style={{ height: `${Math.max(day.sold > 0 ? 6 : 2, day.soldPct)}%` }}
                        title={`Sold: ${formatNumber(day.sold)}`}
                      />
                      <span
                        className="chart-bar chart-bar-return"
                        style={{ height: `${Math.max(day.returned > 0 ? 6 : 2, day.returnPct)}%` }}
                        title={`Returned: ${formatNumber(day.returned)}`}
                      />
                    </div>
                    <span className="chart-days">{day.label}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span className="chart-legend-item">
                  <span className="chart-legend-dot" style={{ background: '#ef4444' }} />
                  Sold
                </span>
                <span className="chart-legend-item">
                  <span className="chart-legend-dot" style={{ background: '#8b5cf6' }} />
                  Returned
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="card dashboard-chart-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Top Selling Products</h2>
            <span className="dashboard-chart-sub">By units sold</span>
          </div>
          {topSellers.length === 0 ? (
            <p className="dashboard-empty">
              No sales recorded yet. Record a sale to see your best sellers here.
            </p>
          ) : (
            <div className="category-bars">
              {topSellers.map((row, index) => (
                <div className="category-bar-row" key={row.productId}>
                  <span className="category-bar-label" title={row.name}>
                    {index + 1}. {row.name}
                  </span>
                  <span className="category-bar-track">
                    <span
                      className="category-bar-fill"
                      style={{ width: `${row.pct}%`, '--c': row.color } as CSSProperties}
                    />
                  </span>
                  <span className="category-bar-value">{formatNumber(row.qty)} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Stock by Channel</h2>
          <Link to="/inventory" className="dashboard-section-link">
            View inventory
          </Link>
        </div>

        {channelOverview.length === 0 ? (
          <p className="dashboard-empty">
            No stock yet. Assign a channel to your stock locations to see stock per sales channel.
          </p>
        ) : (
          <div className="channel-overview">
            {channelOverview.map((row) => (
              <div key={row.channel} className="channel-row">
                <span className="channel-row-head">
                  <span className="channel-row-dot" style={{ '--c': row.color } as CSSProperties} />
                  <span>
                    <span className="channel-row-name">{row.label}</span>
                    <span className="channel-row-sub">{formatNumber(row.products)} products</span>
                  </span>
                </span>
                <span className="channel-row-track">
                  <span
                    className="channel-row-fill"
                    style={{ width: `${Math.max(2, row.pct)}%`, '--c': row.color } as CSSProperties}
                  />
                </span>
                <span className="channel-row-value">
                  <strong>{formatNumber(row.units)}</strong>
                  <span>units · {row.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card dashboard-section">
        <div className="dashboard-section-header" style={{ alignItems: 'center' }}>
          <h2 className="dashboard-section-title">Low Stock Alert</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowLowStockDetails((prev) => !prev)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              {showLowStockDetails ? 'Hide Details' : 'Show Details'}
            </button>
            <Link
              to="/transfers"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Transfer Stock
            </Link>
          </div>
        </div>

        {lowStockShown.length === 0 ? (
          <p className="dashboard-empty">
            All products are well stocked. New products added will appear here when their stock is
            running low.
          </p>
        ) : (
          <ul className="low-stock-list">
            {lowStockShown.map((row) => (
              <li key={row.id} className="low-stock-item" style={{ flexWrap: 'wrap', gap: '10px' }}>
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
                <span className="low-stock-body" style={{ flex: 1, minWidth: '200px' }}>
                  <span className="low-stock-name">{row.product.name}</span>
                  <span className="low-stock-meta">{row.categoryName}</span>

                  {showLowStockDetails && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {row.locationBreakdown.length > 0 ? (
                        row.locationBreakdown.map((loc) => (
                          <span
                            key={loc.locationId}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📍 {loc.locationName}: <strong>{formatNumber(loc.quantity)}</strong>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                          Out of stock across all locations
                        </span>
                      )}
                    </div>
                  )}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className={`low-stock-qty${row.stock === 0 ? ' low-stock-qty-danger' : ''}`}
                  >
                    {formatNumber(row.stock)} units
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      setRestockItem({
                        id: row.id,
                        name: row.product.name,
                        productId: row.productId,
                        variantId: row.variantId,
                        currentStock: row.stock,
                        image: row.product.image,
                      })
                    }
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                  >
                    + Add Stock
                  </button>
                </div>
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

      <AddStockModal
        open={Boolean(restockItem)}
        item={restockItem}
        onClose={() => setRestockItem(null)}
        onSuccess={() => {
          products.refresh()
          variants.refresh()
          inventory.refresh()
          movements.refresh()
        }}
      />
    </section>
  )
}