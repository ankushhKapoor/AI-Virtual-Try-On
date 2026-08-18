import ProductCard from './ProductCard'
import EmptyState from './EmptyState'

function ProductGrid({ products = [], onWishlist, onTryOn, columns = 4, emptyState, className = '' }) {
  if (!products.length) return emptyState || <EmptyState title="No products found" message="Try adjusting your filters or search terms." />
  const columnClass = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns] || 'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid grid-cols-1 gap-x-5 gap-y-8 ${columnClass} ${className}`}>
      {products.map((product) => <ProductCard key={product.id ?? product.name} product={product} onWishlist={() => onWishlist?.(product.id)} onTryOn={() => onTryOn?.(product)} />)}
    </div>
  )
}

export default ProductGrid
