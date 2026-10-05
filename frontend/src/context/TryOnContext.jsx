import { useCallback, useEffect, useState } from 'react'
import TryOnContext from './tryOnStore'

const HISTORY_STORAGE_KEY = 'vesta_tryon_history'

function readHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
    return Array.isArray(history) ? history : []
  } catch {
    return []
  }
}

function historyMetadata(looks) {
  // Generated images can be several MB once encoded as data URLs. Keeping them
  // in localStorage exceeds browser quota and can crash the result route after
  // a successful generation. The current session retains the full image for
  // viewing/downloading; history intentionally retains only lightweight data.
  return looks.map(({ userPhoto, resultImage, ...look }) => ({
    ...look,
    userPhoto: userPhoto
      ? {
          fileName: userPhoto.fileName,
          fileType: userPhoto.fileType,
          fileSize: userPhoto.fileSize,
        }
      : null,
    resultImage: null,
    imageAvailableInSession: Boolean(resultImage),
  }))
}

function TryOnProvider({ children }) {
  const [userPhoto, setUserPhoto] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [tryOnResult, setTryOnResult] = useState(null)
  const [processingState, setProcessingState] = useState('IDLE')
  const [processingError, setProcessingError] = useState('')
  const [looks, setLooks] = useState([])

  const [favoriteLookId, setFavoriteLookId] = useState(null)
  const [history, setHistory] = useState(readHistory)

  useEffect(() => () => {
    if (userPhoto?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(userPhoto.previewUrl)
  }, [userPhoto])

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyMetadata(history)))
    } catch (error) {
      // History must never prevent the current result page from rendering.
      console.warn('Unable to save try-on history locally:', error)
    }
  }, [history])

  const selectProduct = useCallback((product, selectedSize = null) => {
    setSelectedProduct({ ...product, selectedSize })
  }, [])

  const setPhoto = useCallback((file) => {
    const previewUrl = URL.createObjectURL(file)
    setUserPhoto({ fileName: file.name, fileType: file.type, fileSize: file.size, previewUrl, file })
  }, [])

  const clearPhoto = useCallback(() => {
    setUserPhoto(null)
  }, [])

  const addLook = useCallback((look) => {
    setLooks((current) => current.some((item) => item.id === look.id) ? current : [...current, look])
    setHistory((current) => current.some((item) => item.id === look.id) ? current : [...current, look])
    setTryOnResult(look)
  }, [])

  const updateLook = useCallback((lookId, updates) => {
    setLooks((current) => current.map((look) => look.id === lookId ? { ...look, ...updates } : look))
    setHistory((current) => current.map((look) => look.id === lookId ? { ...look, ...updates } : look))
    setTryOnResult((current) => current?.id === lookId ? { ...current, ...updates } : current)
  }, [])

  const removeLook = useCallback((lookId) => {
    setLooks((current) => current.filter((look) => look.id !== lookId))
    setFavoriteLookId((current) => current === lookId ? null : current)
  }, [])

  const updateHistoryLook = useCallback((lookId, updates) => {
    setHistory((current) => current.map((look) => look.id === lookId ? { ...look, ...updates } : look))
  }, [])

  const removeHistoryLook = useCallback((lookId) => {
    setHistory((current) => current.filter((look) => look.id !== lookId))
  }, [])

  const chooseFavorite = useCallback((lookId) => {
    setFavoriteLookId(lookId)
    setLooks((current) => current.map((look) => ({ ...look, favorite: look.id === lookId })))
  }, [])

  return <TryOnContext.Provider value={{ userPhoto, selectedProduct, selectProduct, setPhoto, clearPhoto, tryOnResult, setTryOnResult, processingState, setProcessingState, processingError, setProcessingError, looks, addLook, updateLook, removeLook, favoriteLookId, chooseFavorite, history, updateHistoryLook, removeHistoryLook }}>{children}</TryOnContext.Provider>

}

export default TryOnProvider
