import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import ProductGrid from '../ProductGrid'
import SectionHeading from '../SectionHeading'

const API_BASE_URL = 'http://127.0.0.1:8000'

function TrendingProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/search?query=clothing`
        )

        if (!response.ok) {
          throw new Error(
            'Failed to fetch products'
          )
        }

        const data = await response.json()

        if (!cancelled) {
          const amazonProducts = (
            data.products || []
          )
            .filter(
              product =>
                product.image
            )
            .slice(0, 4)
            .map(product => ({
              id: product.asin,

              asin: product.asin,

              name: product.title,

              brand:
                product.brand || '',

              price:
                product.price || 0,

              image:
                product.image,

              images:
                product.image
                  ? [product.image]
                  : [],

              rating:
                product.rating || 0,

              reviewCount:
                product.reviews_count || 0,

              url:
                product.url || '',

              description:
                product.title,

              available: true,

              visualClass:
                'bg-[#e8e5dc]',

              badge:
                product.is_prime
                  ? 'Prime'
                  : product.is_sponsored
                    ? 'Sponsored'
                    : null,
            }))

          setProducts(
            amazonProducts
          )
        }

      } catch (error) {

        console.error(
          'Failed to load trending Amazon products:',
          error
        )

      } finally {

        if (!cancelled) {
          setLoading(false)
        }

      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }

  }, [])

  return (
    <section className="border-y border-line bg-surface">

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">

        <SectionHeading
          eyebrow="The edit"
          title="Trending now"
          description="Pieces selected for their effortless ability to go everywhere with you."
          action={
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark"
            >
              View all

              <ArrowRight
                size={16}
                aria-hidden="true"
              />

            </Link>
          }
        />

        <div className="mt-10">

          {loading ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {[1, 2, 3, 4].map(
                item => (

                  <div
                    key={item}
                    className="aspect-[3/4] animate-pulse rounded-md bg-accent-soft"
                  />

                )
              )}

            </div>

          ) : (

            <ProductGrid
              products={products}
              columns={4}
            />

          )}

        </div>

      </div>

    </section>
  )
}

export default TrendingProducts