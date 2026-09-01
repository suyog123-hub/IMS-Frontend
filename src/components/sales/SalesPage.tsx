import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  productVariantStorage,
  recordSale,
  stockLocationStorage,
} from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { toNumber } from '../../utils/numbers'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import {
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  CHANNEL_OPTIONS,
  locationChannel,
} from '../../utils/channels'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'
import { MovementRow } from '../common/MovementRow'
import { Field } from '../common/Field'
import { AppImage } from '../common/AppImage'
import { toastError, toastSuccess } from '../../utils/toast'

interface SaleItemDraft {
  key: string
  selectedId: string
  quantity: string
}

function newSaleItemDraft(): SaleItemDraft {
  return {
    key: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    selectedId: '',
    quantity: '',
  }
}

const SALES_PER_PAGE = 6

export function SalesPage() {
  const products = useCollection(productStorage)
  const productVariants = useCollection(productVariantStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)

  const [locationId, setLocationId] = useState('')
  const [reference, setReference] = useState('')
  const [itemDrafts, setItemDrafts] = useState<SaleItemDraft[]>([newSaleItemDraft()])
  const [errors, setErrors] = useState<{
    locationId?: string
    items?: Record<string, { selectedId?: string; quantity?: string }>
  }>({})
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [categoryIdFilter, setCategoryIdFilter] = useState('all')
  const [page, setPage] = useState(1)

  const variantOptions = useMemo(() => {
    const options: Array<{
      id: string
      variantId?: string
      productId: string
      name: string
      label: string
      image?: string
      productImage?: string
    }> = []

    for (const product of products.items) {
      const list = productVariantStorage.getByProduct(product.id)
      if (list.length > 0) {
        for (const variant of list) {
          const details = [
            variant.size ? `Size: ${variant.size}` : '',
            variant.color ? `Color: ${variant.color}` : '',
          ]
            .filter(Boolean)
            .join(', ')

          options.push({
            id: variant.id,
            variantId: variant.id,
            productId: product.id,
            name: variant.name,
            label: `${variant.name} (${product.name}${details ? ` — ${details}` : ''})`,
            image: variant.image,
            productImage: product.image,
          })
        }
      } else {
        options.push({
          id: product.id,
          productId: product.id,
          name: product.name,
          label: `${product.name} (Standard)`,
          productImage: product.image,
        })
      }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [products.items, productVariants.items])

  const getAvailableStock = (selectedId: string, locId: string): number => {
    if (!selectedId || !locId) return 0
    const opt = variantOptions.find((o) => o.id === selectedId)
    if (!opt) return 0

    if (opt.variantId) {
      const variant = productVariantStorage.getById(opt.variantId)
      if (!variant) return 0
      return variant.quantity
    } else {
      const mainRecord = inventory.items.find(
        (r) => r.productId === opt.productId && r.locationId === locId
      )
      return mainRecord ? mainRecord.quantity : 0
    }
  }

  const addItemRow = () => {
    setItemDrafts((current) => [...current, newSaleItemDraft()])
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, 60)
  }

  const removeItemRow = (key: string) => {
    if (itemDrafts.length <= 1) return
    setItemDrafts((current) => current.filter((item) => item.key !== key))
  }

  const updateItemRow = (key: string, patch: Partial<SaleItemDraft>) => {
    setItemDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
    setErrors((prev) => {
      if (!prev.items?.[key]) return prev
      const { [key]: _cleared, ...restItems } = prev.items
      return { ...prev, items: restItems }
    })
  }

  const saleRecords = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.type === 'sale')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements.items]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const locById = new Map(locations.items.map((location) => [location.id, location]))
    return saleRecords.filter((movement) => {
      if (channelFilter !== 'all') {
        const loc = locById.get(movement.fromLocationId ?? '')
        if (!loc || locationChannel(loc) !== channelFilter) return false
      }
      const product = products.items.find((item) => item.id === movement.productId)
      if (categoryIdFilter !== 'all' && product?.categoryId !== categoryIdFilter) return false
      if (!q) return true
      const categoryName =
        categories.items.find((category) => category.id === product?.categoryId)?.name ?? ''
      const refStr = movement.reference ?? ''
      return (
        (product?.name ?? '').toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        refStr.toLowerCase().includes(q)
      )
    })
  }, [saleRecords, query, channelFilter, categoryIdFilter, locations.items, products.items, categories.items])

  const totalUnitsSold = saleRecords.reduce((sum, movement) => sum + movement.quantity, 0)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const soldToday = saleRecords
    .filter((movement) => new Date(movement.createdAt).getTime() >= startOfToday.getTime())
    .reduce((sum, movement) => sum + movement.quantity, 0)

  const locationName = locations.items.find((location) => location.id === locationId)?.name

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const newErrors: {
      locationId?: string
      items: Record<string, { selectedId?: string; quantity?: string }>
    } = { items: {} }

    if (!locationId) {
      newErrors.locationId = 'Please select a sales location.'
    }

    let hasItemError = false

    for (const item of itemDrafts) {
      const itemErr: { selectedId?: string; quantity?: string } = {}
      if (!item.selectedId) {
        itemErr.selectedId = 'Please select a variant.'
        hasItemError = true
      }
      const qty = toNumber(item.quantity)
      const avail = getAvailableStock(item.selectedId, locationId)

      if (qty === null || !Number.isInteger(qty) || qty <= 0) {
        itemErr.quantity = 'Quantity must be a positive whole number.'
        hasItemError = true
      } else if (qty > avail) {
        itemErr.quantity = `Cannot sell more than available stock (${formatNumber(avail)} available).`
        hasItemError = true
      }

      if (itemErr.selectedId || itemErr.quantity) {
        newErrors.items[item.key] = itemErr
      }
    }

    if (newErrors.locationId || hasItemError) {
      setErrors(newErrors)
      toastError('Please fix highlighted fields before recording the sale.')
      return
    }

    let successCount = 0
    for (const item of itemDrafts) {
      const opt = variantOptions.find((o) => o.id === item.selectedId)
      if (!opt) continue
      const qty = toNumber(item.quantity) ?? 0

      const res = recordSale(opt.productId, locationId, qty, reference, opt.variantId)
      if (res.ok) {
        successCount++
      }
    }

    if (successCount > 0) {
      inventory.refresh()
      movements.refresh()
      productVariants.refresh()
      toastSuccess(
        `Successfully recorded sale for ${successCount} variant item${successCount > 1 ? 's' : ''}${locationName ? ` at ${locationName}` : ''}.`
      )
      setItemDrafts([newSaleItemDraft()])
      setReference('')
      setErrors({})
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / SALES_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * SALES_PER_PAGE
  const visibleSales = filtered.slice(startIndex, startIndex + SALES_PER_PAGE)

  return (
    <section>
      <div className="page-header">
        <h1>Record Sales</h1>
        <p>Log stock sold at any storefront, pop-up, or online channel. Every sale reduces variant stock.</p>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(totalUnitsSold)}</span>
          <span className="inventory-stat-label">Total units sold</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(saleRecords.length)}</span>
          <span className="inventory-stat-label">Sale entries</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(soldToday)}</span>
          <span className="inventory-stat-label">Sold today</span>
        </div>
      </div>

      <div className="card">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field
              label="Sales Location / Channel"
              error={errors.locationId}
            >
              <select
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value)
                  setErrors((prev) => ({ ...prev, locationId: undefined }))
                }}
                className="input"
              >
                <option value="">Select location where sold…</option>
                {locations.items.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} — {CHANNEL_LABELS[locationChannel(loc)]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Order / Receipt Ref" hint="Optional, e.g. Order #1042">
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. POS-2024-001"
                className="input"
              />
            </Field>
          </div>

          <div className="sale-items-section" style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                Sale Items ({itemDrafts.length})
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addItemRow}
              >
                + Add Another Variant
              </button>
            </div>

            <div
              className="sale-items-list"
              ref={listRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '6px',
                paddingBottom: '4px',
              }}
            >
              {itemDrafts.map((item, idx) => {
                const selectedOpt = variantOptions.find((o) => o.id === item.selectedId)
                const availableStock = locationId
                  ? getAvailableStock(item.selectedId, locationId)
                  : 0
                const itemErr = errors.items?.[item.key] ?? {}
                const imageSrc = selectedOpt?.image || selectedOpt?.productImage

                return (
                  <div
                    key={item.key}
                    className="card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px minmax(200px, 1.8fr) minmax(110px, 1fr) minmax(120px, 1.2fr) auto',
                      gap: '12px',
                      alignItems: 'start',
                      padding: '14px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ paddingTop: '24px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'var(--surface-muted)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          fontWeight: 700,
                          color: 'var(--primary)',
                        }}
                      >
                        {imageSrc ? (
                          <AppImage src={imageSrc} alt={selectedOpt?.name || 'Variant'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{(selectedOpt?.name || 'V').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    <Field label={`Variant Item #${idx + 1}`} error={itemErr.selectedId}>
                      <select
                        value={item.selectedId}
                        onChange={(e) => updateItemRow(item.key, { selectedId: e.target.value })}
                        className="input"
                      >
                        <option value="">Select product variant…</option>
                        {variantOptions.map((opt) => {
                          const optAvail = locationId
                            ? getAvailableStock(opt.id, locationId)
                            : null
                          return (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} {optAvail !== null ? `(${optAvail} avail)` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </Field>

                    <Field label="Available Stock">
                      <input
                        type="text"
                        readOnly
                        value={
                          locationId && item.selectedId
                            ? `${formatNumber(availableStock)} units`
                            : '—'
                        }
                        className="input"
                        style={{
                          background: 'var(--surface-muted)',
                          fontWeight: 600,
                          color: availableStock > 0 ? '#10b981' : '#ef4444',
                        }}
                      />
                    </Field>

                    <Field label="Quantity Sold" error={itemErr.quantity}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(item.key, { quantity: e.target.value })}
                        placeholder="e.g. 2"
                        className="input"
                      />
                    </Field>

                    <div style={{ paddingTop: '24px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-outline"
                        disabled={itemDrafts.length <= 1}
                        onClick={() => removeItemRow(item.key)}
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">
              Record Sale ({itemDrafts.length} {itemDrafts.length === 1 ? 'item' : 'items'})
            </button>
          </div>
        </form>
      </div>

      <div className="page-subheader">
        <h2>Recent Sales</h2>
        <Link to="/movements" className="btn">
          View All Movements
        </Link>
      </div>

      {saleRecords.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sales yet"
            message="Record a sale above to keep stock in sync with what actually left your channels."
          />
        </div>
      ) : (
        <div className="products-layout">
          <QuickFilterPanel
            groups={[
              {
                label: 'Channel',
                kind: 'location',
                value: channelFilter,
                options: [
                  { value: 'all', label: 'All' },
                  ...CHANNEL_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                    color: CHANNEL_COLORS[option.value],
                  })),
                ],
                onChange: (value) => {
                  setChannelFilter(value)
                  setPage(1)
                },
              },
              {
                label: 'Category',
                kind: 'category',
                value: categoryIdFilter,
                options: [
                  { value: 'all', label: 'All' },
                  ...categories.items.map((category) => ({
                    value: category.id,
                    label: category.name,
                    color: nameColor(category.name),
                  })),
                ],
                onChange: (value) => {
                  setCategoryIdFilter(value)
                  setPage(1)
                },
              },
            ]}
            onReset={() => {
              setChannelFilter('all')
              setCategoryIdFilter('all')
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
                  placeholder="Search by product, category, or reference…"
                  className="input products-search"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="card">
                <EmptyState title="No matching sales" message="Try a different search or filter." />
              </div>
            ) : (
              <ul className="movement-card-grid">
                {visibleSales.map((movement) => (
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
      )}

      {saleRecords.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={SALES_PER_PAGE}
          onPageChange={setPage}
        />
      )}
    </section>
  )
}