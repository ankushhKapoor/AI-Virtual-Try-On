import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import OutfitCard from '../OutfitCard'
import SectionHeading from '../SectionHeading'

const API_BASE_URL = 'http://127.0.0.1:8000'

const lookQueries = [
  {
    name: 'The Soft Tailoring Edit',
    query: 'women blazer trousers fashion',
    keywords: [
      'blazer',
      'blazer',
      'trouser',
      'pants',
      'tailored',
    ],
  },
  {
    name: 'Weekend in Linen',
    query: 'linen shirt casual fashion',
    keywords: [
      'linen',
      'shirt',
      'casual',
      'cotton',
    ],
  },
  {
    name: 'After Dark Satin',
    query: 'satin dress evening party fashion',
    keywords: [
      'satin',
      'dress',
      'evening',
      'party',
      'gown',
    ],
  },
]


function scoreProduct(product, keywords) {
  if (!product) {
    return -1
  }

  const title =
    String(
      product.title || ''
    ).toLowerCase()

  let score = 0

  keywords.forEach(
    keyword => {
      if (
        title.includes(
          keyword.toLowerCase()
        )
      ) {
        score += 10
      }
    }
  )

  if (product.image) {
    score += 5
  }

  if (product.asin) {
    score += 2
  }

  return score
}


function FeaturedLooks() {
  const [looks, setLooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadLooks() {
      try {
        /*
         * Keep track of ASINs already used.
         * This prevents the same Amazon product
         * from appearing in multiple cards.
         */
        const usedAsins = new Set()

        const results = []

        for (
          const look of lookQueries
        ) {
          if (cancelled) {
            return
          }

          try {
            const response =
              await fetch(
                `${API_BASE_URL}/search?query=${encodeURIComponent(
                  look.query
                )}`
              )

            if (!response.ok) {
              console.error(
                `Failed to fetch ${look.name}`
              )

              continue
            }

            const data =
              await response.json()

            const products =
              Array.isArray(
                data.products
              )
                ? data.products.filter(
                    item =>
                      item &&
                      item.asin &&
                      item.image &&
                      item.title
                  )
                : []

            /*
             * Rank products according to how
             * closely their title matches
             * the desired look.
             */
            const rankedProducts =
              [...products].sort(
                (first, second) =>
                  scoreProduct(
                    second,
                    look.keywords
                  ) -
                  scoreProduct(
                    first,
                    look.keywords
                  )
              )

            /*
             * Pick the best product that has
             * not already been used.
             */
            const product =
              rankedProducts.find(
                item =>
                  !usedAsins.has(
                    item.asin
                  )
              )

            if (!product) {
              continue
            }

            usedAsins.add(
              product.asin
            )

            results.push({
              id: product.asin,

              asin: product.asin,

              name:
                product.title ||
                look.name,

              title:
                product.title ||
                look.name,

              price:
                Number(product.price) || 0,

              currency:
                product.currency ||
                'INR',

              image:
                product.image,

              images:
                product.image
                  ? [product.image]
                  : [],

              brand:
                product.brand || '',

              rating:
                Number(product.rating) || 0,

              reviewCount:
                Number(
                  product.reviews_count
                ) || 0,

              url:
                product.url || '',

              description:
                product.title || '',

              available: true,

              visualClass:
                'bg-[#e8e5dc]',

              badge:
                product.is_prime
                  ? 'Prime'
                  : product.is_sponsored
                    ? 'Sponsored'
                    : null,
            })

          } catch (error) {
            console.error(
              `Failed to load featured look: ${look.name}`,
              error
            )
          }
        }

        if (!cancelled) {
          setLooks(results)
        }

      } catch (error) {
        console.error(
          'Failed to load featured Amazon products:',
          error
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLooks()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="bg-[#f2f0ea]">

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">

        <SectionHeading
          eyebrow="Style inspiration"
          title="Find your next look"
          description="A little inspiration goes a long way. Explore visual stories built around pieces you can make your own."
          action={
            <Link
              to="/wishlist"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark"
            >
              Saved looks

              <span aria-hidden="true">
                →
              </span>
            </Link>
          }
        />

        <div className="mt-10">

          {loading ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {[1, 2, 3].map(
                item => (
                  <div
                    key={item}
                    className="aspect-[3/4] animate-pulse rounded-md bg-accent-soft"
                  />
                )
              )}

            </div>

          ) : looks.length > 0 ? (

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {looks.map(
                look => (
                  <OutfitCard
                    key={look.id}
                    outfit={look}
                  />
                )
              )}

            </div>

          ) : (

            <div className="rounded-md border border-line bg-surface p-10 text-center">

              <p className="text-sm text-muted">
                No featured looks are available right now.
              </p>

            </div>

          )}

        </div>

      </div>

    </section>
  )
}

export default FeaturedLooks