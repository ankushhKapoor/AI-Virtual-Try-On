import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import SafeImage from '../SafeImage'
import { resolveBackendUrl } from '../../services/urls'

function ProductGallery({ product = {} }) {
  const fallbackImage = product.image || product.image_url || product.thumbnail || null
  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : fallbackImage
      ? [fallbackImage]
      : []

  const images = rawImages.length > 0 ? rawImages : []
  const [selectedIndex, setSelectedIndex] = useState(0)

  function move(step) {
    if (!images.length) return
    setSelectedIndex((current) => (current + step + images.length) % images.length)
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-canvas border border-line text-subtle">
        <ImageOff size={32} />
      </div>
    )
  }

  const currentImage = images[selectedIndex] || images[0]

  return (
    <div className="grid gap-3 sm:grid-cols-[5rem_1fr] sm:gap-4">
      {images.length > 1 ? (
        <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 overflow-hidden rounded-md border ${
                selectedIndex === index ? 'border-accent ring-1 ring-accent' : 'border-line'
              }`}
              aria-label={`Show product image ${index + 1}`}
            >
              <img src={resolveBackendUrl(image)} alt="" className="size-20 object-cover sm:size-[4.5rem]" />
            </button>
          ))}
        </div>
      ) : null}
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-md bg-canvas ${
          images.length > 1 ? 'order-1 sm:order-2' : ''
        }`}
      >
        <SafeImage
          src={currentImage}
          alt={product.title || product.name || 'Product'}
          className="h-full w-full object-cover"
        />
        {images.length > 1 ? (
          <div className="absolute inset-x-3 bottom-3 flex justify-between">
            <button
              type="button"
              onClick={() => move(-1)}
              className="inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm hover:text-accent"
              aria-label="Previous product image"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm hover:text-accent"
              aria-label="Next product image"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ProductGallery
