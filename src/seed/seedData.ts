import { keyExists, writeSeed } from '../storage'
import { STORAGE_KEYS } from '../storage/keys'
import { STOCK_LOCATION_MAIN_CODE, STOCK_LOCATION_MAIN_ID, STOCK_LOCATION_MAIN_NAME } from '../constants'
import { nowIso } from '../utils/id'

const SEED_VERSION = '4'
const SEED_VERSION_KEY = 'inventory_seed_version'

export function seedIfNeeded(): void {
  resetIfStale()

  if (!keyExists(STORAGE_KEYS.stockLocations)) {
    writeSeed(STORAGE_KEYS.stockLocations, [
      {
        id: STOCK_LOCATION_MAIN_ID,
        name: STOCK_LOCATION_MAIN_NAME,
        code: STOCK_LOCATION_MAIN_CODE,
        parentId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ])
  }
}

function resetIfStale(): void {
  if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key)
  }
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
}