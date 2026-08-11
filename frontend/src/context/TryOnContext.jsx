import { useCallback, useEffect, useState } from 'react'
import TryOnContext from './tryOnStore'

function TryOnProvider({ children }) {
  const [userPhoto, setUserPhoto] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [tryOnResult, setTryOnResult] = useState(null)
  const [looks, setLooks] = useState([])
  const [favoriteLookId, setFavoriteLookId] = useState(null)
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vesta_tryon_history') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => () => {
    if (userPhoto?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(userPhoto.previewUrl)
  }, [userPhoto])

  useEffect(() => {
    localStorage.setItem('vesta_tryon_history', JSON.stringify(history))
  }, [history])

  const selectProduct = useCallback((product, selectedSize = null) => {
    setSelectedProduct({ ...product, selectedSize })
  }, [])

  const setPhoto = useCallback((file) => {
    const previewUrl = URL.createObjectURL(file)
    setUserPhoto({ fileName: file.name, fileType: file.type, fileSize: file.size, previewUrl })
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

  return <TryOnContext.Provider value={{ userPhoto, selectedProduct, selectProduct, setPhoto, clearPhoto, tryOnResult, setTryOnResult, looks, addLook, updateLook, removeLook, favoriteLookId, chooseFavorite, history, updateHistoryLook, removeHistoryLook }}>{children}</TryOnContext.Provider>
}

export default TryOnProvider
