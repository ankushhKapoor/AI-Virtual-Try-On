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
import { fetchJsonWithCache, TTL_SEARCH } from '../utils/apiCache'


import { API_BASE_URL } from '../services/urls'



const audiences = ['All', 'Women', 'Men', 'Kids']

const subcategoriesByAudience = {
  Women: ['Shirts', 'Tops', 'T-Shirts', 'Jeans', 'Skirts', 'Dresses', 'Jackets', 'Blazers', 'Accessories'],
  Men: ['Shirts', 'T-Shirts', 'Pants', 'Jeans', 'Shorts', 'Kurtas', 'Jackets', 'Blazers', 'Watches', 'Accessories'],
  Kids: ['T-Shirts', 'Tops', 'Shirts', 'Jeans', 'Shorts', 'Dresses', 'Jackets', 'Accessories'],
}

const audienceQueries = {
  Women: 'women clothing',
  Men: 'men clothing',
  Kids: 'kids clothing',
}

const subcategoryQueries = Object.fromEntries(
  [...new Set(Object.values(subcategoriesByAudience).flat())]
    .map((subcategory) => [subcategory, subcategory.toLowerCase()]),
)


const defaultFilters = {
  price: [],
  color: [],
  size: [],
}

const colorOptions = [
  { value: 'black', pattern: /\bblack\b/i },
  { value: 'white', pattern: /\bwhite\b/i },
  { value: 'blue', pattern: /\b(?:blue|navy|teal|turquoise)\b/i },
  { value: 'red', pattern: /\b(?:red|maroon|burgundy)\b/i },
  { value: 'green', pattern: /\b(?:green|olive)\b/i },
  { value: 'pink', pattern: /\b(?:pink|peach)\b/i },
  { value: 'yellow', pattern: /\b(?:yellow|mustard|gold)\b/i },
  { value: 'purple', pattern: /\b(?:purple|lavender)\b/i },
  { value: 'brown', pattern: /\b(?:brown|beige|cream)\b/i },
  { value: 'grey', pattern: /\b(?:grey|gray|silver)\b/i },
  { value: 'multicolor', pattern: /\b(?:multi[-\s]?(?:color|colour)|printed)\b/i },
]

const sizeDefinitions = [
  { value: 'XXS', pattern: /\b(?:XXS|EXTRA[ -]?EXTRA[ -]?SMALL)\b/i },
  { value: 'XS', pattern: /\b(?:XS|EXTRA[ -]?SMALL)\b/i },
  { value: 'S', pattern: /\b(?:S|SMALL)\b/i },
  { value: 'M', pattern: /\b(?:M|MEDIUM)\b/i },
  { value: 'L', pattern: /\b(?:L|LARGE)\b/i },
  { value: 'XL', pattern: /\b(?:XL|X[ -]?LARGE|EXTRA[ -]?LARGE)\b/i },
  { value: 'XXL', pattern: /\b(?:XXL|2XL|DOUBLE[ -]?XL|2X[ -]?LARGE)\b/i },
  { value: '3XL', pattern: /\b(?:3XL|3X[ -]?LARGE)\b/i },
  { value: '4XL', pattern: /\b(?:4XL|4X[ -]?LARGE)\b/i },
  { value: '5XL', pattern: /\b(?:5XL|5X[ -]?LARGE)\b/i },
  { value: 'Free Size', pattern: /\b(?:FREE|ONE)[ -]?SIZE\b/i },
]

const sizeOrder = sizeDefinitions.map(({ value }) => value)

function productFilterText(product) {
  const values = (value) => {
    if (Array.isArray(value)) return value.flatMap(values)
    if (value && typeof value === 'object') return Object.values(value).flatMap(values)
    return typeof value === 'string' || typeof value === 'number' ? [String(value)] : []
  }
  return [
    ...values(product.color),
    ...values(product.colour),
    ...values(product.color_name),
    ...values(product.size),
    ...values(product.sizes),
    ...values(product.title),
    ...values(product.description),
    ...values(product.url),
  ].join(' ').replace(/[_,/|;:()[\]{}]+/g, ' ')
}

function inferColors(product) {
  const text = productFilterText(product)
  return colorOptions.filter(({ pattern }) => pattern.test(text)).map(({ value }) => value)
}

function normaliseSizes(product) {
  const text = productFilterText(product)
  return sizeDefinitions.filter(({ pattern }) => pattern.test(text)).map(({ value }) => value)
}

function linkedProductCategory(product) {
  const categories = Array.isArray(product.categories) ? product.categories : []
  const labels = [product.category, ...categories].map((item) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') return item.name || item.title || ''
    return ''
  }).filter(Boolean)
  return labels.at(-1) || 'Amazon Clothing'
}

function toLinkedTryOnProduct(product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  const image = product.image || images[0] || null
  return {
    id: product.asin,
    asin: product.asin,
    name: product.title || 'Amazon Clothing',
    title: product.title || 'Amazon Clothing',
    brand: product.brand || '',
    price: Number(product.price) || 0,
    currency: product.currency || 'INR',
    rating: Number(product.rating) || 0,
    reviewCount: Number(product.reviews_count) || 0,
    image,
    images: images.length ? images : image ? [image] : [],
    url: product.url || '',
    category: linkedProductCategory(product),
    description: product.title || '',
    color: inferColors(product)[0] || '',
    colors: inferColors(product),
    sizes: normaliseSizes(product),
    available: product.stock ? true : product.available !== false,
    stock: product.stock || '',
    visualClass: 'bg-[#e8e5dc]',
  }
}

function matchesPriceRange(range, price) {
  if (!Number.isFinite(price) || price <= 0) return false
  if (range === 'under-300') return price < 300
  if (range === '300-500') return price >= 300 && price <= 500
  if (range === '500-1000') return price > 500 && price <= 1000
  if (range === '1000-1500') return price > 1000 && price <= 1500
  if (range === '1500-2000') return price > 1500 && price <= 2000
  if (range === '2000-3000') return price > 2000 && price <= 3000
  if (range === '3000-5000') return price > 3000 && price <= 5000
  return range === 'above-5000' && price > 5000
}

function getInitialSelection(searchParams) {
  const requestedCategory = searchParams.get('category')
  const requestedSubcategory = searchParams.get('subcategory')

  if (audiences.includes(requestedCategory)) {
    const validSubcategories = subcategoriesByAudience[requestedCategory] || []
    return {
      audience: requestedCategory,
      subcategory: validSubcategories.includes(requestedSubcategory) ? requestedSubcategory : '',
    }
  }

  const legacyAudience = Object.keys(subcategoriesByAudience)
    .find((audience) => subcategoriesByAudience[audience].includes(requestedCategory))

  return legacyAudience
    ? { audience: legacyAudience, subcategory: requestedCategory }
    : { audience: 'All', subcategory: '' }
}


function Products() {
  const navigate = useNavigate()

  const [searchParams, setSearchParams] =
    useSearchParams()

  const initialSelection = getInitialSelection(searchParams)

  const [search, setSearch] = useState(
    searchParams.get('search') || ''
  )

  const [audience, setAudience] =
    useState(initialSelection.audience)

  const [subcategory, setSubcategory] =
    useState(initialSelection.subcategory)

  const [filters, setFilters] =
    useState(defaultFilters)

  const [sort, setSort] =
    useState('recommended')

  const [amazonProducts, setAmazonProducts] =
    useState([])

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [linkError, setLinkError] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  const {
    toggleWishlist,
    isWishlisted,
  } = useWishlist()

  const {
    selectProduct,
  } = useTryOn()


  function updateSearch(value) {
    setSearch(value)
    setLinkError('')

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


  function updateAudience(value) {
    setAudience(value)
    setSubcategory('')

    setFilters(defaultFilters)

    setSearchParams(
      current => {
        const next =
          new URLSearchParams(current)

        if (value === 'All') {
          next.delete('category')
          next.delete('subcategory')
        } else {
          next.set('category', value)
          next.delete('subcategory')
        }

        return next
      },
      {
        replace: true,
      }
    )
  }


  function updateSubcategory(value) {
    setSubcategory(value)

    setSearchParams(
      current => {
        const next = new URLSearchParams(current)
        next.set('category', audience)
        next.set('subcategory', value)
        return next
      },
      { replace: true }
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
    setAudience('All')
    setSubcategory('')
    setFilters(defaultFilters)

    setSearchParams(
      {},
      {
        replace: true,
      }
    )
  }

  async function fetchAmazonLink(value) {
    const url = value.trim()
    if (!url) {
      setLinkError('Paste an Amazon clothing product link first.')
      return
    }

    setLinkLoading(true)
    setLinkError('')
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/from-url?url=${encodeURIComponent(url)}`,
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to fetch this Amazon product.')
      }

      const product = toLinkedTryOnProduct(data)
      if (!product.asin || !product.image) {
        throw new Error('This clothing product does not have an image available for try-on.')
      }
      selectProduct(product)
      navigate('/upload', {
        state: { productId: product.id, productName: product.name, asin: product.asin, product },
      })
    } catch (requestError) {
      setLinkError(requestError.message || 'Unable to fetch this Amazon product.')
    } finally {
      setLinkLoading(false)
    }
  }

  function handleSearchSubmit(value) {
    if (/^https?:\/\/(?:www\.|m\.)?amazon\./i.test(value.trim())) {
      fetchAmazonLink(value)
    }
  }


  useEffect(() => {
    let cancelled = false

    const query = [
      search.trim(),
      audienceQueries[audience],
      subcategoryQueries[subcategory],
    ].filter(Boolean).join(' ') || 'clothing'

    setLoading(true)
    setError('')

    const timer = setTimeout(
      async () => {
        try {
          const data = await fetchJsonWithCache(
            `${API_BASE_URL}/search?query=${encodeURIComponent(
              query
            )}`,
            { ttl: TTL_SEARCH }
          )

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
                  product.category ||
                  subcategory ||
                  (audience === 'All' ? 'Amazon' : audience),

                gender:
                  product.gender || '',

                color: inferColors(product)[0] || '',

                colors: inferColors(product),

                image:
                  product.image ||
                  product.image_url ||
                  product.thumbnail ||
                  null,

                images:
                  product.image
                    ? [product.image]
                    : product.image_url
                      ? [product.image_url]
                      : product.thumbnail
                        ? [product.thumbnail]
                        : [],

                url:
                  product.url || '',

                description:
                  product.title,

                sizes: normaliseSizes(product),

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

            setFilters(defaultFilters)
          }
        } catch (requestError) {
          console.error(
            'Amazon product search failed:',
            requestError
          )

          if (!cancelled) {
            setAmazonProducts([])

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
  }, [search, audience, subcategory])


  const filteredProducts = useMemo(() => {
    const matches =
      amazonProducts.filter(
        product => {
          const priceMatch =
            !filters.price.length ||
            filters.price.some(range => matchesPriceRange(range, product.price))

          const colorMatch =
            !filters.color.length ||
            filters.color.some(color => product.colors?.includes(color))

          const sizeMatch =
            !filters.size.length ||
            filters.size.some(size =>
              product.sizes.includes(size)
            )

          return (
            priceMatch &&
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

  const availableFilterOptions = useMemo(() => {
    const availableColors = new Set(amazonProducts.flatMap(product => product.colors || []))
    const colors = colorOptions.map(({ value }) => value).filter(color => availableColors.has(color))
    const sizes = sizeOrder.filter(size => amazonProducts.some(product => product.sizes.includes(size)))
    return { colors, sizes }
  }, [amazonProducts])


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
            eyebrow="The Trayo collection"
            title="Explore Collection"
            description="Discover pieces you can visualize before you buy."
          />

          <div className="mt-10 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">

            <SearchBar
              value={search}
              onChange={updateSearch}
              onSearch={handleSearchSubmit}
              placeholder="Search for shirts, dresses, etc. or paste any Amazon clothing link"
            />

            <ProductSort
              value={sort}
              onChange={setSort}
            />

          </div>

          {linkLoading ? <p className="mt-3 text-sm font-medium text-muted" role="status">Fetching Amazon clothing item…</p> : null}
          {linkError ? <p className="mt-3 text-sm font-medium text-danger" role="alert">{linkError}</p> : null}


          <div className="mt-7">

            <CategoryFilter
              categories={audiences}
              value={audience}
              onChange={updateAudience}
              subcategories={subcategoriesByAudience[audience] || []}
              selectedSubcategory={subcategory}
              onSubcategoryChange={updateSubcategory}
            />

          </div>


          <div className="mt-8 flex flex-col gap-8 lg:flex-row">

            <ProductFilters
              filters={filters}
              availableOptions={availableFilterOptions}
              onChange={updateFilter}
              onClear={clearAll}
              activeCount={activeFilterCount}
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
