import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import Badge from './Badge'
import TryOnButton from './TryOnButton'
import WishlistButton from './WishlistButton'
import useTryOn from '../hooks/useTryOn'
import SafeImage from './SafeImage'

function ProductCard({ product, onWishlist, onTryOn, className = '' }) {
  const { id, image, image_url: imageUrl, name, title, price, currency, category, isWishlisted = false, alt = title || name, badge, rating, visualClass = 'bg-accent-soft' } = product
  const displayName = title || name
  const displayImage = imageUrl || image
  const displayPrice = typeof price === 'number' && currency ? `${currency}${currency.length > 2 ? ' ' : ''}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Price unavailable'
  const navigate = useNavigate()
  const { selectProduct } = useTryOn()

  function handleTryOn() {
    selectProduct(product)
    if (onTryOn) onTryOn(product)
    else navigate('/upload', { state: { productId: product.id, productName: product.name } })
  }

  return (
    <article className={`group overflow-hidden rounded-md border border-line bg-surface transition-shadow duration-300 hover:shadow-[var(--shadow-soft)] ${className}`}>
      <div className={`relative aspect-[3/4] overflow-hidden bg-canvas ${visualClass}`}>
        <Link to={`/products/${id}`} aria-label={`View ${displayName}`} className="block h-full"><SafeImage src={displayImage} alt={alt || displayName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" fallbackClassName="h-full w-full" /></Link>
        {badge ? <div className="absolute left-3 top-3"><Badge variant="accent">{badge}</Badge></div> : null}
        <div className="absolute right-3 top-3"><WishlistButton isWishlisted={isWishlisted} onToggle={onWishlist} /></div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {category ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">{category}</p> : null}
            <Link to={`/products/${id}`} className="font-semibold text-ink hover:text-accent">{displayName}</Link>
          </div>
          <ArrowUpRight size={17} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><p className="text-sm font-semibold text-ink">{displayPrice}</p>{rating ? <span className="text-xs text-muted">★ {rating}</span> : null}</div>
          <TryOnButton onClick={handleTryOn} />
        </div>
      </div>
    </article>
  )
}

export default ProductCard
