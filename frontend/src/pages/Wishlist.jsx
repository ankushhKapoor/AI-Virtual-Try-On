import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import EmptyState from '../components/EmptyState'
import ProductGrid from '../components/ProductGrid'
import SectionHeading from '../components/SectionHeading'
import { AccountNav } from '../components/account'
import { mockProducts } from '../data/mockProducts'
import useTryOn from '../hooks/useTryOn'
import useWishlist from '../hooks/useWishlist'
import { useNavigate } from 'react-router-dom'

function Wishlist() {
  const navigate = useNavigate()
  const { wishlistIds, toggleWishlist } = useWishlist()
  const { selectProduct } = useTryOn()
  const products = mockProducts.filter((product) => wishlistIds.includes(product.id)).map((product) => ({ ...product, isWishlisted: true }))

  function tryOn(product) {
    selectProduct(product)
    navigate('/upload', { state: { productId: product.id, productName: product.name } })
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><div className="mb-10"><SectionHeading eyebrow="Your personal edit" title="My Wishlist" description="Keep the pieces you love in one place." /></div><div className="flex flex-col gap-8 lg:flex-row"><AccountNav wishlistCount={products.length} /><section className="min-w-0 flex-1">{products.length ? <><div className="mb-5 text-sm text-muted"><strong className="text-ink">{products.length}</strong> {products.length === 1 ? 'item' : 'items'}</div><ProductGrid products={products} columns={4} onWishlist={(product) => toggleWishlist(product.id)} onTryOn={tryOn} /></> : <EmptyState title="Your Wishlist is Empty" message="Save pieces you love and come back to them anytime." action={<button type="button" onClick={() => navigate('/products')} className="text-sm font-bold text-accent hover:text-accent-dark">Explore Collection</button>} />}</section></div></div></main><Footer /></div>
}

export default Wishlist
