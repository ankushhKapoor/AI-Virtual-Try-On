import { ArrowRight, Check, Heart, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import ProductGrid from '../components/ProductGrid'
import WishlistButton from '../components/WishlistButton'
import Breadcrumbs from '../components/products/Breadcrumbs'
import ProductGallery from '../components/products/ProductGallery'
import SizeSelector from '../components/products/SizeSelector'
import { mockProducts } from '../data/mockProducts'
import useWishlist from '../hooks/useWishlist'
import useTryOn from '../hooks/useTryOn'

function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = mockProducts.find((item) => item.id === id)
  const { toggleWishlist, isWishlisted } = useWishlist()
  const { selectProduct } = useTryOn()
  const [selectedSize, setSelectedSize] = useState(product?.sizes.find((size) => size === 'M') || product?.sizes[0] || '')

  if (!product) return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><EmptyState title="Product not found" message="This style may have moved, but there are plenty more to explore." action={<Link to="/products"><Button icon={ArrowRight}>Back to Shop</Button></Link>} /></main><Footer /></div>

  const related = mockProducts.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4)
  const displayPrice = `₹${product.price.toLocaleString('en-IN')}`

  function startTryOn() {
    selectProduct(product)
    navigate('/upload', { state: { productId: product.id, productName: product.name, size: selectedSize } })
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><Breadcrumbs items={[{ label: 'Shop', to: '/products' }, { label: product.category, to: `/products?category=${product.category}` }, { label: product.name }]} /><div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:gap-16"><ProductGallery product={product} /><section className="flex flex-col"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{product.category} · {product.gender}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">{product.name}</h1></div><WishlistButton isWishlisted={isWishlisted(product.id)} onToggle={() => toggleWishlist(product.id)} /></div><div className="mt-5 flex flex-wrap items-center gap-3"><p className="text-xl font-semibold text-ink">{displayPrice}</p><span className="h-4 w-px bg-line-strong" aria-hidden="true" /><span className="inline-flex items-center gap-1 text-sm text-muted"><Star size={15} className="fill-[#b8893f] text-[#b8893f]" aria-hidden="true" /> {product.rating} ({product.reviewCount} reviews)</span></div><p className="mt-6 text-sm leading-7 text-muted">{product.description}</p><div className="mt-8 space-y-7 border-y border-line py-7"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-ink">Color</span><span className="text-muted">{product.color}</span></div><SizeSelector sizes={product.sizes} selectedSize={selectedSize} onChange={setSelectedSize} /><div className="flex items-center gap-2 text-sm text-success"><Check size={16} aria-hidden="true" /> {product.available ? 'In stock and ready to try' : 'Currently unavailable'}</div></div><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button size="lg" icon={Heart} variant="outline" onClick={() => toggleWishlist(product.id)} className="flex-1">{isWishlisted(product.id) ? 'Saved to Wishlist' : 'Save to Wishlist'}</Button><Button size="lg" onClick={startTryOn} className="flex-1">Try On</Button></div><dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-7 text-sm"><div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Material</dt><dd className="mt-1 text-muted">{product.material}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Available sizes</dt><dd className="mt-1 text-muted">{product.sizes.join(', ')}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Care</dt><dd className="mt-1 text-muted">Gentle machine wash</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">Category</dt><dd className="mt-1 text-muted">{product.category}</dd></div></dl></section></div>{related.length ? <section className="mt-20 border-t border-line pt-12"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Keep exploring</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">You May Also Like</h2></div><Link to={`/products?category=${product.category}`} className="hidden items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark sm:inline-flex">View collection <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="mt-8"><ProductGrid products={related.map((item) => ({ ...item, isWishlisted: isWishlisted(item.id) }))} columns={4} onWishlist={toggleWishlist} onTryOn={(item) => { selectProduct(item); navigate('/upload', { state: { productId: item.id, productName: item.name } }) }} /></div></section> : null}</div></main><Footer /></div>
}

export default ProductDetails
