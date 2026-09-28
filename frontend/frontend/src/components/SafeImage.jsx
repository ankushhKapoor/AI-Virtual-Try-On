import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * SafeImage – renders an <img> that gracefully falls back to an icon
 * when src is missing or the image fails to load.
 *
 * The img element is the root element so callers can pass any className
 * (object-cover, h-full w-full, transitions, etc.) directly to it.
 */
function SafeImage({ src, alt, className = '', fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false)

  // Reset failed state if src changes (new product selected, etc.)
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <span
        className={`flex items-center justify-center bg-accent-soft text-accent ${fallbackClassName || className}`}
        role="img"
        aria-label={alt ? `${alt} unavailable` : 'Image unavailable'}
      >
        <ImageOff size={22} aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt || 'Product image'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

export default SafeImage
