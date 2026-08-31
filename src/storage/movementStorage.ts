import type { StockMovement } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'
import { inventoryStorage } from './inventoryStorage'

const base = createStorage<StockMovement>(STORAGE_KEYS.stockMovements)

export type MovementStorageModule = StorageModule<StockMovement>

export const movementStorage: MovementStorageModule = {
  key: base.key,
  getAll: () => base.getAll(),
  getById: (id) => base.getById(id),
  create: (input) => base.create(input),
  update: (id, input) => base.update(id, input),
  remove: (id) => base.remove(id),
  removeWhere: (predicate) => base.removeWhere(predicate),
}

export function getMovementsByProduct(productId: string): StockMovement[] {
  return base.getAll().filter((item) => item.productId === productId)
}

export function removeMovementsByProduct(productId: string): number {
  return base.removeWhere((item) => item.productId === productId)
}

export function migrateLegacyTransfers(): void {
  for (const movement of base.getAll()) {
    if ((movement as { type: string }).type === 'transfer') {
      base.update(movement.id, { type: 'transfer-out' })
    }
  }
}

export function recordInbound(productId: string, locationId: string, quantity: number): StockMovement {
  return base.create({
    productId,
    fromLocationId: null,
    toLocationId: locationId,
    quantity,
    type: 'inbound',
  })
}

export interface TransferResult {
  ok: boolean
  movement?: StockMovement
  error?: string
}

export function transferStock(
  productId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number
): TransferResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: 'Quantity must be a positive whole number.' }
  }
  if (fromLocationId === toLocationId) {
    return { ok: false, error: 'Source and destination must be different.' }
  }

  const source = inventoryStorage
    .getAll()
    .find((item) => item.productId === productId && item.locationId === fromLocationId)
  if (!source || source.quantity < quantity) {
    return { ok: false, error: 'Not enough stock at the source location.' }
  }

  inventoryStorage.update(source.id, { quantity: source.quantity - quantity })

  const target = inventoryStorage
    .getAll()
    .find((item) => item.productId === productId && item.locationId === toLocationId)
  if (target) {
    inventoryStorage.update(target.id, { quantity: target.quantity + quantity })
  } else {
    inventoryStorage.create({ productId, locationId: toLocationId, quantity })
  }

  const transferOut = base.create({
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    type: 'transfer-out',
  })
  base.create({
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    type: 'transfer-in',
  })
  return { ok: true, movement: transferOut }
}

export function recordSale(
  productId: string,
  locationId: string,
  quantity: number,
  reference = ''
): TransferResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: 'Quantity must be a positive whole number.' }
  }

  const source = inventoryStorage
    .getAll()
    .find((item) => item.productId === productId && item.locationId === locationId)
  if (!source || source.quantity < quantity) {
    return { ok: false, error: 'Not enough stock at this location.' }
  }

  inventoryStorage.update(source.id, { quantity: source.quantity - quantity })

  const sale = base.create({
    productId,
    fromLocationId: locationId,
    toLocationId: null,
    quantity,
    type: 'sale',
    reference: reference.trim() || undefined,
  })
  return { ok: true, movement: sale }
}

export function recordReturn(
  productId: string,
  locationId: string,
  quantity: number,
  reference = '',
  reason = ''
): TransferResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: 'Quantity must be a positive whole number.' }
  }

  const target = inventoryStorage
    .getAll()
    .find((item) => item.productId === productId && item.locationId === locationId)
  if (target) {
    inventoryStorage.update(target.id, { quantity: target.quantity + quantity })
  } else {
    inventoryStorage.create({ productId, locationId, quantity })
  }

  const returned = base.create({
    productId,
    fromLocationId: null,
    toLocationId: locationId,
    quantity,
    type: 'return-in',
    reference: reference.trim() || undefined,
    reason: reason.trim() || undefined,
  })
  return { ok: true, movement: returned }
}