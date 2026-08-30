import type { Product, ProductInput } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'
import { calculateSellingPrice } from '../utils/pricing'

const base = createStorage<Product>(STORAGE_KEYS.products)

function withSellingPrice(input: Partial<ProductInput>, fallback: Product) {
  const costPrice = input.costPrice ?? fallback.costPrice
  const discountPercent = input.discountPercent ?? fallback.discountPercent
  return { ...input, sellingPrice: calculateSellingPrice(costPrice, discountPercent) }
}

export type ProductStorageModule = Omit<StorageModule<Product>, 'create' | 'update'> & {
  create(input: ProductInput): Product
  update(id: string, input: Partial<ProductInput>): Product | undefined
}

export const productStorage: ProductStorageModule = {
  key: base.key,
  getAll: () => base.getAll(),
  getById: (id) => base.getById(id),
  create: (input) => {
    const sellingPrice = calculateSellingPrice(input.costPrice, input.discountPercent)
    return base.create({ ...input, sellingPrice })
  },
  update: (id, input) => {
    const current = base.getById(id)
    if (!current) return undefined
    return base.update(id, withSellingPrice(input, current))
  },
  remove: (id) => base.remove(id),
  removeWhere: (predicate) => base.removeWhere(predicate),
}

export function countProductsByCategory(categoryId: string): number {
  return base.getAll().filter((product) => product.categoryId === categoryId).length
}

export function countProductsByUnit(unitId: string): number {
  return base.getAll().filter((product) => product.unitId === unitId).length
}