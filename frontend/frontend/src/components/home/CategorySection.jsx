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
    query: 'women western clothing',
    keywords: [
      'women',
      'women',
      'ladies',
      'female',
    ],
  },
  {
    name: 'Men',
    description: 'Modern wardrobe staples',
    query: 'men clothing fashion',
    keywords: [
      'men',
      'men',
      'shirt',
      'jacket',
      'tshirt',
    ],
  },
  {
    name: 'Dresses',
    description: 'From day to evening',
    query: 'women dresses party casual',
    keywords: [
      'dress',
      'dresses',
      'gown',
    ],
  },
  {
    name: 'Tops',
    description: 'Easy layers and essentials',
    query: 'women tops fashion',
    keywords: [
      'top',
      'tops',
      'crop',
      'tank',
      'blouse',
    ],
  },
  {
    name: 'Shirts',
    description: 'Clean, considered cuts',
    query: 'fashion shirts men women',
    keywords: [
      'shirt',
      'shirts',
      'formal shirt',
      'casual shirt',
    ],
  },
  {
    name: 'Jeans',
    description: 'Fits for every day',
    query: 'jeans men women denim',
    keywords: [
      'jeans',
      'denim',
      'jean',
    ],
  },
  {
    name: 'Jackets',
    description: 'The finishing layer',
    query: 'jackets men women fashion',
    keywords: [
      'jacket',
      'jackets',
      'bomber',
      'windbreaker',
    ],
  },
  {
    name: 'Accessories',
    description: 'Details that define you',
    query: 'fashion accessories women men',
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

  if (product.title) {
    score += 1
  }

  return score
}


function CategorySection() {
  const navigate = useNavigate()

  const [categoryProducts, setCategoryProducts] =
    useState({})

  const [loading, setLoading] =
    useState(true)


  useEffect(() => {
    let cancelled = false


    async function loadCategoryImages() {
      const usedAsins = new Set()
      const results = {}


      try {

        for (
          const category of categories
        ) {

          if (cancelled) {
            return
          }


          try {

            const response =
              await fetch(
                `${API_BASE_URL}/search?query=${encodeURIComponent(
                  category.query
                )}`
              )


            if (!response.ok) {
              continue
            }


            const data =
              await response.json()


            const products =
              Array.isArray(
                data.products
              )
                ? data.products.filter(
                    product =>
                      product &&
                      product.asin &&
                      product.image
                  )
                : []


            /*
             * Score products based on how
             * closely the title matches
             * this category.
             */
            const rankedProducts =
              [...products].sort(
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


            /*
             * First choose the best matching
             * product that has not already
             * been used by another category.
             */
            const selectedProduct =
              rankedProducts.find(
                product =>
                  !usedAsins.has(
                    product.asin
                  )
              )


            if (
              selectedProduct
            ) {

              usedAsins.add(
                selectedProduct.asin
              )


              results[
                category.name
              ] = {
                image:
                  selectedProduct.image,

                asin:
                  selectedProduct.asin,
              }

            }

          } catch (error) {

            console.error(
              `Failed to load ${category.name} image:`,
              error
            )

          }
        }


        /*
         * If the backend returned enough
         * unique products, every category
         * will have a different image.
         */
        if (!cancelled) {
          setCategoryProducts(
            results
          )
        }

      } catch (error) {

        console.error(
          'Failed to load category images:',
          error
        )

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

        {categories.map(
          category => {

            const product =
              categoryProducts[
                category.name
              ]


            return (
              <CategoryCard
                key={
                  category.name
                }

                name={
                  category.name
                }

                description={
                  category.description
                }

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

          }
        )}

      </div>

    </section>
  )
}


export default CategorySection