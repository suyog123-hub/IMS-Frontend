import type { Inventory } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'
import { STOCK_LOCATION_MAIN_ID } from '../constants'

const base = createStorage<Inventory>(STORAGE_KEYS.inventory)

export type InventoryStorageModule = StorageModule<Inventory>

export const inventoryStorage: InventoryStorageModule = {
  key: base.key,
  getAll: () => base.getAll(),
  getById: (id) => base.getById(id),
  create: (input) => base.create(input),
  update: (id, input) => base.update(id, input),
  remove: (id) => base.remove(id),
  removeWhere: (predicate) => base.removeWhere(predicate),
}

export function getInventoryByProduct(productId: string): Inventory[] {
  return base.getAll().filter((item) => item.productId === productId)
}

export function getInventoryByProductAndLocation(
  productId: string,
  locationId: string
): Inventory | undefined {
  return base
    .getAll()
    .find((item) => item.productId === productId && item.locationId === locationId)
}

export function getInventoryByLocation(locationId: string): Inventory[] {
  return base.getAll().filter((item) => item.locationId === locationId)
}

export function countProductsAtLocation(locationId: string): number {
  const seen = new Set<string>()
  for (const item of base.getAll()) {
    if (item.locationId === locationId) seen.add(item.productId)
  }
  return seen.size
}

export function removeInventoryByProduct(productId: string): number {
  return base.removeWhere((item) => item.productId === productId)
}

export function ensureMainStock(productId: string, quantity: number): Inventory {
  const existing = base.getAll().find(
    (item) => item.productId === productId && item.locationId === STOCK_LOCATION_MAIN_ID
  )
  if (existing) {
    return base.update(existing.id, { quantity }) ?? existing
  }
  return base.create({ productId, locationId: STOCK_LOCATION_MAIN_ID, quantity })
}

export function mainStockQuantity(productId: string): number {
  return (
    base
      .getAll()
      .find(
        (item) => item.productId === productId && item.locationId === STOCK_LOCATION_MAIN_ID
      )?.quantity ?? 0
  )
}