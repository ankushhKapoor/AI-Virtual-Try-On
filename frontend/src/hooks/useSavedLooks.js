import { useCallback, useEffect, useState } from 'react'

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

  const saveLook = useCallback((look) => {
    setSavedLooks((current) => {
      if (current.some((item) => item.id === look.id)) return current
      return [...current, look]
    })
  }, [])

  const removeSavedLook = useCallback((lookId) => {
    setSavedLooks((current) => current.filter((look) => look.id !== lookId))
  }, [])

  return { savedLooks, saveLook, removeSavedLook, isSaved: (lookId) => savedLooks.some((look) => look.id === lookId) }
}

export default useSavedLooks
