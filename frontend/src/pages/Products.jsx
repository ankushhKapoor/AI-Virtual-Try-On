import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import ProductGrid from '../components/ProductGrid'
import SearchBar from '../components/SearchBar'
import SectionHeading from '../components/SectionHeading'
import CategoryFilter from '../components/products/CategoryFilter'
import ProductFilters from '../components/products/ProductFilters'
import ProductSort from '../components/products/ProductSort'
import { mockProducts } from '../data/mockProducts'
import { toProductViewModel } from '../data/productViewModel'
import useWishlist from '../hooks/useWishlist'
import useTryOn from '../hooks/useTryOn'

const audiences = ['All', 'Women', 'Men', 'Kids', 'Unisex']
const defaultFilters = { price: [], size: [] }

function Products() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(defaultFilters)
  const [sort, setSort] = useState('recommended')
  const { toggleWishlist, isWishlisted } = useWishlist()
  const { selectProduct } = useTryOn()

  const search = searchParams.get('search') || ''
  const legacyCategory = searchParams.get('category')
  const category = audiences.includes(legacyCategory) ? legacyCategory : 'All'
  const audienceParam = searchParams.get('gender')
  const audience = audienceParam && audiences.includes(audienceParam) ? audienceParam : category
  const subcategory = searchParams.get('subcategory') || (audience !== 'All' && legacyCategory && !audiences.includes(legacyCategory) ? legacyCategory : '')
  const legacyGlobalCategory = audience === 'All' && legacyCategory && !audiences.includes(legacyCategory) ? legacyCategory : ''

  function updateSearch(value) {
    setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set('search', value); else next.delete('search'); return next }, { replace: true })
  }

  function updateAudience(value) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('subcategory')
      next.delete('category')
      if (value === 'All') next.delete('gender')
      else next.set('gender', value)
      return next
    }, { replace: true })
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }))
  }

  function clearAll() {
    setFilters(defaultFilters)
    setSearchParams({}, { replace: true })
  }

  const availableProducts = useMemo(() => mockProducts.map(toProductViewModel), [])
  const sizeOptions = useMemo(() => [...new Set(availableProducts.flatMap((product) => product.sizes))], [availableProducts])
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const matches = availableProducts.filter((product) => {
      const searchMatch = !normalizedSearch || [product.name, product.category, product.gender, product.color].some((value) => value.toLowerCase().includes(normalizedSearch))
      const audienceMatch = audience === 'All' || product.gender === audience
      const categoryMatch = subcategory ? product.category === subcategory : !legacyGlobalCategory || product.category === legacyGlobalCategory
      const priceMatch = !filters.price.length || filters.price.some((range) => (range === 'under-1000' && product.price < 1000) || (range === '1000-2000' && product.price >= 1000 && product.price <= 2000) || (range === '2000-3000' && product.price > 2000 && product.price <= 3000) || (range === 'above-3000' && product.price > 3000))
      const sizeMatch = !filters.size.length || filters.size.some((size) => product.sizes.includes(size))
      return searchMatch && audienceMatch && categoryMatch && priceMatch && sizeMatch
    })
    return [...matches].sort((first, second) => {
      if (sort === 'price-low') return first.price - second.price
      if (sort === 'price-high') return second.price - first.price
      if (sort === 'rating') return second.rating - first.rating
      if (sort === 'newest') return second.id.localeCompare(first.id)
      return 0
    })
  }, [availableProducts, audience, filters, legacyGlobalCategory, search, sort, subcategory])

  const activeFilterCount = Object.values(filters).flat().length
  const productsForGrid = filteredProducts.map((product) => ({ ...product, isWishlisted: isWishlisted(product.id) }))

  function startTryOn(product) {
    selectProduct(product)
    navigate('/upload', { state: { productId: product.id, productName: product.name } })
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><SectionHeading eyebrow="The Vesta collection" title="Explore Collection" description="Discover pieces you can visualize before you buy." /><div className="mt-10 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><SearchBar value={search} onChange={updateSearch} placeholder="Search for clothes..." /><ProductSort value={sort} onChange={setSort} /></div><div className="mt-7"><CategoryFilter categories={audiences} value={audience} onChange={updateAudience} /></div><div className="mt-8 flex flex-col gap-8 lg:flex-row"><ProductFilters filters={filters} sizeOptions={sizeOptions} onChange={updateFilter} onClear={clearAll} activeCount={activeFilterCount} /><section className="min-w-0 flex-1" aria-label="Product results"><div className="mb-5 flex items-center justify-between gap-4"><p className="text-sm text-muted"><strong className="text-ink">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}</p>{search ? <p className="truncate text-xs text-muted">Results for “{search}”</p> : null}</div>{filteredProducts.length ? <ProductGrid products={productsForGrid} columns={4} onWishlist={toggleWishlist} onTryOn={startTryOn} /> : <EmptyState title={search ? 'No products match your search.' : 'No products found'} message="Try changing your search or filters." action={<button type="button" onClick={clearAll} className="text-sm font-bold text-accent hover:text-accent-dark">Clear Filters</button>} />}</section></div></div></main><Footer /></div>
}

export default Products
