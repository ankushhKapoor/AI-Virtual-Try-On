import { ImageOff } from 'lucide-react'
import { useState } from 'react'

function SafeImage({ src, alt, className = '', fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) return <span className={`flex items-center justify-center bg-accent-soft text-accent ${fallbackClassName || className}`} role="img" aria-label={alt ? `${alt} unavailable` : 'Image unavailable'}><ImageOff size={22} aria-hidden="true" /></span>

  return <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
}

export default SafeImage
