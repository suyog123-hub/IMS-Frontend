import type { Entity } from '../types/models'
import { createId, nowIso } from '../utils/id'

export type NewRecord<T extends Entity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type RecordPatch<T extends Entity> = Partial<NewRecord<T>>

export interface StorageModule<T extends Entity> {
  readonly key: string
  getAll(): T[]
  getById(id: string): T | undefined
  create(input: NewRecord<T>): T
  update(id: string, input: RecordPatch<T>): T | undefined
  remove(id: string): boolean
  removeWhere(predicate: (item: T) => boolean): number
}

function readAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export function createStorage<T extends Entity>(key: string): StorageModule<T> {
  return {
    key,
    getAll: () => readAll<T>(key),
    getById: (id) => readAll<T>(key).find((item) => item.id === id),
    create: (input) => {
      const record = { ...input, id: createId(), createdAt: nowIso(), updatedAt: nowIso() } as T
      writeAll(key, [...readAll<T>(key), record])
      return record
    },
    update: (id, input) => {
      const items = readAll<T>(key)
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) return undefined
      const current = items[index] as T
      const next = {
        ...current,
        ...input,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: nowIso(),
      } as T
      items[index] = next
      writeAll(key, items)
      return next
    },
    remove: (id) => {
      const items = readAll<T>(key)
      const next = items.filter((item) => item.id !== id)
      if (next.length === items.length) return false
      writeAll(key, next)
      return true
    },
    removeWhere: (predicate) => {
      const items = readAll<T>(key)
      const next = items.filter((item) => !predicate(item))
      if (next.length === items.length) return 0
      writeAll(key, next)
      return items.length - next.length
    },
  }
}

export function keyExists(key: string): boolean {
  return localStorage.getItem(key) !== null
}

export function writeSeed<T>(key: string, items: T[]): void {
  writeAll(key, items)
}