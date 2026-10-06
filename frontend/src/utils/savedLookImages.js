const DATABASE_NAME = 'trayo-saved-look-images'
const DATABASE_VERSION = 1
const STORE_NAME = 'images'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readImageBlob(image) {
  if (image instanceof Blob) return image
  if (!image) return null

  const response = await fetch(image)
  if (!response.ok) throw new Error('Could not preserve this image.')
  return response.blob()
}

async function saveImage(key, image) {
  const blob = await readImageBlob(image)
  if (!blob) return null

  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(blob, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    return key
  } finally {
    database.close()
  }
}

export function saveOriginalPhoto(lookId, photo) {
  return saveImage(`before:${lookId}`, photo?.file || photo?.previewUrl)
}

export function saveResultImage(lookId, resultImage) {
  return saveImage(`after:${lookId}`, resultImage)
}

export async function loadOriginalPhoto(key) {
  if (!key) return null
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function deleteOriginalPhoto(key) {
  if (!key) return
  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}
