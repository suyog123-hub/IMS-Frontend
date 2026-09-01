import type { ProductVariant, ProductVariantInput } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'
import { calculateSellingPrice } from '../utils/pricing'

const base = createStorage<ProductVariant>(STORAGE_KEYS.productVariants)

function withSellingPrice(input: Partial<ProductVariantInput>, fallback: ProductVariant) {
  const costPrice = input.costPrice ?? fallback.costPrice
  const discountPercent = input.discountPercent ?? fallback.discountPercent
  const sellingPrice = input.sellingPrice ?? calculateSellingPrice(costPrice, discountPercent)
  return { ...input, sellingPrice }
}

export type ProductVariantStorageModule = Omit<
  StorageModule<ProductVariant>,
  'create' | 'update'
> & {
  create(input: ProductVariantInput): ProductVariant
  update(id: string, input: Partial<ProductVariantInput>): ProductVariant | undefined
  getByProduct(productId: string): ProductVariant[]
  removeByProduct(productId: string): number
}

export const productVariantStorage: ProductVariantStorageModule = {
  key: base.key,
  getAll: () => base.getAll(),
  getById: (id) => base.getById(id),
  getByProduct: (productId) => base.getAll().filter((variant) => variant.productId === productId),
  create: (input) => {
    const sellingPrice = input.sellingPrice ?? calculateSellingPrice(input.costPrice, input.discountPercent)
    return base.create({ ...input, sellingPrice })
  },
  update: (id, input) => {
    const current = base.getById(id)
    if (!current) return undefined
    return base.update(id, withSellingPrice(input, current))
  },
  remove: (id) => base.remove(id),
  removeWhere: (predicate) => base.removeWhere(predicate),
  removeByProduct: (productId) =>
    base.removeWhere((variant) => variant.productId === productId),
}