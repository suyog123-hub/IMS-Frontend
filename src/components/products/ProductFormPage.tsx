import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product, ProductInput, ProductVariantInput } from '../../types/models'
import { productStorage, categoryStorage, unitStorage, productVariantStorage, ensureMainStock, recordInbound } from '../../storage'
import { STOCK_LOCATION_MAIN_ID } from '../../constants'
import { useCollection } from '../../hooks/useCollection'
import { toNumber } from '../../utils/numbers'
import { calculateSellingPrice } from '../../utils/pricing'
import {
  validateProduct,
  validateVariant,
  type ProductFormValues,
  type ProductVariantFormErrors,
} from '../../utils/validation'
import { formatCurrency } from '../../utils/format'
import { toastError, toastSuccess } from '../../utils/toast'
import { EmptyState } from '../common/EmptyState'
import { Field } from '../common/Field'
import { ProductVariants } from './ProductVariants'
import { variantDraftFrom, type VariantDraft } from './variantDrafts'

const MAX_IMAGE_BYTES = 1024 * 1024

function toEmptyValues(): ProductFormValues {
  return {
    name: '',
    categoryId: '',
    unitId: '',
    quantity: '',
    costPrice: '',
    discountPercent: '',
    description: '',
    image: '',
  }
}

export function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const categories = useCollection(categoryStorage)
  const units = useCollection(unitStorage)
  const products = useCollection(productStorage)

  const product = id ? products.items.find((item) => item.id === id) : undefined
  const editing = Boolean(product)

  const [values, setValues] = useState<ProductFormValues>(() => {
    if (!product) return toEmptyValues()
    return {
      name: product.name,
      categoryId: product.categoryId,
      unitId: product.unitId,
      quantity: String(product.quantity),
      costPrice: String(product.costPrice),
      discountPercent: String(product.discountPercent),
      description: product.description,
      image: product.image,
    }
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(() =>
    product ? productVariantStorage.getByProduct(product.id).map(variantDraftFrom) : [],
  )
  const [variantErrors, setVariantErrors] = useState<
    Record<string, Partial<ProductVariantFormErrors>>
  >({})

  const parsedCost = toNumber(values.costPrice)
  const parsedDiscount = toNumber(values.discountPercent)
  const canShowPrice = parsedCost !== null && parsedDiscount !== null
  const liveSellingPrice = canShowPrice ? calculateSellingPrice(parsedCost, parsedDiscount) : null

  const setValue = (key: keyof ProductFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose a valid image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image exceeds the 1 MB size limit. Please upload a smaller image.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setValues((prev) => ({
        ...prev,
        image: typeof reader.result === 'string' ? reader.result : '',
      }))
      setImageError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateProduct(values, categories.items, units.items)
    setErrors(validationErrors)

    const draftErrors: Record<string, Partial<ProductVariantFormErrors>> = {}
    variantDrafts.forEach((draft) => {
      const err = validateVariant(draft)
      if (Object.values(err).some(Boolean)) draftErrors[draft.key] = err
    })
    setVariantErrors(draftErrors)

    if (Object.values(validationErrors).some(Boolean) || Object.keys(draftErrors).length > 0) {
      toastError('Please fix the highlighted fields before saving.')
      return
    }

    const input: ProductInput = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      unitId: values.unitId,
      quantity: toNumber(values.quantity) ?? 0,
      costPrice: parsedCost ?? 0,
      discountPercent: parsedDiscount ?? 0,
      description: values.description.trim(),
      image: values.image,
    }

    const saved = product ? productStorage.update(product.id, input) : productStorage.create(input)
    if (!saved) {
      toastError(`Could not ${product ? 'update' : 'save'} the product. Please try again.`)
      return
    }

    ensureMainStock(saved.id, saved.quantity)
    if (!product) {
      recordInbound(saved.id, STOCK_LOCATION_MAIN_ID, saved.quantity)
    }
    syncVariants(saved, variantDrafts)
    toastSuccess(product ? 'Product updated successfully.' : 'Product created successfully.')
    navigate('/products')
  }

  const syncVariants = (product: Product, drafts: VariantDraft[]) => {
    const existing = productVariantStorage.getByProduct(product.id)
    const keptIds = drafts.map((draft) => draft.id).filter((value): value is string => Boolean(value))
    existing.forEach((variant) => {
      if (!keptIds.includes(variant.id)) productVariantStorage.remove(variant.id)
    })
    drafts.forEach((draft) => {
      const variantInput: ProductVariantInput = {
        productId: product.id,
        name: draft.name.trim() || product.name,
        size: draft.size.trim(),
        quantity: toNumber(draft.quantity) ?? 0,
        costPrice: toNumber(draft.costPrice) ?? product.costPrice,
        discountPercent: toNumber(draft.discountPercent) ?? product.discountPercent,
        image: draft.image,
      }
      if (draft.id) {
        productVariantStorage.update(draft.id, variantInput)
      } else {
        productVariantStorage.create(variantInput)
      }
    })
  }

  const missingCategories = categories.items.length === 0
  const missingUnits = units.items.length === 0

  return (
    <section>
      <div className="page-header">
        <h1>{editing ? 'Edit Product' : 'Add Product'}</h1>
        <p>
          The selling price is calculated automatically from the cost price and the discount
          percentage.
        </p>
      </div>

      <div className="card">
        {missingCategories || missingUnits ? (
          <div className="form-prerequisite">
            {missingCategories && (
              <EmptyState
                title="No categories available"
                message="Create a category before adding a product."
                action={
                  <Link to="/categories" className="btn btn-primary">
                    Go to Categories
                  </Link>
                }
              />
            )}
            {missingUnits && (
              <EmptyState
                title="No units available"
                message="Create a unit before adding a product."
                action={
                  <Link to="/units" className="btn btn-primary">
                    Go to Units
                  </Link>
                }
              />
            )}
          </div>
        ) : (
          <form className="form form-grid" onSubmit={handleSubmit} noValidate>
            <Field label="Product Name" error={errors.name}>
              <input
                type="text"
                value={values.name}
                onChange={(event) => setValue('name', event.target.value)}
                placeholder="e.g. Keyboard"
                className="input"
              />
            </Field>

            <Field label="Category" error={errors.categoryId}>
              <select
                value={values.categoryId}
                onChange={(event) => setValue('categoryId', event.target.value)}
                className="input"
              >
                <option value="">Select a category</option>
                {categories.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unit" error={errors.unitId}>
              <select
                value={values.unitId}
                onChange={(event) => setValue('unitId', event.target.value)}
                className="input"
              >
                <option value="">Select a unit</option>
                {units.items.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity" error={errors.quantity}>
              <input
                type="number"
                min="0"
                step="any"
                value={values.quantity}
                onChange={(event) => setValue('quantity', event.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>

            <Field label="Cost Price" error={errors.costPrice}>
              <input
                type="number"
                min="0"
                step="any"
                value={values.costPrice}
                onChange={(event) => setValue('costPrice', event.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>

            <Field label="Discount (%)" error={errors.discountPercent} hint="Percentage off the cost price.">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={values.discountPercent}
                onChange={(event) => setValue('discountPercent', event.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>

            <Field
              label="Selling Price"
              hint="Calculated automatically"
            >
              <input
                type="text"
                value={liveSellingPrice === null ? '—' : formatCurrency(liveSellingPrice)}
                readOnly
                aria-readonly="true"
                className="input input-readonly"
              />
            </Field>

            <Field label="Image" hint="JPG, PNG or WebP, up to 10 MB" className="field-span-2">
              <div className="image-field">
                {values.image ? (
                  <div className="image-preview">
                    <img src={values.image} alt="Product preview" />
                    <div className="image-preview-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-outline"
                        onClick={() => setValues((prev) => ({ ...prev, image: '' }))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="image-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="image-upload-icon">+</span>
                    <span>Upload Image</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="file-input"
                  onChange={handleImageChange}
                />
                {imageError && <span className="field-error">{imageError}</span>}
              </div>
            </Field>

            <Field label="Description" className="field-span-2">
              <textarea
                value={values.description}
                onChange={(event) => setValue('description', event.target.value)}
                rows={3}
                placeholder="Optional description"
                className="input"
              />
            </Field>

            <div className="field-span-2 variants-section-field">
              <ProductVariants
                drafts={variantDrafts}
                errors={variantErrors}
                productDraft={{
                  name: values.name,
                  costPrice: values.costPrice,
                  discountPercent: values.discountPercent,
                }}
                onChange={setVariantDrafts}
              />
            </div>

            <div className="form-actions form-actions-span">
              <button type="submit" className="btn btn-primary">
                {editing ? 'Update Product' : 'Save Product'}
              </button>
              <button type="button" className="btn" onClick={() => navigate('/products')}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}