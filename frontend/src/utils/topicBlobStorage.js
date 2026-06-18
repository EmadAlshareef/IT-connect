const DB_NAME = 'ts-topic-media-v1'
const STORE_NAME = 'blobs'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open topic media database.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function putTopicBlob(key, dataUrl) {
  const id = String(key ?? '').trim()
  if (!id || !dataUrl) return false
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Failed to store topic media.'))
    }
    tx.objectStore(STORE_NAME).put(dataUrl, id)
  })
}

export async function getTopicBlob(key) {
  const id = String(key ?? '').trim()
  if (!id) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Failed to read topic media.'))
    }
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => {
      db.close()
      resolve(typeof request.result === 'string' ? request.result : null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error ?? new Error('Failed to read topic media.'))
    }
  })
}

export async function deleteTopicBlobs(keys) {
  const ids = (keys ?? []).map((k) => String(k ?? '').trim()).filter(Boolean)
  if (ids.length === 0) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Failed to delete topic media.'))
    }
    for (const id of ids) store.delete(id)
  })
}

export function estimateDataUrlBytes(dataUrl) {
  const value = String(dataUrl ?? '')
  if (!value) return 0
  const base64 = value.includes(',') ? value.split(',')[1] : value
  return Math.ceil((base64.length * 3) / 4)
}
