import type { ProductVariant } from '../../types/models'
import { createId } from '../../utils/id'

export interface VariantDraft {
  key: string
  id?: string
  name: string
  size: string
  quantity: string
  costPrice: string
  discountPercent: string
  image: string
}

export function newVariantDraft(): VariantDraft {
  return {
    key: createId(),
    name: '',
    size: '',
    quantity: '',
    costPrice: '',
    discountPercent: '',
    image: '',
  }
}

export function variantDraftFrom(variant: ProductVariant): VariantDraft {
  return {
    key: variant.id,
    id: variant.id,
    name: variant.name,
    size: variant.size ?? '',
    quantity: String(variant.quantity),
    costPrice: String(variant.costPrice),
    discountPercent: String(variant.discountPercent),
    image: variant.image ?? '',
  }
}