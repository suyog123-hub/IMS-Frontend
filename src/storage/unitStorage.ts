import type { Unit } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'

export const unitStorage: StorageModule<Unit> = createStorage<Unit>(STORAGE_KEYS.units)