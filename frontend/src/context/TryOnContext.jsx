import { useCallback, useEffect, useState } from 'react'
import TryOnContext from './tryOnStore'

function TryOnProvider({ children }) {
  const [userPhoto, setUserPhoto] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [tryOnResult, setTryOnResult] = useState(null)
  const [processingState, setProcessingState] = useState('IDLE')
  const [processingError, setProcessingError] = useState('')
  const [looks, setLooks] = useState([])

  const [favoriteLookId, setFavoriteLookId] = useState(null)
  useEffect(() => () => {
    if (userPhoto?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(userPhoto.previewUrl)
  }, [userPhoto])

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
    setTryOnResult(look)
  }, [])

  const updateLook = useCallback((lookId, updates) => {
    setLooks((current) => current.map((look) => look.id === lookId ? { ...look, ...updates } : look))
    setTryOnResult((current) => current?.id === lookId ? { ...current, ...updates } : current)
  }, [])

  const removeLook = useCallback((lookId) => {
    setLooks((current) => current.filter((look) => look.id !== lookId))
    setFavoriteLookId((current) => current === lookId ? null : current)
  }, [])

  const chooseFavorite = useCallback((lookId) => {
    setFavoriteLookId(lookId)
    setLooks((current) => current.map((look) => ({ ...look, favorite: look.id === lookId })))
  }, [])

  return <TryOnContext.Provider value={{ userPhoto, selectedProduct, selectProduct, setPhoto, clearPhoto, tryOnResult, setTryOnResult, processingState, setProcessingState, processingError, setProcessingError, looks, addLook, updateLook, removeLook, favoriteLookId, chooseFavorite }}>{children}</TryOnContext.Provider>

}

export default TryOnProvider
