import { useCallback, useEffect, useState } from 'react'
import { deleteOriginalPhoto, loadOriginalPhoto, saveOriginalPhoto, saveResultImage } from '../utils/savedLookImages'
import { downloadSavedLooksBackup, restoreSavedLooksBackup } from '../utils/savedLookTransfer'

const storageKey = 'vesta_saved_looks'

function readSavedLooks() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem('vesta-saved-looks') || '[]')
  } catch {
    return []
  }
}

function useSavedLooks() {
  const [savedLooks, setSavedLooks] = useState(readSavedLooks)
  const [photoUrls, setPhotoUrls] = useState({})
  const [resultUrls, setResultUrls] = useState({})

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedLooks))
      window.dispatchEvent(new CustomEvent('vesta:saved-looks-change', { detail: savedLooks }))
    } catch (error) {
      console.error('Unable to save saved-look metadata:', error)
    }
  }, [savedLooks])

  useEffect(() => {
    function syncSavedLooks(event) {
      if (event.detail) setSavedLooks(event.detail)
    }
    window.addEventListener('vesta:saved-looks-change', syncSavedLooks)
    return () => window.removeEventListener('vesta:saved-looks-change', syncSavedLooks)
  }, [])

  // Older saves kept large data-URL results in localStorage. Move them once
  // into IndexedDB so existing saved looks remain available without consuming
  // the localStorage quota needed for future saves.
  useEffect(() => {
    let cancelled = false

    async function migrateLegacyResults() {
      const legacyLooks = savedLooks.filter((look) => look.resultImage && !look.resultImageKey)
      if (!legacyLooks.length) return

      const migratedKeys = new Map()
      for (const look of legacyLooks) {
        try {
          const key = await saveResultImage(look.id, look.resultImage)
          if (key) migratedKeys.set(look.id, key)
        } catch (error) {
          console.warn('Unable to move a saved result image to IndexedDB:', error)
        }
      }

      if (!cancelled && migratedKeys.size) {
        setSavedLooks((current) => current.map((look) => {
          const key = migratedKeys.get(look.id)
          return key ? { ...look, resultImage: null, resultImageKey: key } : look
        }))
      }
    }

    migrateLegacyResults()
    return () => { cancelled = true }
  }, [savedLooks])

  useEffect(() => {
    let cancelled = false
    const urls = []

    async function restoreSavedPhotos() {
      const restored = {}
      const restoredResults = {}
      for (const look of savedLooks) {
        try {
          const beforeBlob = await loadOriginalPhoto(look.userPhoto?.savedImageKey)
          if (beforeBlob) {
            const url = URL.createObjectURL(beforeBlob)
            urls.push(url)
            restored[look.id] = url
          }
          const afterBlob = await loadOriginalPhoto(look.resultImageKey)
          if (afterBlob) {
            const url = URL.createObjectURL(afterBlob)
            urls.push(url)
            restoredResults[look.id] = url
          }
        } catch (error) {
          console.warn('Unable to restore a saved look image:', error)
        }
      }
      if (!cancelled) {
        setPhotoUrls(restored)
        setResultUrls(restoredResults)
      }
    }

    restoreSavedPhotos()
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [savedLooks])

  const saveLook = useCallback(async (look) => {
    if (!look?.id) return false
    if (savedLooks.some((item) => item.id === look.id)) return true

    let savedImageKey = null
    let resultImageKey = null
    try {
      savedImageKey = await saveOriginalPhoto(look.id, look.userPhoto)
      resultImageKey = await saveResultImage(look.id, look.resultImage)
    } catch (error) {
      console.error('Unable to save the original photo for this look:', error)
      return false
    }

    const savedLook = {
      ...look,
      userPhoto: look.userPhoto
        ? {
            fileName: look.userPhoto.fileName,
            fileType: look.userPhoto.fileType,
            fileSize: look.userPhoto.fileSize,
            savedImageKey,
          }
        : null,
      // Image binary data belongs in IndexedDB, not quota-limited localStorage.
      resultImage: null,
      resultImageKey,
    }
    setSavedLooks((current) => current.some((item) => item.id === look.id) ? current : [...current, savedLook])
    return true
  }, [savedLooks])

  const removeSavedLook = useCallback(async (lookId) => {
    const look = savedLooks.find((item) => item.id === lookId)
    try {
      await deleteOriginalPhoto(look?.userPhoto?.savedImageKey)
      await deleteOriginalPhoto(look?.resultImageKey)
    } catch (error) {
      console.warn('Unable to remove saved original photo:', error)
    }
    setSavedLooks((current) => current.filter((item) => item.id !== lookId))
  }, [savedLooks])

  const exportSavedLooks = useCallback(() => downloadSavedLooksBackup(savedLooks), [savedLooks])

  const importSavedLooks = useCallback(async (file) => {
    const restoredLooks = await restoreSavedLooksBackup(file, savedLooks.map((look) => look.id))
    if (restoredLooks.length) setSavedLooks((current) => [...current, ...restoredLooks])
    return restoredLooks.length
  }, [savedLooks])

  const hydratedLooks = savedLooks.map((look) => ({
    ...look,
    userPhoto: photoUrls[look.id]
      ? { ...look.userPhoto, previewUrl: photoUrls[look.id] }
      : look.userPhoto,
    resultImage: resultUrls[look.id] || look.resultImage || null,
  }))

  return { savedLooks: hydratedLooks, saveLook, removeSavedLook, exportSavedLooks, importSavedLooks, isSaved: (lookId) => savedLooks.some((look) => look.id === lookId) }
}

export default useSavedLooks
