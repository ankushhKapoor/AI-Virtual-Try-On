/**
 * CompleteTheLook.jsx
 * -------------------
 * "Complete the Look" section for the ProductDetails page.
 *
 * Calls POST /recommendations with the currently viewed product and renders
 * real Amazon products grouped by outfit slot (top, bottom, footwear, accessory).
 *
 * Rules:
 * - Uses existing ProductCard for each recommended product
 * - Uses existing fetchJsonWithCache utility (TTL_SEARCH = 30 min)
 * - Does NOT break or hide existing product details if it fails
 * - Shows a graceful loading and error state
 */

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

import ProductCard from './ProductCard'
import LoadingSpinner from './LoadingSpinner'

const API_BASE_URL = 'http://127.0.0.1:8000'

// Slot display metadata
const SLOT_META = {
  top:       { label: 'Tops',        emoji: '👕' },
  bottom:    { label: 'Bottoms',     emoji: '👖' },
  footwear:  { label: 'Footwear',    emoji: '👟' },
  accessory: { label: 'Accessories', emoji: '👜' },
  outerwear: { label: 'Outerwear',   emoji: '🧥' },
}

function SlotRow({ slot, category, products, onWishlist, onTryOn }) {
  const meta = SLOT_META[slot] || { label: slot, emoji: '•' }

  if (!products || products.length === 0) return null

  // Normalize backend product shape to what ProductCard expects
  const normalized = products.map((p) => ({
    id:          p.asin || p.id || '',
    asin:        p.asin || '',
    name:        p.title || p.name || 'Product',
    title:       p.title || p.name || 'Product',
    brand:       p.brand || '',
    price:       typeof p.price === 'number' ? p.price : (parseFloat(p.price) || 0),
    currency:    p.currency || 'INR',
    rating:      Number(p.rating) || 0,
    image:       p.image || (Array.isArray(p.images) ? p.images[0] : null) || null,
    images:      Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
    url:         p.url || '',
    category:    p.category || category || slot,
    isWishlisted: false,
  }))

  return (
    <div className="mb-10">
      {/* Slot heading */}
      <div className="mb-5 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{meta.emoji}</span>
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">
          {meta.label}
        </h3>
        <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted border border-line">
          {normalized.length}
        </span>
      </div>

      {/* Product cards grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {normalized.map((product) => (
          <ProductCard
            key={product.id || product.asin}
            product={product}
            onWishlist={onWishlist ? () => onWishlist(product) : undefined}
            onTryOn={onTryOn ? () => onTryOn(product) : undefined}
          />
        ))}
      </div>
    </div>
  )
}


function CompleteTheLook({ product, onWishlist, onTryOn }) {
  const [recommendations, setRecommendations] = useState(null)  // null = loading
  const [error, setError]                     = useState('')
  const [attributes, setAttributes]           = useState(null)

  useEffect(() => {
    if (!product || !product.asin) return

    let cancelled = false
    setRecommendations(null)
    setError('')
    setAttributes(null)

    async function fetchRecommendations() {
      try {
        const body = {
          product: {
            asin:     product.asin,
            title:    product.title || product.name || null,
            image:    product.image  || (product.images && product.images[0]) || null,
            brand:    product.brand  || null,
            category: product.category || null,
            gender:   product.gender   || null,
            color:    product.color    || null,
            domain:   'in',
          },
        }

        const resp = await fetch(`${API_BASE_URL}/recommendations`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })

        if (!resp.ok) {
          throw new Error(`Recommendation API returned ${resp.status}`)
        }

        const data = await resp.json()

        if (!cancelled) {
          setRecommendations(data.recommendations || [])
          setAttributes(data.attributes || null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[CompleteTheLook] Failed:', err)
          setError('Recommendations are temporarily unavailable.')
          setRecommendations([])   // empty array = not loading
        }
      }
    }

    fetchRecommendations()
    return () => { cancelled = true }
  }, [product?.asin])

  // ── Loading ──
  if (recommendations === null) {
    return (
      <section
        className="mt-20 border-t border-line pt-12"
        aria-label="Loading outfit recommendations"
      >
        <div className="mb-8 flex items-center gap-3">
          <Sparkles size={20} className="text-accent" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Complete the Look
          </h2>
        </div>

        <div className="flex items-center gap-3 text-muted">
          <LoadingSpinner />
          <span className="text-sm">Finding matching outfits…</span>
        </div>
      </section>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <section
        className="mt-20 border-t border-line pt-12"
        aria-label="Outfit recommendations unavailable"
      >
        <div className="mb-4 flex items-center gap-3">
          <Sparkles size={20} className="text-accent" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Complete the Look
          </h2>
        </div>
        <p className="text-sm text-muted">{error}</p>
      </section>
    )
  }

  // ── No results (model returned empty slots) ──
  if (recommendations.length === 0) return null

  // ── Filter out slots with no products ──
  const activeSlots = recommendations.filter(
    (r) => Array.isArray(r.products) && r.products.length > 0
  )
  if (activeSlots.length === 0) return null

  // ── Success ──
  return (
    <section
      className="mt-20 border-t border-line pt-12"
      aria-label="Complete the Look"
    >
      {/* Section header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-accent" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              AI Outfit Recommendation
            </p>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Complete the Look
          </h2>
          {attributes && attributes.category && (
            <p className="mt-2 text-sm text-muted">
              Based on:{' '}
              <span className="font-medium text-ink capitalize">
                {[
                  attributes.color,
                  attributes.style,
                  attributes.category,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Slot rows */}
      {activeSlots.map((rec) => (
        <SlotRow
          key={rec.slot}
          slot={rec.slot}
          category={rec.category}
          products={rec.products}
          onWishlist={onWishlist}
          onTryOn={onTryOn}
        />
      ))}
    </section>
  )
}

export default CompleteTheLook
