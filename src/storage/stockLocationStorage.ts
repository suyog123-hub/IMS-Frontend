import type { StockLocation } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'
import { STOCK_LOCATION_MAIN_ID } from '../constants'

const base = createStorage<StockLocation>(STORAGE_KEYS.stockLocations)

export type StockLocationStorageModule = StorageModule<StockLocation>

export const stockLocationStorage: StockLocationStorageModule = {
  key: base.key,
  getAll: () => base.getAll(),
  getById: (id) => base.getById(id),
  create: (input) => base.create(input),
  update: (id, input) => base.update(id, input),
  remove: (id) => base.remove(id),
  removeWhere: (predicate) => base.removeWhere(predicate),
}

export function isMainLocation(location: StockLocation): boolean {
  return location.id === STOCK_LOCATION_MAIN_ID
}

export function collectDescendantIds(locations: StockLocation[], parentId: string | null): string[] {
  const result: string[] = []
  if (!parentId) return result

  const children = locations.filter((item) => item.parentId === parentId)
  for (const child of children) {
    result.push(child.id)
    result.push(...collectDescendantIds(locations, child.id))
  }
  return result
}