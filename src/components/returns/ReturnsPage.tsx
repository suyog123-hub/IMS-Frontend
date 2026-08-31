import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  recordReturn,
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
  RETURN_REASONS,
  validateReturn,
  type ReturnFormErrors,
  type ReturnFormValues,
} from '../../utils/validation'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'
import { MovementRow } from '../common/MovementRow'
import { Field } from '../common/Field'
import { toastError, toastSuccess } from '../../utils/toast'

const RETURNS_PER_PAGE = 6

export function ReturnsPage() {
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)

  const [values, setValues] = useState<ReturnFormValues>({
    productId: '',
    locationId: '',
    quantity: '',
    reference: '',
    reason: '',
  })
  const [errors, setErrors] = useState<ReturnFormErrors>({})

  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [page, setPage] = useState(1)

  const returnRecords = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.type === 'return-in')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements.items]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const locById = new Map(locations.items.map((location) => [location.id, location]))
    return returnRecords.filter((movement) => {
      if (channel !== 'all') {
        const loc = locById.get(movement.toLocationId ?? '')
        if (!loc || locationChannel(loc) !== channel) return false
      }
      const product = products.items.find((item) => item.id === movement.productId)
      if (catFilter !== 'all' && product?.categoryId !== catFilter) return false
      if (!q) return true
      const categoryName =
        categories.items.find((category) => category.id === product?.categoryId)?.name ?? ''
      const reference = movement.reference ?? ''
      const reason = movement.reason ?? ''
      return (
        (product?.name ?? '').toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        reference.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q)
      )
    })
  }, [returnRecords, query, channel, catFilter, locations.items, products.items, categories.items])

  const totalUnitsReturned = returnRecords.reduce((sum, movement) => sum + movement.quantity, 0)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const returnedToday = returnRecords
    .filter((movement) => new Date(movement.createdAt).getTime() >= startOfToday.getTime())
    .reduce((sum, movement) => sum + movement.quantity, 0)

  const productName = products.items.find((product) => product.id === values.productId)?.name
  const locationName = locations.items.find((location) => location.id === values.locationId)?.name

  const updateValues = (patch: Partial<ReturnFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    const cleared: ReturnFormErrors = {}
    for (const key of Object.keys(patch)) {
      cleared[key as keyof ReturnFormErrors] = undefined
    }
    setErrors((current) => ({ ...current, ...cleared }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateReturn(values, products.items, locations.items)
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      toastError('Please fix the highlighted fields before recording the return.')
      return
    }

    const quantity = toNumber(values.quantity) ?? 0
    const result = recordReturn(
      values.productId,
      values.locationId,
      quantity,
      values.reference,
      values.reason
    )
    if (!result.ok) {
      setErrors((current) => ({ ...current, quantity: result.error }))
      toastError(result.error ?? 'Could not record the return. Please try again.')
      return
    }

    inventory.refresh()
    movements.refresh()
    toastSuccess(
      `Returned ${formatNumber(quantity)} of "${productName}"${locationName ? ` to ${locationName}` : ''}.`
    )
    setValues((current) => ({ ...current, quantity: '', reference: '', reason: '' }))
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / RETURNS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * RETURNS_PER_PAGE
  const visibleReturns = filtered.slice(startIndex, startIndex + RETURNS_PER_PAGE)

  return (
    <section>
      <div className="page-header">
        <h1>Record Returns</h1>
        <p>
          Log items returned from any channel (e.g. Shopee or Shopee / LINE). Every return adds stock
          back in.
        </p>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(totalUnitsReturned)}</span>
          <span className="inventory-stat-label">Total units returned</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(returnRecords.length)}</span>
          <span className="inventory-stat-label">Return entries</span>
        </div>
        <div className="inventory-stat">
          <span className="inventory-stat-value">{formatNumber(returnedToday)}</span>
          <span className="inventory-stat-label">Returned today</span>
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
            hint="which channel the item was returned to"
            className="field-span-2"
          >
            <select
              value={values.locationId}
              onChange={(event) => updateValues({ locationId: event.target.value })}
              className="input"
            >
              <option value="">Select where it returned to…</option>
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
              placeholder="e.g. 2"
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

          <Field label="Reason" error={errors.reason} hint="Optional but helpful for reporting." className="field-span-2">
            <select
              value={values.reason}
              onChange={(event) => updateValues({ reason: event.target.value })}
              className="input"
            >
              <option value="">Select reason (optional)…</option>
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </Field>

          <div className="form-actions form-actions-span">
            <button type="submit" className="btn btn-primary">
              Record Return
            </button>
          </div>
        </form>
      </div>

      <div className="page-subheader">
        <h2>Recent Returns</h2>
        <Link to="/movements" className="btn">
          View All Movements
        </Link>
      </div>

      {returnRecords.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No returns yet"
            message="Record a return above so returned stock is never lost again."
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
                value: catFilter,
                options: [
                  { value: 'all', label: 'All' },
                  ...categories.items.map((category) => ({
                    value: category.id,
                    label: category.name,
                    color: nameColor(category.name),
                  })),
                ],
                onChange: (value) => {
                  setCatFilter(value)
                  setPage(1)
                },
              },
            ]}
            onReset={() => {
              setChannel('all')
              setCatFilter('all')
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
                  placeholder="Search by product, category, ref, or reason…"
                  className="input products-search"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="card">
                <EmptyState title="No matching returns" message="Try a different search or filter." />
              </div>
            ) : (
              <ul className="movement-card-grid">
                {visibleReturns.map((movement) => (
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

      {returnRecords.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={RETURNS_PER_PAGE}
          onPageChange={setPage}
        />
      )}
    </section>
  )
}