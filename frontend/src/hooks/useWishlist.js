import { useCallback, useEffect, useState } from 'react'

const storageKey = 'vesta_wishlist'

function readWishlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem('vesta-wishlist') || '[]')
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState(readWishlist)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(wishlistIds))
    window.dispatchEvent(new CustomEvent('vesta:wishlist-change', { detail: wishlistIds }))
  }, [wishlistIds])

  useEffect(() => {
    function syncWishlist(event) {
      if (event.detail) setWishlistIds(event.detail)
    }
    window.addEventListener('vesta:wishlist-change', syncWishlist)
    return () => window.removeEventListener('vesta:wishlist-change', syncWishlist)
  }, [])

  const toggleWishlist = useCallback((productId) => {
    setWishlistIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])
  }, [])

  return { wishlistIds, toggleWishlist, isWishlisted: (productId) => wishlistIds.includes(productId) }
}

export default useWishlist
