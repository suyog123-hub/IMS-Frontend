const DB_NAME = 'IMS_ImageDB'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface ImageRecord {
  id: string
  blob: Blob
  updatedAt: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

export async function saveImageBlob(id: string, blob: Blob): Promise<string> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record: ImageRecord = {
      id,
      blob,
      updatedAt: new Date().toISOString(),
    }
    const request = store.put(record)

    request.onsuccess = () => resolve(id)
    request.onerror = () => reject(request.error)
  })
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  if (!id) return null
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const record = request.result as ImageRecord | undefined
        resolve(record ? record.blob : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function deleteImageBlob(id: string): Promise<void> {
  if (!id) return
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch {
    // Ignore errors on delete
  }
}

const objectUrlCache = new Map<string, string>()

export async function getImageObjectUrl(id: string): Promise<string | null> {
  if (!id) return null
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!
  }

  const blob = await getImageBlob(id)
  if (!blob) return null

  const url = URL.createObjectURL(blob)
  objectUrlCache.set(id, url)
  return url
}
