import { ImageOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

function SafeImage({ src, alt, className = '', fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(Boolean(src))

  if (!src || failed) return <span className={`flex items-center justify-center bg-accent-soft text-accent ${fallbackClassName || className}`} role="img" aria-label={alt ? `${alt} unavailable` : 'Image unavailable'}><ImageOff size={22} aria-hidden="true" /></span>

  return <span className={`relative block overflow-hidden ${className}`}><img src={src} alt={alt} onLoad={() => setLoading(false)} onError={() => setFailed(true)} className={`h-full w-full ${loading ? 'opacity-0' : 'opacity-100'} ${className}`} />{loading ? <span className="absolute inset-0 flex items-center justify-center bg-accent-soft text-accent" role="status" aria-label="Loading image"><LoaderCircle size={22} className="animate-spin" aria-hidden="true" /></span> : null}</span>
}

export default SafeImage
