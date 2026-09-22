import { ArrowRight, Check, ExternalLink, Heart, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
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

import useWishlist from '../hooks/useWishlist'
import useTryOn from '../hooks/useTryOn'


const API_BASE_URL = 'http://127.0.0.1:8000'


function normalizeProduct(data) {
  const images =
    Array.isArray(data.images)
      ? data.images.filter(Boolean)
      : data.image
        ? [data.image]
        : []

  const sizes =
    Array.isArray(data.sizes)
      ? data.sizes
      : []

  return {
    id: data.asin,
    asin: data.asin,

    name:
      data.title ||
      'Amazon Product',

    title:
      data.title ||
      'Amazon Product',

    brand:
      data.brand ||
      '',

    price:
      Number(data.price) || 0,

    currency:
      data.currency ||
      'INR',

    rating:
      Number(data.rating) || 0,

    reviewCount:
      Number(data.reviews_count) || 0,

    image:
      data.image ||
      images[0] ||
      null,

    images,

    url:
      data.url ||
      '',

    description:
      data.title ||
      '',

    category:
      data.category ||
      (
        Array.isArray(data.categories) &&
        data.categories.length
          ? data.categories[
              data.categories.length - 1
            ]
          : 'Amazon'
      ),

    gender:
      data.gender ||
      '',

    color:
      data.color ||
      '',

    sizes,

    available:
      data.stock
        ? true
        : data.available !== false,

    stock:
      data.stock ||
      '',

    material:
      data.material ||
      '',

    productOverview:
      Array.isArray(
        data.product_overview
      )
        ? data.product_overview
        : [],

    categories:
      Array.isArray(data.categories)
        ? data.categories
        : [],

    categoryPath:
      Array.isArray(data.category_path)
        ? data.category_path
        : [],

    isPrime:
      Boolean(data.is_prime),

    isSponsored:
      Boolean(data.is_sponsored),
  }
}


function ProductDetails() {

  const { id } = useParams()

  const navigate = useNavigate()

  const [product, setProduct] =
    useState(null)

  const [relatedProducts, setRelatedProducts] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [selectedSize, setSelectedSize] =
    useState('')


  const {
    toggleWishlist,
    isWishlisted,
  } = useWishlist()


  const {
    selectProduct,
  } = useTryOn()


  useEffect(() => {

    let cancelled = false


    async function loadProduct() {

      if (!id) {

        setError(
          'Product ASIN is missing.'
        )

        setLoading(false)

        return
      }


      setLoading(true)

      setError('')


      try {

        const asin =
          decodeURIComponent(id)
            .trim()
            .toUpperCase()


        const response =
          await fetch(
            `${API_BASE_URL}/products?asin=${encodeURIComponent(
              asin
            )}`
          )


        if (!response.ok) {

          throw new Error(
            `Product request failed with status ${response.status}`
          )

        }


        const data =
          await response.json()


        if (
          data.status !== 'success'
        ) {

          throw new Error(
            'Product was not found.'
          )

        }


        const amazonProduct =
          normalizeProduct(data)


        if (cancelled) {
          return
        }


        setProduct(
          amazonProduct
        )


        if (
          amazonProduct.sizes.length
        ) {

          const medium =
            amazonProduct.sizes.find(
              size =>
                String(size)
                  .toUpperCase() ===
                'M'
            )

          setSelectedSize(
            medium ||
            amazonProduct.sizes[0]
          )

        } else {

          setSelectedSize('')

        }


        /*
         * Load a few real Amazon products
         * for the "You May Also Like" section.
         *
         * We use the product category when
         * available, otherwise the title.
         */
        const relatedQuery =
          amazonProduct.category &&
          amazonProduct.category !== 'Amazon'
            ? amazonProduct.category
            : amazonProduct.name


        try {

          const relatedResponse =
            await fetch(
              `${API_BASE_URL}/search?query=${encodeURIComponent(
                relatedQuery
              )}`
            )


          if (
            relatedResponse.ok
          ) {

            const relatedData =
              await relatedResponse.json()


            const related =
              Array.isArray(
                relatedData.products
              )
                ? relatedData.products
                    .filter(
                      item =>
                        item.asin &&
                        item.asin !==
                          amazonProduct.asin &&
                        item.title &&
                        item.image
                    )
                    .slice(0, 4)
                    .map(
                      item =>
                        normalizeProduct(
                          item
                        )
                    )
                : []


            if (!cancelled) {

              setRelatedProducts(
                related
              )

            }

          }

        } catch (relatedError) {

          console.error(
            'Failed to load related Amazon products:',
            relatedError
          )

        }

      } catch (requestError) {

        console.error(
          'Failed to load Amazon product:',
          requestError
        )


        if (!cancelled) {

          setProduct(null)

          setError(
            requestError.message ||
            'Unable to load product.'
          )

        }

      } finally {

        if (!cancelled) {

          setLoading(false)

        }

      }

    }


    loadProduct()


    return () => {

      cancelled = true

    }

  }, [id])


  function startTryOn() {

    if (!product) {
      return
    }


    selectProduct(
      product
    )


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

          size:
            selectedSize,

          product:
            product,

        },
      }
    )

  }


  function handleRelatedTryOn(
    relatedProduct
  ) {

    selectProduct(
      relatedProduct
    )


    navigate(
      '/upload',
      {
        state: {

          productId:
            relatedProduct.id,

          productName:
            relatedProduct.name,

          asin:
            relatedProduct.asin,

          product:
            relatedProduct,

        },
      }
    )

  }


  if (loading) {

    return (

      <div className="min-h-screen bg-canvas">

        <Navbar />

        <main>

          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)]">

              <div className="aspect-[3/4] animate-pulse rounded-md bg-accent-soft" />

              <div className="space-y-6">

                <div className="h-4 w-24 animate-pulse rounded bg-accent-soft" />

                <div className="h-10 w-3/4 animate-pulse rounded bg-accent-soft" />

                <div className="h-8 w-32 animate-pulse rounded bg-accent-soft" />

                <div className="h-24 w-full animate-pulse rounded bg-accent-soft" />

                <div className="h-12 w-full animate-pulse rounded bg-accent-soft" />

              </div>

            </div>

          </div>

        </main>

        <Footer />

      </div>

    )

  }


  if (!product) {

    return (

      <div className="min-h-screen bg-canvas">

        <Navbar />

        <main className="mx-auto max-w-2xl px-5 py-24 sm:px-8">

          <EmptyState
            title="Product not found"
            message={
              error ||
              'This Amazon product could not be loaded.'
            }
            action={
              <Link to="/products">
                <Button icon={ArrowRight}>
                  Back to Shop
                </Button>
              </Link>
            }
          />

        </main>

        <Footer />

      </div>

    )

  }


  const displayPrice =
    product.currency === 'INR'
      ? `₹${product.price.toLocaleString(
          'en-IN'
        )}`
      : `${product.currency} ${product.price.toLocaleString(
          'en-IN'
        )}`


  return (

    <div className="min-h-screen bg-canvas">

      <Navbar />

      <main>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

          <Breadcrumbs
            items={[
              {
                label: 'Shop',
                to: '/products',
              },

              {
                label:
                  product.category ||
                  'Amazon',
                to: '/products',
              },

              {
                label:
                  product.name,
              },
            ]}
          />


          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:gap-16">

            <ProductGallery
              product={product}
            />


            <section className="flex flex-col">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">

                    {product.brand
                      ? product.brand
                      : 'Amazon'}

                  </p>


                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">

                    {product.name}

                  </h1>

                </div>


                <WishlistButton
                  isWishlisted={
                    isWishlisted(
                      product.id
                    )
                  }
                  onToggle={() =>
                    toggleWishlist(
                      product.id
                    )
                  }
                />

              </div>


              <div className="mt-5 flex flex-wrap items-center gap-3">

                <p className="text-xl font-semibold text-ink">

                  {displayPrice}

                </p>


                {product.rating > 0 ? (

                  <>
                    <span
                      className="h-4 w-px bg-line-strong"
                      aria-hidden="true"
                    />


                    <span className="inline-flex items-center gap-1 text-sm text-muted">

                      <Star
                        size={15}
                        className="fill-[#b8893f] text-[#b8893f]"
                        aria-hidden="true"
                      />

                      {product.rating}

                      {product.reviewCount > 0
                        ? ` (${product.reviewCount} reviews)`
                        : ''}

                    </span>

                  </>

                ) : null}

              </div>


              {product.description ? (

                <p className="mt-6 text-sm leading-7 text-muted">

                  {product.description}

                </p>

              ) : null}


              <div className="mt-8 space-y-7 border-y border-line py-7">

                {product.color ? (

                  <div className="flex items-center justify-between text-sm">

                    <span className="font-semibold text-ink">
                      Color
                    </span>

                    <span className="text-muted">
                      {product.color}
                    </span>

                  </div>

                ) : null}


                {product.sizes.length > 0 ? (

                  <SizeSelector
                    sizes={
                      product.sizes
                    }
                    selectedSize={
                      selectedSize
                    }
                    onChange={
                      setSelectedSize
                    }
                  />

                ) : null}


                <div className="flex items-center gap-2 text-sm text-success">

                  <Check
                    size={16}
                    aria-hidden="true"
                  />

                  {product.available
                    ? 'In stock and ready to try'
                    : 'Currently unavailable'}

                </div>

              </div>


              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <Button
                  size="lg"
                  icon={Heart}
                  variant="outline"
                  onClick={() =>
                    toggleWishlist(
                      product.id
                    )
                  }
                  className="flex-1"
                >

                  {isWishlisted(
                    product.id
                  )
                    ? 'Saved to Wishlist'
                    : 'Save to Wishlist'}

                </Button>


                <Button
                  size="lg"
                  onClick={
                    startTryOn
                  }
                  className="flex-1"
                >
                  Try On
                </Button>

              </div>


              {product.url ? (

                <a
                  href={
                    product.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink"
                >

                  View on Amazon

                  <ExternalLink
                    size={16}
                  />

                </a>

              ) : null}


              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-7 text-sm">

                <div>

                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">
                    Brand
                  </dt>

                  <dd className="mt-1 text-muted">
                    {product.brand || 'Not specified'}
                  </dd>

                </div>


                <div>

                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">
                    Available sizes
                  </dt>

                  <dd className="mt-1 text-muted">

                    {product.sizes.length
                      ? product.sizes.join(
                          ', '
                        )
                      : 'See Amazon listing'}

                  </dd>

                </div>


                <div>

                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">
                    Category
                  </dt>

                  <dd className="mt-1 text-muted">
                    {product.category}
                  </dd>

                </div>


                <div>

                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">
                    ASIN
                  </dt>

                  <dd className="mt-1 text-muted">
                    {product.asin}
                  </dd>

                </div>

              </dl>


              {product.productOverview.length > 0 ? (

                <div className="mt-8 border-t border-line pt-7">

                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
                    Product details
                  </h2>


                  <div className="mt-5 space-y-3">

                    {product.productOverview.map(
                      (item, index) => {

                        if (
                          typeof item ===
                          'string'
                        ) {

                          return (

                            <p
                              key={
                                index
                              }
                              className="text-sm leading-6 text-muted"
                            >
                              {item}
                            </p>

                          )

                        }


                        if (
                          item &&
                          typeof item ===
                          'object'
                        ) {

                          return (

                            <div
                              key={
                                index
                              }
                              className="flex gap-3 text-sm"
                            >

                              <span className="font-semibold text-ink">

                                {item.name ||
                                  item.key ||
                                  ''}

                              </span>

                              <span className="text-muted">

                                {item.value ||
                                  ''}

                              </span>

                            </div>

                          )

                        }


                        return null

                      }
                    )}

                  </div>

                </div>

              ) : null}

            </section>

          </div>


          {relatedProducts.length > 0 ? (

            <section className="mt-20 border-t border-line pt-12">

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
                    Keep exploring
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
                    You May Also Like
                  </h2>

                </div>


                <Link
                  to="/products"
                  className="hidden items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark sm:inline-flex"
                >

                  View collection

                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                  />

                </Link>

              </div>


              <div className="mt-8">

                <ProductGrid
                  products={
                    relatedProducts.map(
                      item => ({
                        ...item,

                        isWishlisted:
                          isWishlisted(
                            item.id
                          ),
                      })
                    )
                  }
                  columns={4}
                  onWishlist={
                    toggleWishlist
                  }
                  onTryOn={
                    handleRelatedTryOn
                  }
                />

              </div>

            </section>

          ) : null}

        </div>

      </main>

      <Footer />

    </div>

  )
}


export default ProductDetails