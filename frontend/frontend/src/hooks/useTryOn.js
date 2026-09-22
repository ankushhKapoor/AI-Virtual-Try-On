import { useContext } from 'react'
import TryOnContext from '../context/tryOnStore'

function useTryOn() {
  const context = useContext(TryOnContext)
  if (!context) throw new Error('useTryOn must be used inside TryOnProvider')
  return context
}

export default useTryOn
