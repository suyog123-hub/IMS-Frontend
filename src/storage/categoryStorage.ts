import type { Category } from '../types/models'
import type { StorageModule } from './base'
import { createStorage } from './base'
import { STORAGE_KEYS } from './keys'

export const categoryStorage: StorageModule<Category> = createStorage<Category>(
  STORAGE_KEYS.categories,
)