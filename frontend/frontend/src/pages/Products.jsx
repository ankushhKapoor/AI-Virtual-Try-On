import { useEffect, useMemo, useState } from 'react'
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

import useWishlist from '../hooks/useWishlist'
import useTryOn from '../hooks/useTryOn'


const API_BASE_URL = 'http://127.0.0.1:8000'


const categories = [
  'All',
  'Women',
  'Men',
  'Dresses',
  'Tops',
  'Shirts',
  'Jeans',
  'Jackets',
  'Blazers',
  'Skirts',
  'T-Shirts',
]


const categoryQueries = {
  All: 'clothing',
  Women: 'women clothing',
  Men: 'men clothing',
  Dresses: 'dresses',
  Tops: 'tops',
  Shirts: 'shirts',
  Jeans: 'jeans',
  Jackets: 'jackets',
  Blazers: 'blazers',
  Skirts: 'skirts',
  'T-Shirts': 't-shirts',
}


const defaultFilters = {
  price: [],
  gender: [],
  color: [],
  size: [],
}


function Products() {
  const navigate = useNavigate()

  const [searchParams, setSearchParams] =
    useSearchParams()

  const initialCategory =
    categories.includes(
      searchParams.get('category')
    )
      ? searchParams.get('category')
      : 'All'

  const [search, setSearch] = useState(
    searchParams.get('search') || ''
  )

  const [category, setCategory] =
    useState(initialCategory)

  const [filters, setFilters] =
    useState(defaultFilters)

  const [sort, setSort] =
    useState('recommended')

  const [amazonProducts, setAmazonProducts] =
    useState([])

  const [availableFilters, setAvailableFilters] =
    useState({
      gender: [],
      color: [],
      size: [],
    })

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const {
    toggleWishlist,
    isWishlisted,
  } = useWishlist()

  const {
    selectProduct,
  } = useTryOn()


  function updateSearch(value) {
    setSearch(value)

    setSearchParams(
      current => {
        const next =
          new URLSearchParams(current)

        if (value) {
          next.set('search', value)
        } else {
          next.delete('search')
        }

        return next
      },
      {
        replace: true,
      }
    )
  }


  function updateCategory(value) {
    setCategory(value)

    setFilters(defaultFilters)

    setSearchParams(
      current => {
        const next =
          new URLSearchParams(current)

        if (value === 'All') {
          next.delete('category')
        } else {
          next.set('category', value)
        }

        return next
      },
      {
        replace: true,
      }
    )
  }


  function updateFilter(key, value) {
    setFilters(current => ({
      ...current,

      [key]: current[key].includes(value)
        ? current[key].filter(
            item => item !== value
          )
        : [
            ...current[key],
            value,
          ],
    }))
  }


  function clearAll() {
    setSearch('')
    setCategory('All')
    setFilters(defaultFilters)

    setSearchParams(
      {},
      {
        replace: true,
      }
    )
  }


  useEffect(() => {
    let cancelled = false

    const query =
      search.trim() ||
      categoryQueries[category] ||
      'clothing'

    setLoading(true)
    setError('')

    const timer = setTimeout(
      async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/search?query=${encodeURIComponent(
              query
            )}`
          )

          if (!response.ok) {
            throw new Error(
              `Search request failed with status ${response.status}`
            )
          }

          const data =
            await response.json()

          if (
            !Array.isArray(
              data.products
            )
          ) {
            throw new Error(
              'Backend returned an invalid product list.'
            )
          }

          const products =
            data.products
              .filter(
                product =>
                  product.asin &&
                  product.title
              )
              .map(product => ({
                id: product.asin,

                asin: product.asin,

                name: product.title,

                title: product.title,

                brand:
                  product.brand || '',

                price:
                  typeof product.price ===
                  'number'
                    ? product.price
                    : Number(
                        product.price
                      ) || 0,

                currency:
                  product.currency ||
                  'INR',

                category:
                  category === 'All'
                    ? 'Amazon'
                    : category,

                gender:
                  product.gender || '',

                color:
                  product.color || '',

                image:
                  product.image || null,

                images:
                  product.image
                    ? [product.image]
                    : [],

                url:
                  product.url || '',

                description:
                  product.title,

                sizes:
                  Array.isArray(
                    product.sizes
                  )
                    ? product.sizes
                    : [],

                rating:
                  typeof product.rating ===
                  'number'
                    ? product.rating
                    : Number(
                        product.rating
                      ) || 0,

                reviewCount:
                  Number(
                    product.reviews_count
                  ) || 0,

                badge:
                  product.is_prime
                    ? 'Prime'
                    : product.is_sponsored
                      ? 'Sponsored'
                      : null,

                material: '',

                available: true,

                stock:
                  product.stock || '',

                visualClass:
                  'bg-[#e8e5dc]',
              }))

          if (!cancelled) {
            setAmazonProducts(products)

            setAvailableFilters({
              gender:
                Array.isArray(
                  data.filters?.gender
                )
                  ? data.filters.gender
                  : [],

              color:
                Array.isArray(
                  data.filters?.color
                )
                  ? data.filters.color
                  : [],

              size:
                Array.isArray(
                  data.filters?.size
                )
                  ? data.filters.size
                  : [],
            })

            setFilters(defaultFilters)
          }
        } catch (requestError) {
          console.error(
            'Amazon product search failed:',
            requestError
          )

          if (!cancelled) {
            setAmazonProducts([])

            setAvailableFilters({
              gender: [],
              color: [],
              size: [],
            })

            setError(
              'Unable to load Amazon products.'
            )
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      },

      search.trim() ? 500 : 0
    )

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, category])


  const filteredProducts = useMemo(() => {
    const matches =
      amazonProducts.filter(
        product => {
          const priceMatch =
            !filters.price.length ||
            filters.price.some(range => (
              (
                range ===
                  'under-1000' &&
                product.price < 1000
              ) ||
              (
                range ===
                  '1000-2000' &&
                product.price >= 1000 &&
                product.price <= 2000
              ) ||
              (
                range ===
                  '2000-3000' &&
                product.price > 2000 &&
                product.price <= 3000
              ) ||
              (
                range ===
                  'above-3000' &&
                product.price > 3000
              )
            ))

          const genderMatch =
            !filters.gender.length ||
            filters.gender.includes(
              product.gender
            )

          const colorMatch =
            !filters.color.length ||
            filters.color.includes(
              product.color
            )

          const sizeMatch =
            !filters.size.length ||
            filters.size.some(size =>
              product.sizes.includes(
                size
              )
            )

          return (
            priceMatch &&
            genderMatch &&
            colorMatch &&
            sizeMatch
          )
        }
      )

    return [...matches].sort(
      (first, second) => {
        if (sort === 'price-low') {
          return (
            first.price -
            second.price
          )
        }

        if (sort === 'price-high') {
          return (
            second.price -
            first.price
          )
        }

        if (sort === 'rating') {
          return (
            second.rating -
            first.rating
          )
        }

        if (sort === 'newest') {
          return second.id.localeCompare(
            first.id
          )
        }

        return 0
      }
    )
  }, [
    amazonProducts,
    filters,
    sort,
  ])


  const activeFilterCount =
    Object.values(filters)
      .flat()
      .length


  const productsForGrid =
    filteredProducts.map(
      product => ({
        ...product,

        isWishlisted:
          isWishlisted(
            product.id
          ),
      })
    )


  function startTryOn(product) {
    selectProduct(product)

    navigate(
      '/upload',
      {
        state: {
          productId:
            product.id,

          productName:
            product.name,

          asin:
            product.asin,

          product,
        },
      }
    )
  }


  return (
    <div className="min-h-screen bg-canvas">

      <Navbar />

      <main>

        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">

          <SectionHeading
            eyebrow="The Vesta collection"
            title="Explore Collection"
            description="Discover pieces you can visualize before you buy."
          />

          <div className="mt-10 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">

            <SearchBar
              value={search}
              onChange={updateSearch}
              placeholder="Search dresses, shirts, jackets..."
            />

            <ProductSort
              value={sort}
              onChange={setSort}
            />

          </div>


          <div className="mt-7">

            <CategoryFilter
              categories={categories}
              value={category}
              onChange={updateCategory}
            />

          </div>


          <div className="mt-8 flex flex-col gap-8 lg:flex-row">

            <ProductFilters
              filters={filters}
              onChange={updateFilter}
              onClear={clearAll}
              activeCount={activeFilterCount}
              availableFilters={
                availableFilters
              }
            />


            <section
              className="min-w-0 flex-1"
              aria-label="Product results"
            >

              <div className="mb-5 flex items-center justify-between gap-4">

                <p className="text-sm text-muted">

                  <strong className="text-ink">

                    {loading
                      ? '...'
                      : filteredProducts.length}

                  </strong>{' '}

                  {filteredProducts.length === 1
                    ? 'product'
                    : 'products'}

                </p>


                {search ? (
                  <p className="truncate text-xs text-muted">

                    Results for “
                    {search}
                    ”

                  </p>
                ) : null}

              </div>


              {loading ? (

                <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">

                  {Array.from({
                    length: 8,
                  }).map(
                    (_, index) => (

                      <div
                        key={index}
                        className="animate-pulse overflow-hidden rounded-md border border-line bg-surface"
                      >

                        <div className="aspect-[3/4] bg-accent-soft" />

                        <div className="space-y-3 p-4">

                          <div className="h-3 w-20 rounded bg-accent-soft" />

                          <div className="h-4 w-full rounded bg-accent-soft" />

                          <div className="h-4 w-2/3 rounded bg-accent-soft" />

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : error ? (

                <EmptyState
                  title="Amazon products unavailable"
                  message={error}
                  action={
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-sm font-bold text-accent hover:text-accent-dark"
                    >
                      Try Again
                    </button>
                  }
                />

              ) : filteredProducts.length ? (

                <ProductGrid
                  products={
                    productsForGrid
                  }
                  columns={4}
                  onWishlist={
                    toggleWishlist
                  }
                  onTryOn={
                    startTryOn
                  }
                />

              ) : (

                <EmptyState
                  title="No styles found"
                  message="Try changing your search or filters."
                  action={
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-sm font-bold text-accent hover:text-accent-dark"
                    >
                      Clear Filters
                    </button>
                  }
                />

              )}

            </section>

          </div>

        </div>

      </main>

      <Footer />

    </div>
  )
}


export default Products