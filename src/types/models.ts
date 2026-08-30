export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Unit extends Entity {
  name: string
}

export interface Category extends Entity {
  name: string
}

export interface Product extends Entity {
  name: string
  categoryId: string
  unitId: string
  quantity: number
  costPrice: number
  discountPercent: number
  sellingPrice: number
  description: string
  image: string
}

export interface ProductVariant extends Entity {
  productId: string
  name: string
  quantity: number
  costPrice: number
  discountPercent: number
  sellingPrice: number
  image: string
}

export interface StockLocation extends Entity {
  name: string
  code: string
  parentId: string | null
}

export interface Inventory extends Entity {
  productId: string
  locationId: string
  quantity: number
}

export type MovementType = 'inbound' | 'transfer-in' | 'transfer-out'

export interface StockMovement extends Entity {
  productId: string
  fromLocationId: string | null
  toLocationId: string | null
  quantity: number
  type: MovementType
}

export type NewEntity = Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>
export type UnitInput = NewEntity & { name: string }
export type CategoryInput = NewEntity & { name: string }
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sellingPrice'>
export type ProductVariantInput = Omit<
  ProductVariant,
  'id' | 'createdAt' | 'updatedAt' | 'sellingPrice'
>
export type StockLocationInput = NewEntity & {
  name: string
  code: string
  parentId: string | null
}
export type InventoryInput = NewEntity & {
  productId: string
  locationId: string
  quantity: number
}
export type StockMovementInput = NewEntity & {
  productId: string
  fromLocationId: string | null
  toLocationId: string | null
  quantity: number
  type: MovementType
}