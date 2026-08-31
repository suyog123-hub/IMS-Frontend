import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  stockLocationStorage,
  transferStock,
} from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { toNumber } from '../../utils/numbers'
import { formatNumber } from '../../utils/format'
import { nameColor } from '../../utils/color'
import {
  validateTransfer,
  type TransferFormErrors,
  type TransferFormValues,
} from '../../utils/validation'
import { Field } from '../common/Field'
import { EmptyState } from '../common/EmptyState'
import { Pagination } from '../common/Pagination'
import { QuickFilterPanel } from '../common/QuickFilterPanel'
import { MovementRow } from '../common/MovementRow'
import { toastError, toastSuccess } from '../../utils/toast'

const EMPTY_VALUES: TransferFormValues = {
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: '',
}

const TRANSFERS_PER_PAGE = 5

export function TransfersPage() {
  const products = useCollection(productStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)

  const [values, setValues] = useState<TransferFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<TransferFormErrors>({})

  const available = useMemo(() => {
    if (!values.productId || !values.fromLocationId) return null
    return (
      inventory.items.find(
        (record) =>
          record.productId === values.productId && record.locationId === values.fromLocationId
      )?.quantity ?? 0
    )
  }, [values.productId, values.fromLocationId, inventory.items])

  const recentTransfers = useMemo(
    () =>
      movements.items
        .filter((movement) => movement.type === 'transfer-out')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements.items]
  )

  const [query, setQuery] = useState('')
  const [locationId, setLocationId] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)

  const filteredTransfers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const categoryNames = new Map<string, string>()
    for (const category of categories.items) categoryNames.set(category.id, category.name)

    return recentTransfers.filter((movement) => {
      if (
        locationId !== 'all' &&
        movement.fromLocationId !== locationId &&
        movement.toLocationId !== locationId
      ) {
        return false
      }
      const product = products.items.find((item) => item.id === movement.productId)
      if (categoryId !== 'all' && product?.categoryId !== categoryId) return false
      if (!q) return true
      const name = (product?.name ?? '').toLowerCase()
      const categoryName = (categoryNames.get(product?.categoryId ?? '') ?? '').toLowerCase()
      return name.includes(q) || categoryName.includes(q)
    })
  }, [recentTransfers, query, locationId, categoryId, products.items, categories.items])

  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / TRANSFERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * TRANSFERS_PER_PAGE
  const visibleTransfers = filteredTransfers.slice(startIndex, startIndex + TRANSFERS_PER_PAGE)

  const productName = products.items.find((product) => product.id === values.productId)?.name
  const fromName = locations.items.find((location) => location.id === values.fromLocationId)?.name
  const toName = locations.items.find((location) => location.id === values.toLocationId)?.name

  const updateValues = (patch: Partial<TransferFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    const cleared: TransferFormErrors = {}
    for (const key of Object.keys(patch)) {
      cleared[key as keyof TransferFormErrors] = undefined
    }
    setErrors((current) => ({ ...current, ...cleared }))
  }

  const handleTransfer = (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateTransfer(values, products.items, locations.items, available)
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      toastError('Please fix the highlighted fields before transferring.')
      return
    }

    const quantity = toNumber(values.quantity) ?? 0
    const result = transferStock(values.productId, values.fromLocationId, values.toLocationId, quantity)
    if (!result.ok) {
      setErrors((current) => ({ ...current, quantity: result.error }))
      toastError(result.error ?? 'Could not complete the transfer. Please try again.')
      return
    }

    inventory.refresh()
    movements.refresh()
    toastSuccess(
      `Transferred ${formatNumber(quantity)} of "${productName}" from ${fromName} to ${toName}.`
    )
    setValues((current) => ({ ...current, quantity: '' }))
  }

  return (
    <section>
      <div className="page-header">
        <h1>Stock Transfers</h1>
        <p>Move stock between warehouse locations. Every transfer is recorded in the movement log.</p>
      </div>

      <div className="card">
        <form className="form form-grid" onSubmit={handleTransfer} noValidate>
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
            label="From Location"
            error={errors.fromLocationId}
            hint={available !== null ? `${formatNumber(available)} available here` : undefined}
          >
            <select
              value={values.fromLocationId}
              onChange={(event) => updateValues({ fromLocationId: event.target.value })}
              className="input"
            >
              <option value="">Select source…</option>
              {locations.items.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="To Location" error={errors.toLocationId}>
            <select
              value={values.toLocationId}
              onChange={(event) => updateValues({ toLocationId: event.target.value })}
              className="input"
            >
              <option value="">Select destination…</option>
              {locations.items.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantity" error={errors.quantity} hint="Whole units only." className="field-span-2">
            <input
              type="number"
              min="1"
              step="1"
              value={values.quantity}
              onChange={(event) => updateValues({ quantity: event.target.value })}
              placeholder="e.g. 12"
              className="input"
            />
          </Field>

          <div className="form-actions form-actions-span">
            <button type="submit" className="btn btn-primary">
              Transfer Stock
            </button>
          </div>
        </form>
      </div>

      <div className="page-subheader">
        <h2>Recent Transfers</h2>
        <Link to="/movements" className="btn">
          View All Movements
        </Link>
      </div>

      {recentTransfers.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No transfers yet"
            message="Move stock between locations using the form above."
          />
        </div>
      ) : (
        <>
          <div className="products-layout">
            <QuickFilterPanel
              groups={[
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
                setCategoryId('all')
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
                    placeholder="Search transfers…"
                    className="input products-search"
                  />
                </div>
              </div>

              {filteredTransfers.length === 0 ? (
                <div className="card">
                  <EmptyState title="No matching transfers" message="Try a different search or filter." />
                </div>
              ) : (
                <ul className="movement-card-grid">
                  {visibleTransfers.map((movement) => (
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
            totalItems={filteredTransfers.length}
            pageSize={TRANSFERS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  )
}