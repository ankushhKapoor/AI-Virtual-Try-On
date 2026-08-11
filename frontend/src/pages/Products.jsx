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
import useWishlist from '../hooks/useWishlist'
import useTryOn from '../hooks/useTryOn'

const categories = ['All', 'Women', 'Men', 'Dresses', 'Tops', 'Shirts', 'Jeans', 'Jackets', 'Blazers', 'Skirts', 'T-Shirts']
const defaultFilters = { price: [], gender: [], color: [], size: [] }

function Products() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = categories.includes(searchParams.get('category')) ? searchParams.get('category') : 'All'
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(initialCategory)
  const [filters, setFilters] = useState(defaultFilters)
  const [sort, setSort] = useState('recommended')
  const { toggleWishlist, isWishlisted } = useWishlist()
  const { selectProduct } = useTryOn()

  function updateSearch(value) {
    setSearch(value)
    setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set('search', value); else next.delete('search'); return next }, { replace: true })
  }

  function updateCategory(value) {
    setCategory(value)
    setSearchParams((current) => { const next = new URLSearchParams(current); if (value === 'All') next.delete('category'); else next.set('category', value); return next }, { replace: true })
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }))
  }

  function clearAll() {
    setSearch('')
    setCategory('All')
    setFilters(defaultFilters)
    setSearchParams({}, { replace: true })
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const matches = mockProducts.filter((product) => {
      const searchMatch = !normalizedSearch || [product.name, product.category, product.gender, product.color].some((value) => value.toLowerCase().includes(normalizedSearch))
      const categoryMatch = category === 'All' || product.category === category || product.gender === category
      const priceMatch = !filters.price.length || filters.price.some((range) => (range === 'under-1000' && product.price < 1000) || (range === '1000-2000' && product.price >= 1000 && product.price <= 2000) || (range === '2000-3000' && product.price > 2000 && product.price <= 3000) || (range === 'above-3000' && product.price > 3000))
      const genderMatch = !filters.gender.length || filters.gender.includes(product.gender)
      const colorMatch = !filters.color.length || filters.color.includes(product.color)
      const sizeMatch = !filters.size.length || filters.size.some((size) => product.sizes.includes(size))
      return searchMatch && categoryMatch && priceMatch && genderMatch && colorMatch && sizeMatch
    })
    return [...matches].sort((first, second) => {
      if (sort === 'price-low') return first.price - second.price
      if (sort === 'price-high') return second.price - first.price
      if (sort === 'rating') return second.rating - first.rating
      if (sort === 'newest') return second.id.localeCompare(first.id)
      return 0
    })
  }, [category, filters, search, sort])

  const activeFilterCount = Object.values(filters).flat().length
  const productsForGrid = filteredProducts.map((product) => ({ ...product, isWishlisted: isWishlisted(product.id) }))

  function startTryOn(product) {
    selectProduct(product)
    navigate('/upload', { state: { productId: product.id, productName: product.name } })
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><SectionHeading eyebrow="The Vesta collection" title="Explore Collection" description="Discover pieces you can visualize before you buy." /><div className="mt-10 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><SearchBar value={search} onChange={updateSearch} placeholder="Search dresses, shirts, jackets..." /><ProductSort value={sort} onChange={setSort} /></div><div className="mt-7"><CategoryFilter categories={categories} value={category} onChange={updateCategory} /></div><div className="mt-8 flex flex-col gap-8 lg:flex-row"><ProductFilters filters={filters} onChange={updateFilter} onClear={clearAll} activeCount={activeFilterCount} /><section className="min-w-0 flex-1" aria-label="Product results"><div className="mb-5 flex items-center justify-between gap-4"><p className="text-sm text-muted"><strong className="text-ink">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}</p>{search ? <p className="truncate text-xs text-muted">Results for “{search}”</p> : null}</div>{filteredProducts.length ? <ProductGrid products={productsForGrid} columns={4} onWishlist={toggleWishlist} onTryOn={startTryOn} /> : <EmptyState title="No styles found" message="Try changing your search or filters." action={<button type="button" onClick={clearAll} className="text-sm font-bold text-accent hover:text-accent-dark">Clear Filters</button>} />}</section></div></div></main><Footer /></div>
}

export default Products
