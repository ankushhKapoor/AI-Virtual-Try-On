import { Heart } from 'lucide-react'

function WishlistButton({ isWishlisted = false, onToggle, label = 'Add to wishlist', className = '' }) {
  const accessibleLabel = isWishlisted ? 'Remove from wishlist' : label

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={accessibleLabel}
      aria-pressed={isWishlisted}
      className={`inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent ${isWishlisted ? 'border-accent text-accent' : ''} ${className}`}
    >
      <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

export default WishlistButton
