export { unitStorage } from './unitStorage'
export { categoryStorage } from './categoryStorage'
export { productStorage, countProductsByCategory, countProductsByUnit } from './productStorage'
export { productVariantStorage } from './productVariantStorage'
export {
  stockLocationStorage,
  isMainLocation,
  collectDescendantIds,
} from './stockLocationStorage'
export {
  inventoryStorage,
  getInventoryByProduct,
  getInventoryByProductAndLocation,
  getInventoryByLocation,
  countProductsAtLocation,
  removeInventoryByProduct,
  ensureMainStock,
  mainStockQuantity,
} from './inventoryStorage'
export {
  movementStorage,
  getMovementsByProduct,
  removeMovementsByProduct,
  recordInbound,
  transferStock,
  recordSale,
  recordReturn,
  migrateLegacyTransfers,
  type TransferResult,
} from './movementStorage'
export { STORAGE_KEYS } from './keys'
export { createStorage, keyExists, writeSeed } from './base'
export type { StorageModule, NewRecord, RecordPatch } from './base'
export {
  saveImageBlob,
  getImageBlob,
  deleteImageBlob,
  getImageObjectUrl,
} from './imageBlobStorage'