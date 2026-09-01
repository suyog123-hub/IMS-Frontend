import type { ProductVariant } from '../../types/models'
import { createId } from '../../utils/id'

export interface VariantDraft {
  key: string
  id?: string
  name: string
  size: string
  color: string
  quantity: string
  costPrice: string
  discountPercent: string
  sellingPrice: string
  image: string
}

export function newVariantDraft(): VariantDraft {
  return {
    key: createId(),
    name: '',
    size: '',
    color: '',
    quantity: '',
    costPrice: '',
    discountPercent: '',
    sellingPrice: '',
    image: '',
  }
}

export function variantDraftFrom(variant: ProductVariant): VariantDraft {
  return {
    key: variant.id,
    id: variant.id,
    name: variant.name,
    size: variant.size ?? '',
    color: variant.color ?? '',
    quantity: String(variant.quantity),
    costPrice: String(variant.costPrice),
    discountPercent: String(variant.discountPercent),
    sellingPrice: variant.sellingPrice ? String(variant.sellingPrice) : '',
    image: variant.image ?? '',
  }
}