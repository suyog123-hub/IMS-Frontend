import { useCallback, useState } from 'react'
import type { Entity } from '../types/models'
import type { NewRecord, RecordPatch, StorageModule } from '../storage/base'

export interface CollectionHook<T extends Entity> {
  items: T[]
  getById: (id: string) => T | undefined
  create: (input: NewRecord<T>) => T
  update: (id: string, input: RecordPatch<T>) => T | undefined
  remove: (id: string) => boolean
  removeWhere: (predicate: (item: T) => boolean) => number
  refresh: () => void
}

export function useCollection<T extends Entity>(storage: StorageModule<T>): CollectionHook<T> {
  const [items, setItems] = useState<T[]>(() => storage.getAll())

  const refresh = useCallback(() => setItems(storage.getAll()), [storage])

  const getById = useCallback(
    (id: string) => storage.getById(id),
    [storage],
  )

  const create = useCallback(
    (input: NewRecord<T>) => {
      const created = storage.create(input)
      setItems(storage.getAll())
      return created
    },
    [storage],
  )

  const update = useCallback(
    (id: string, input: RecordPatch<T>) => {
      const updated = storage.update(id, input)
      setItems(storage.getAll())
      return updated
    },
    [storage],
  )

  const remove = useCallback(
    (id: string) => {
      const removed = storage.remove(id)
      setItems(storage.getAll())
      return removed
    },
    [storage],
  )

  const removeWhere = useCallback(
    (predicate: (item: T) => boolean) => {
      const removed = storage.removeWhere(predicate)
      setItems(storage.getAll())
      return removed
    },
    [storage],
  )

  return { items, getById, create, update, remove, removeWhere, refresh }
}