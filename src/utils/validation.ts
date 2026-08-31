import type { Category, Product, StockLocation, Unit } from '../types/models'
import { toNumber } from './numbers'
import { STOCK_LOCATION_MAIN_ID } from '../constants'

export const RETURN_REASONS = [
  'Damaged item',
  'Wrong item',
  'Wrong size / color',
  'No longer wanted',
  'Duplicate order',
  'Other',
] as const

export function validateName(name: string): string | null {
  return name.trim().length > 0 ? null : 'Name is required.'
}

export interface ProductFormValues {
  name: string
  categoryId: string
  unitId: string
  quantity: string
  costPrice: string
  discountPercent: string
  description: string
  image: string
}

export interface ProductFormErrors {
  name?: string
  categoryId?: string
  unitId?: string
  quantity?: string
  costPrice?: string
  discountPercent?: string
}

export interface ProductVariantFormValues {
  name: string
  quantity: string
  costPrice: string
  discountPercent: string
}

export interface ProductVariantFormErrors {
  name?: string
  quantity?: string
  costPrice?: string
  discountPercent?: string
}

export function validateVariant(values: ProductVariantFormValues): ProductVariantFormErrors {
  const errors: ProductVariantFormErrors = {}

  if (!values.name.trim()) errors.name = 'Variant name is required.'

  const quantity = toNumber(values.quantity)
  if (quantity === null || quantity < 0) errors.quantity = 'Must be a non-negative number.'

  const costPrice = toNumber(values.costPrice)
  if (costPrice === null || costPrice < 0) errors.costPrice = 'Must be a non-negative number.'

  const discountPercent = toNumber(values.discountPercent)
  if (discountPercent === null || discountPercent < 0) {
    errors.discountPercent = 'Must be a non-negative number.'
  } else if (discountPercent > 100) {
    errors.discountPercent = 'Discount cannot exceed 100%.'
  }

  return errors
}

export function validateProduct(
  values: ProductFormValues,
  categories: Category[],
  units: Unit[],
): ProductFormErrors {
  const errors: ProductFormErrors = {}

  if (!values.name.trim()) errors.name = 'Name is required.'

  const categoryExists = categories.some((category) => category.id === values.categoryId)
  if (!values.categoryId) {
    errors.categoryId = 'Category is required.'
  } else if (!categoryExists) {
    errors.categoryId = 'The selected category no longer exists.'
  }

  const unitExists = units.some((unit) => unit.id === values.unitId)
  if (!values.unitId) {
    errors.unitId = 'Unit is required.'
  } else if (!unitExists) {
    errors.unitId = 'The selected unit no longer exists.'
  }

  const quantity = toNumber(values.quantity)
  if (quantity === null || quantity < 0) errors.quantity = 'Quantity must be a non-negative number.'

  const costPrice = toNumber(values.costPrice)
  if (costPrice === null || costPrice < 0) errors.costPrice = 'Cost price must be a non-negative number.'

  const discountPercent = toNumber(values.discountPercent)
  if (discountPercent === null || discountPercent < 0) {
    errors.discountPercent = 'Discount must be a non-negative number.'
  } else if (discountPercent > 100) {
    errors.discountPercent = 'Discount cannot exceed 100%.'
  }

  return errors
}

export interface StockLocationFormValues {
  name: string
  code: string
  parentId: string
}

export interface StockLocationFormErrors {
  name?: string
  code?: string
  parentId?: string
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

export function normalizeStockLocationCode(value: string): string {
  return normalizeCode(value)
}

export function validateStockLocation(
  values: StockLocationFormValues,
  locations: StockLocation[],
  selfId: string | null,
): StockLocationFormErrors {
  const errors: StockLocationFormErrors = {}
  const otherLocations = locations.filter((location) => location.id !== selfId)

  if (!values.name.trim()) errors.name = 'Name is required.'

  const code = normalizeCode(values.code)
  if (!code) {
    errors.code = 'Code is required.'
  } else if (!/^[A-Z0-9][A-Z0-9-_]*$/.test(code)) {
    errors.code = 'Use letters, numbers, hyphens, or underscores.'
  } else if (otherLocations.some((location) => location.code.toLowerCase() === code.toLowerCase())) {
    errors.code = 'A location with this code already exists.'
  }

  if (values.parentId) {
    if (values.parentId === selfId) {
      errors.parentId = 'A location cannot be its own parent.'
    } else if (selfId === STOCK_LOCATION_MAIN_ID) {
      errors.parentId = 'The main warehouse cannot have a parent.'
    } else {
      const isDescendant = (candidateId: string, fromId: string): boolean => {
        const childIds = locations.filter((location) => location.parentId === fromId).map((l) => l.id)
        return (
          childIds.includes(candidateId) ||
          childIds.some((childId) => isDescendant(candidateId, childId))
        )
      }
      if (selfId && isDescendant(selfId, values.parentId)) {
        errors.parentId = 'A location cannot be inside one of its own sub-locations.'
      }
    }
  }

  return errors
}

export interface TransferFormValues {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: string
}

export interface TransferFormErrors {
  productId?: string
  fromLocationId?: string
  toLocationId?: string
  quantity?: string
}

export function validateTransfer(
  values: TransferFormValues,
  products: Product[],
  locations: StockLocation[],
  available: number | null,
): TransferFormErrors {
  const errors: TransferFormErrors = {}

  const productExists = products.some((product) => product.id === values.productId)
  if (!values.productId) {
    errors.productId = 'Product is required.'
  } else if (!productExists) {
    errors.productId = 'The selected product no longer exists.'
  }

  const locationExists = (id: string) => locations.some((location) => location.id === id)
  if (!values.fromLocationId) {
    errors.fromLocationId = 'Source location is required.'
  } else if (!locationExists(values.fromLocationId)) {
    errors.fromLocationId = 'The selected source location no longer exists.'
  }

  if (!values.toLocationId) {
    errors.toLocationId = 'Destination location is required.'
  } else if (!locationExists(values.toLocationId)) {
    errors.toLocationId = 'The selected destination location no longer exists.'
  } else if (values.toLocationId === values.fromLocationId) {
    errors.toLocationId = 'Source and destination must be different.'
  }

  const quantity = toNumber(values.quantity)
  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Must be a positive whole number.'
  } else if (available !== null && quantity > available) {
    errors.quantity = `Only ${available} unit${available === 1 ? '' : 's'} available here.`
  }

  return errors
}

export interface SaleFormValues {
  productId: string
  locationId: string
  quantity: string
  reference: string
}

export interface SaleFormErrors {
  productId?: string
  locationId?: string
  quantity?: string
  reference?: string
}

export function validateSale(
  values: SaleFormValues,
  products: Product[],
  locations: StockLocation[],
  available: number | null,
): SaleFormErrors {
  const errors: SaleFormErrors = {}

  if (!values.productId) {
    errors.productId = 'Product is required.'
  } else if (!products.some((product) => product.id === values.productId)) {
    errors.productId = 'The selected product no longer exists.'
  }

  if (!values.locationId) {
    errors.locationId = 'Location is required.'
  } else if (!locations.some((location) => location.id === values.locationId)) {
    errors.locationId = 'The selected location no longer exists.'
  }

  const quantity = toNumber(values.quantity)
  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Must be a positive whole number.'
  } else if (available !== null && quantity > available) {
    errors.quantity = `Only ${available} unit${available === 1 ? '' : 's'} available here.`
  }

  return errors
}

export interface ReturnFormValues {
  productId: string
  locationId: string
  quantity: string
  reference: string
  reason: string
}

export interface ReturnFormErrors {
  productId?: string
  locationId?: string
  quantity?: string
  reference?: string
  reason?: string
}

export function validateReturn(
  values: ReturnFormValues,
  products: Product[],
  locations: StockLocation[],
): ReturnFormErrors {
  const errors: ReturnFormErrors = {}

  if (!values.productId) {
    errors.productId = 'Product is required.'
  } else if (!products.some((product) => product.id === values.productId)) {
    errors.productId = 'The selected product no longer exists.'
  }

  if (!values.locationId) {
    errors.locationId = 'Location is required.'
  } else if (!locations.some((location) => location.id === values.locationId)) {
    errors.locationId = 'The selected location no longer exists.'
  }

  const quantity = toNumber(values.quantity)
  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Must be a positive whole number.'
  }

  return errors
}