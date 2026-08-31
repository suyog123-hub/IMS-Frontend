import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
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
import {
  validateSale,
  type SaleFormErrors,
  type SaleFormValues,
} from '../../utils/validation'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'
import { MovementRow } from '../common/MovementRow'
import { Field } from '../common/Field'
import { toastError, toastSuccess } from '../../utils/toast'

const SALES_PER_PAGE = 6

export function SalesPage() {
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)

  const [values, setValues] = useState<SaleFormValues>({
    productId: '',
    locationId: '',
    quantity: '',
    reference: '',
  })
  const [errors, setErrors] = useState<SaleFormErrors>({})

  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)

  const saleRecords = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.type === 'sale')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements.items]
  )

  const available = useMemo(() => {
    if (!values.productId || !values.locationId) return null
    return (
      inventory.items.find(
        (item) => item.productId === values.productId && item.locationId === values.locationId
      )?.quantity ?? 0
    )
  }, [values.productId, values.locationId, inventory.items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const locById = new Map(locations.items.map((location) => [location.id, location]))
    return saleRecords.filter((movement) => {
      if (channel !== 'all') {
        const loc = locById.get(movement.fromLocationId ?? '')
        if (!loc || locationChannel(loc) !== channel) return false
      }
      const product = products.items.find((item) => item.id === movement.productId)
      if (categoryId !== 'all' && product?.categoryId !== categoryId) return false
      if (!q) return true
      const categoryName =
        categories.items.find((category) => category.id === product?.categoryId)?.name ?? ''
      const reference = movement.reference ?? ''
      return (
        (product?.name ?? '').toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        reference.toLowerCase().includes(q)
      )
    })
  }, [saleRecords, query, channel, categoryId, locations.items, products.items, categories.items])

  const totalUnitsSold = saleRecords.reduce((sum, movement) => sum + movement.quantity, 0)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const soldToday = saleRecords
    .filter((movement) => new Date(movement.createdAt).getTime() >= startOfToday.getTime())
    .reduce((sum, movement) => sum + movement.quantity, 0)

  const productName = products.items.find((product) => product.id === values.productId)?.name
  const locationName = locations.items.find((location) => location.id === values.locationId)?.name

  const updateValues = (patch: Partial<SaleFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    const cleared: SaleFormErrors = {}
    for (const key of Object.keys(patch)) {
      cleared[key as keyof SaleFormErrors] = undefined
    }
    setErrors((current) => ({ ...current, ...cleared }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateSale(values, products.items, locations.items, available)
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      toastError('Please fix the highlighted fields before recording the sale.')
      return
    }

    const quantity = toNumber(values.quantity) ?? 0
    const result = recordSale(values.productId, values.locationId, quantity, values.reference)
    if (!result.ok) {
      setErrors((current) => ({ ...current, quantity: result.error }))
      toastError(result.error ?? 'Could not record the sale. Please try again.')
      return
    }

    inventory.refresh()
    movements.refresh()
    toastSuccess(
      `Sold ${formatNumber(quantity)} of "${productName}"${locationName ? ` at ${locationName}` : ''}.`
    )
    setValues((current) => ({ ...current, quantity: '', reference: '' }))
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / SALES_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * SALES_PER_PAGE
  const visibleSales = filtered.slice(startIndex, startIndex + SALES_PER_PAGE)

  return (
    <section>
      <div className="page-header">
        <h1>Record Sales</h1>
        <p>Log stock sold at any storefront, pop-up, or online channel. Every sale reduces stock.</p>
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
        <form className="form form-grid" onSubmit={handleSubmit} noValidate>
          <Field label="Product" error={errors.productId} className="field-span-2">
            <select
              value={values.productId}
              onChange={(event) => updateValues({ productId: event.target.value })}
              className="input"
            >
              <option value="">Select product…</option>
              {products.items
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field
            label="Location"
            error={errors.locationId}
            hint={available !== null ? `${formatNumber(available)} available here` : undefined}
            className="field-span-2"
          >
            <select
              value={values.locationId}
              onChange={(event) => updateValues({ locationId: event.target.value })}
              className="input"
            >
              <option value="">Select where it sold…</option>
              {locations.items.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} — {CHANNEL_LABELS[locationChannel(location)]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantity" error={errors.quantity} hint="Whole units only.">
            <input
              type="number"
              min="1"
              step="1"
              value={values.quantity}
              onChange={(event) => updateValues({ quantity: event.target.value })}
              placeholder="e.g. 4"
              className="input"
            />
          </Field>

          <Field label="Order / Receipt Ref" error={errors.reference} hint="Optional, e.g. Shopee order ID">
            <input
              type="text"
              value={values.reference}
              onChange={(event) => updateValues({ reference: event.target.value })}
              placeholder="e.g. SH-2024-01"
              className="input"
            />
          </Field>

          <div className="form-actions form-actions-span">
            <button type="submit" className="btn btn-primary">
              Record Sale
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
                value: channel,
                options: [
                  { value: 'all', label: 'All' },
                  ...CHANNEL_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                    color: CHANNEL_COLORS[option.value],
                  })),
                ],
                onChange: (value) => {
                  setChannel(value)
                  setPage(1)
                },
              },
              {
                label: 'Category',
                kind: 'category',
                value: categoryId,
                options: [
                  { value: 'all', label: 'All' },
                  ...categories.items.map((category) => ({
                    value: category.id,
                    label: category.name,
                    color: nameColor(category.name),
                  })),
                ],
                onChange: (value) => {
                  setCategoryId(value)
                  setPage(1)
                },
              },
            ]}
            onReset={() => {
              setChannel('all')
              setCategoryId('all')
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