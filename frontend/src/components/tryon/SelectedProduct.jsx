import Badge from '../Badge'

function SelectedProduct({ product, className = '' }) {
  if (!product) return null
  const name = product.title || product.name || 'Selected product'
  const image = product.image_url || product.image
  const price = typeof product.price === 'number' && product.currency ? `${product.currency}${product.currency.length > 2 ? ' ' : ''}${product.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Price unavailable'
  return <article className={`overflow-hidden rounded-md border border-line bg-surface ${className}`}><div className={`aspect-[3/4] bg-canvas ${product.visualClass || 'bg-accent-soft'}`}>{image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-accent" role="img" aria-label={`${name} image unavailable`}>No image</div>}</div><div className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{product.category || 'Category unavailable'}</p><h3 className="mt-1 font-semibold text-ink">{name}</h3></div>{product.badge ? <Badge variant="accent">{product.badge}</Badge> : null}</div><p className="text-sm font-semibold text-ink">{price}</p></div></article>
}

export default SelectedProduct
