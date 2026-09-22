import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import Badge from './Badge'
import TryOnButton from './TryOnButton'
import WishlistButton from './WishlistButton'
import useTryOn from '../hooks/useTryOn'
import SafeImage from './SafeImage'

function ProductCard({ product, onWishlist, onTryOn, className = '' }) {
  const { id, image, name, price, category, isWishlisted = false, alt = name, badge, rating, visualClass = 'bg-accent-soft' } = product
  const displayPrice = typeof price === 'number' ? `₹${price.toLocaleString('en-IN')}` : price
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
        <Link to={`/products/${id}`} aria-label={`View ${name}`} className="block h-full">{image ? <SafeImage src={image} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" fallbackClassName="h-full w-full" /> : <div className="h-full w-full bg-inherit" aria-label={`${name} image placeholder`} role="img" />}</Link>
        {badge ? <div className="absolute left-3 top-3"><Badge variant="accent">{badge}</Badge></div> : null}
        <div className="absolute right-3 top-3"><WishlistButton isWishlisted={isWishlisted} onToggle={onWishlist} /></div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {category ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">{category}</p> : null}
            <Link to={`/products/${id}`} className="font-semibold text-ink hover:text-accent">{name}</Link>
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
