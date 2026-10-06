import { useCallback, useEffect, useState } from 'react'
import { deleteOriginalPhoto, loadOriginalPhoto, saveOriginalPhoto } from '../utils/savedLookImages'

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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(savedLooks))
    window.dispatchEvent(new CustomEvent('vesta:saved-looks-change', { detail: savedLooks }))
  }, [savedLooks])

  useEffect(() => {
    function syncSavedLooks(event) {
      if (event.detail) setSavedLooks(event.detail)
    }
    window.addEventListener('vesta:saved-looks-change', syncSavedLooks)
    return () => window.removeEventListener('vesta:saved-looks-change', syncSavedLooks)
  }, [])

  useEffect(() => {
    let cancelled = false
    const urls = []

    async function restoreSavedPhotos() {
      const restored = {}
      for (const look of savedLooks) {
        const key = look.userPhoto?.savedImageKey
        if (!key) continue
        try {
          const blob = await loadOriginalPhoto(key)
          if (blob) {
            const url = URL.createObjectURL(blob)
            urls.push(url)
            restored[look.id] = url
          }
        } catch (error) {
          console.warn('Unable to restore a saved original photo:', error)
        }
      }
      if (!cancelled) setPhotoUrls(restored)
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
    try {
      savedImageKey = await saveOriginalPhoto(look.id, look.userPhoto)
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
    }
    setSavedLooks((current) => current.some((item) => item.id === look.id) ? current : [...current, savedLook])
    return true
  }, [savedLooks])

  const removeSavedLook = useCallback(async (lookId) => {
    const look = savedLooks.find((item) => item.id === lookId)
    try {
      await deleteOriginalPhoto(look?.userPhoto?.savedImageKey)
    } catch (error) {
      console.warn('Unable to remove saved original photo:', error)
    }
    setSavedLooks((current) => current.filter((item) => item.id !== lookId))
  }, [savedLooks])

  const hydratedLooks = savedLooks.map((look) => photoUrls[look.id]
    ? { ...look, userPhoto: { ...look.userPhoto, previewUrl: photoUrls[look.id] } }
    : look)

  return { savedLooks: hydratedLooks, saveLook, removeSavedLook, isSaved: (lookId) => savedLooks.some((look) => look.id === lookId) }
}

export default useSavedLooks
