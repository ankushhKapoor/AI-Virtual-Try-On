import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import CategoryCard from '../CategoryCard'
import SectionHeading from '../SectionHeading'

const API_BASE_URL = 'http://127.0.0.1:8000'

const categories = [
  {
    name: 'Women',
    description: 'Curated everyday edits',
    query: 'women fashion clothing',
    keywords: ['women', 'ladies', 'female', 'dress', 'top'],
  },
  {
    name: 'Men',
    description: 'Modern wardrobe staples',
    query: 'men fashion clothing',
    keywords: ['men', 'shirt', 'jacket', 'tshirt', 'trouser'],
  },
  {
    name: 'Dresses',
    description: 'From day to evening',
    query: 'women dresses',
    keywords: ['dress', 'dresses', 'gown', 'maxi'],
  },
  {
    name: 'Tops',
    description: 'Easy layers and essentials',
    query: 'women tops',
    keywords: ['top', 'tops', 'crop', 'tank', 'blouse'],
  },
  {
    name: 'Shirts',
    description: 'Clean, considered cuts',
    query: 'fashion shirts',
    keywords: ['shirt', 'shirts', 'formal', 'casual'],
  },
  {
    name: 'Jeans',
    description: 'Fits for every day',
    query: 'jeans denim',
    keywords: ['jeans', 'denim', 'jean'],
  },
  {
    name: 'Jackets',
    description: 'The finishing layer',
    query: 'jackets fashion',
    keywords: ['jacket', 'jackets', 'bomber', 'windbreaker'],
  },
  {
    name: 'Accessories',
    description: 'Details that define you',
    query: 'fashion accessories',
    keywords: [
      'accessories',
      'bag',
      'handbag',
      'watch',
      'jewellery',
      'jewelry',
      'sunglasses',
    ],
  },
]

function scoreProduct(product, keywords) {
  if (!product) {
    return -1
  }

  const title = String(
    product.title || ''
  ).toLowerCase()

  let score = 0

  keywords.forEach(keyword => {
    if (title.includes(keyword.toLowerCase())) {
      score += 10
    }
  })

  if (product.image) {
    score += 20
  }

  if (product.asin) {
    score += 2
  }

  return score
}

function CategorySection() {
  const navigate = useNavigate()

  const [categoryProducts, setCategoryProducts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCategoryImages() {
      const results = {}

      try {
        /*
         * Load all category searches in parallel.
         *
         * The previous implementation requested each category
         * one after another. If one request was slow or failed,
         * it could leave several homepage cards without images.
         */
        const responses = await Promise.allSettled(
          categories.map(async category => {
            const response = await fetch(
              `${API_BASE_URL}/search?query=${encodeURIComponent(
                category.query
              )}`
            )

            if (!response.ok) {
              throw new Error(
                `Search failed with status ${response.status}`
              )
            }

            const data = await response.json()

            const products = Array.isArray(data.products)
              ? data.products.filter(
                  product =>
                    product &&
                    product.asin &&
                    product.image
                )
              : []

            return {
              category,
              products,
            }
          })
        )

        /*
         * First pass:
         * choose the best matching image for every category.
         *
         * We intentionally don't require unique ASINs here because
         * having a visible image is more important than returning
         * an empty card.
         */
        responses.forEach(result => {
          if (result.status !== 'fulfilled') {
            return
          }

          const {
            category,
            products,
          } = result.value

          if (!products.length) {
            return
          }

          const rankedProducts = [...products].sort(
            (a, b) =>
              scoreProduct(
                b,
                category.keywords
              ) -
              scoreProduct(
                a,
                category.keywords
              )
          )

          const selectedProduct =
            rankedProducts[0]

          if (selectedProduct?.image) {
            results[category.name] = {
              image: selectedProduct.image,
              asin: selectedProduct.asin,
            }
          }
        })

        /*
         * Second pass:
         * try to avoid duplicate images/ASINs.
         *
         * If a category has no unique result, we keep its
         * best image instead of leaving the card blank.
         */
        const usedAsins = new Set()
        const uniqueResults = {}

        categories.forEach(category => {
          const product =
            results[category.name]

          if (!product) {
            return
          }

          if (!usedAsins.has(product.asin)) {
            usedAsins.add(product.asin)

            uniqueResults[category.name] =
              product

            return
          }

          /*
           * Find another product from the same category
           * if the best product was already used.
           */
          const responseResult =
            responses.find(
              result =>
                result.status ===
                  'fulfilled' &&
                result.value.category.name ===
                  category.name
            )

          const alternatives =
            responseResult?.status ===
            'fulfilled'
              ? responseResult.value.products
              : []

          const alternative =
            alternatives.find(
              item =>
                item.image &&
                item.asin &&
                !usedAsins.has(item.asin)
            )

          if (alternative) {
            usedAsins.add(
              alternative.asin
            )

            uniqueResults[
              category.name
            ] = {
              image:
                alternative.image,
              asin:
                alternative.asin,
            }
          } else {
            /*
             * Keep the original image as a final
             * fallback rather than showing a blank card.
             */
            uniqueResults[
              category.name
            ] = product
          }
        })

        if (!cancelled) {
          setCategoryProducts(
            uniqueResults
          )
        }
      } catch (error) {
        console.error(
          'Failed to load category images:',
          error
        )

        if (!cancelled) {
          setCategoryProducts({})
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCategoryImages()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <SectionHeading
        eyebrow="Explore the edit"
        title="Find your everyday, elevated"
        description="Explore considered pieces and discover the categories that make your wardrobe feel like you."
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

      <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-5">
        {categories.map(category => {
          const product =
            categoryProducts[
              category.name
            ]

          return (
            <CategoryCard
              key={category.name}
              name={category.name}
              description={category.description}
              image={
                product?.image ||
                null
              }
              visualClass={
                loading
                  ? 'bg-accent-soft animate-pulse'
                  : 'bg-accent-soft'
              }
              onClick={() =>
                navigate(
                  `/products?category=${encodeURIComponent(
                    category.name
                  )}`
                )
              }
              className="[&>div:first-child]:aspect-[5/4]"
            />
          )
        })}
      </div>
    </section>
  )
}

export default CategorySection