import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  categoryStorage,
  inventoryStorage,
  movementStorage,
  productStorage,
  productVariantStorage,
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
import { AppImage } from '../common/AppImage'
import { toastError, toastSuccess } from '../../utils/toast'

interface TransferItemDraft {
  key: string
  selectedId: string
  quantity: string
}

function newItemDraft(): TransferItemDraft {
  return {
    key: `titem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    selectedId: '',
    quantity: '',
  }
}

const TRANSFERS_PER_PAGE = 5

export function TransfersPage() {
  const products = useCollection(productStorage)
  const productVariants = useCollection(productVariantStorage)
  const categories = useCollection(categoryStorage)
  const locations = useCollection(stockLocationStorage)
  const inventory = useCollection(inventoryStorage)
  const movements = useCollection(movementStorage)

  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [itemDrafts, setItemDrafts] = useState<TransferItemDraft[]>([newItemDraft()])
  const [errors, setErrors] = useState<{
    fromLocationId?: string
    toLocationId?: string
    items?: Record<string, { selectedId?: string; quantity?: string }>
  }>({})
  const listRef = useRef<HTMLDivElement>(null)

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

  const getAvailableStock = (selectedId: string, fromLocId: string): number => {
    if (!selectedId || !fromLocId) return 0
    const opt = variantOptions.find((o) => o.id === selectedId)
    if (!opt) return 0

    if (opt.variantId) {
      const variant = productVariantStorage.getById(opt.variantId)
      if (!variant) return 0
      return variant.quantity
    } else {
      const mainRecord = inventory.items.find(
        (r) => r.productId === opt.productId && r.locationId === fromLocId
      )
      return mainRecord ? mainRecord.quantity : 0
    }
  }

  const addItemRow = () => {
    setItemDrafts((current) => [...current, newItemDraft()])
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

  const updateItemRow = (key: string, patch: Partial<TransferItemDraft>) => {
    setItemDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
    setErrors((prev) => {
      if (!prev.items?.[key]) return prev
      const { [key]: _cleared, ...restItems } = prev.items
      return { ...prev, items: restItems }
    })
  }

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

  const fromName = locations.items.find((location) => location.id === fromLocationId)?.name ?? 'Source'
  const toName = locations.items.find((location) => location.id === toLocationId)?.name ?? 'Destination'

  const handleTransfer = (event: FormEvent) => {
    event.preventDefault()
    const newErrors: {
      fromLocationId?: string
      toLocationId?: string
      items: Record<string, { selectedId?: string; quantity?: string }>
    } = { items: {} }

    if (!fromLocationId) {
      newErrors.fromLocationId = 'Please select a source location.'
    }
    if (!toLocationId) {
      newErrors.toLocationId = 'Please select a destination location.'
    } else if (fromLocationId === toLocationId) {
      newErrors.toLocationId = 'Source and destination must be different.'
    }

    let hasItemError = false

    for (const item of itemDrafts) {
      const itemErr: { selectedId?: string; quantity?: string } = {}
      if (!item.selectedId) {
        itemErr.selectedId = 'Please select a variant.'
        hasItemError = true
      }
      const qty = toNumber(item.quantity)
      const avail = getAvailableStock(item.selectedId, fromLocationId)

      if (qty === null || !Number.isInteger(qty) || qty <= 0) {
        itemErr.quantity = 'Quantity must be a positive whole number.'
        hasItemError = true
      } else if (qty > avail) {
        itemErr.quantity = `Cannot transfer more than available stock (${formatNumber(avail)} available).`
        hasItemError = true
      }

      if (itemErr.selectedId || itemErr.quantity) {
        newErrors.items[item.key] = itemErr
      }
    }

    if (newErrors.fromLocationId || newErrors.toLocationId || hasItemError) {
      setErrors(newErrors)
      toastError('Please fix highlighted fields before transferring.')
      return
    }

    let successCount = 0
    for (const item of itemDrafts) {
      const opt = variantOptions.find((o) => o.id === item.selectedId)
      if (!opt) continue
      const qty = toNumber(item.quantity) ?? 0

      const res = transferStock(opt.productId, fromLocationId, toLocationId, qty, opt.variantId)
      if (res.ok) {
        successCount++
      }
    }

    if (successCount > 0) {
      inventory.refresh()
      movements.refresh()
      productVariants.refresh()
      toastSuccess(
        `Successfully transferred ${successCount} variant item${successCount > 1 ? 's' : ''} from ${fromName} to ${toName}.`
      )
      setItemDrafts([newItemDraft()])
      setErrors({})
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Stock Transfers</h1>
        <p>Move multiple product variants between locations. Stock limits are strictly enforced.</p>
      </div>

      <div className="card">
        <form className="form" onSubmit={handleTransfer} noValidate>
          <div className="form-grid">
            <Field label="From Location (Source)" error={errors.fromLocationId}>
              <select
                value={fromLocationId}
                onChange={(event) => {
                  setFromLocationId(event.target.value)
                  setErrors((prev) => ({ ...prev, fromLocationId: undefined }))
                }}
                className="input"
              >
                <option value="">Select source location…</option>
                {locations.items.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="To Location (Destination)" error={errors.toLocationId}>
              <select
                value={toLocationId}
                onChange={(event) => {
                  setToLocationId(event.target.value)
                  setErrors((prev) => ({ ...prev, toLocationId: undefined }))
                }}
                className="input"
              >
                <option value="">Select destination location…</option>
                {locations.items.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="transfer-items-section" style={{ marginTop: '20px' }}>
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
                Transfer Items ({itemDrafts.length})
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
              className="transfer-items-list"
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
                const availableStock = fromLocationId
                  ? getAvailableStock(item.selectedId, fromLocationId)
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
                          const optAvail = fromLocationId
                            ? getAvailableStock(opt.id, fromLocationId)
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
                          fromLocationId && item.selectedId
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

                    <Field label="Transfer Qty" error={itemErr.quantity}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(item.key, { quantity: e.target.value })}
                        placeholder="e.g. 10"
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
              Transfer Stock ({itemDrafts.length} {itemDrafts.length === 1 ? 'item' : 'items'})
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