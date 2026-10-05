import Badge from '../Badge'
import SafeImage from '../SafeImage'

function SelectedProduct({ product, className = '' }) {
  if (!product) return null
  const displayName = product.title || product.name || 'Selected Clothing'
  const displayImage = product.image || product.image_url || product.thumbnail || (Array.isArray(product.images) && product.images[0]) || null
  const price = typeof product.price === 'number'
    ? `₹${product.price.toLocaleString('en-IN')}`
    : (product.price || 'Price unavailable')

  return (
    <article className={`overflow-hidden rounded-md border border-line bg-surface ${className}`}>
      <div className={`aspect-[3/4] bg-canvas ${product.visualClass || 'bg-accent-soft'}`}>
        <SafeImage
          src={displayImage}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {product.category ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent truncate">
                {product.category}
              </p>
            ) : null}
            <h3 className="mt-1 font-semibold text-ink line-clamp-2" title={displayName}>
              {displayName}
            </h3>
          </div>
          {product.badge ? <Badge variant="accent">{product.badge}</Badge> : null}
        </div>
        <p className="text-sm font-semibold text-ink">{price}</p>
      </div>
    </article>
  )
}

export default SelectedProduct
