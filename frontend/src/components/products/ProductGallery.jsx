import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import SafeImage from '../SafeImage'

function ProductGallery({ product }) {
  const images = product.images?.length ? product.images : [product.image_url || product.image].filter(Boolean)
  const [selectedIndex, setSelectedIndex] = useState(0)
  function move(step) { setSelectedIndex((current) => (current + step + images.length) % images.length) }

  return <div className="grid gap-3 sm:grid-cols-[5rem_1fr] sm:gap-4"><div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedIndex(index)} className={`shrink-0 overflow-hidden rounded-md border ${selectedIndex === index ? 'border-accent ring-1 ring-accent' : 'border-line'}`} aria-label={`Show product image ${index + 1}`}><SafeImage src={image} alt="" className="size-20 object-cover sm:size-[4.5rem]" fallbackClassName="size-20 sm:size-[4.5rem]" /></button>)}</div><div className="relative aspect-[3/4] overflow-hidden rounded-md bg-canvas"><SafeImage src={images[selectedIndex]} alt={product.title || product.name || 'Product'} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />{images.length > 1 ? <div className="absolute inset-x-3 bottom-3 flex justify-between"><button type="button" onClick={() => move(-1)} className="inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm hover:text-accent" aria-label="Previous product image"><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" onClick={() => move(1)} className="inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm hover:text-accent" aria-label="Next product image"><ChevronRight size={18} aria-hidden="true" /></button></div> : null}</div></div>
}

export default ProductGallery
