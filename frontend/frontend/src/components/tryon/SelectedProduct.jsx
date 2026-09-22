import Badge from '../Badge'

function SelectedProduct({ product, className = '' }) {
  if (!product) return null
  const price = typeof product.price === 'number' ? `₹${product.price.toLocaleString('en-IN')}` : product.price
  return <article className={`overflow-hidden rounded-md border border-line bg-surface ${className}`}><div className={`aspect-[3/4] bg-canvas ${product.visualClass || 'bg-accent-soft'}`}>{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : null}</div><div className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{product.category}</p><h3 className="mt-1 font-semibold text-ink">{product.name}</h3></div>{product.badge ? <Badge variant="accent">{product.badge}</Badge> : null}</div><p className="text-sm font-semibold text-ink">{price}</p></div></article>
}

export default SelectedProduct
