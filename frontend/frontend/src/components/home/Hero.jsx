import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

const HERO_ASIN = 'B0GLGKGCB4'

function Hero() {
  const [heroImage, setHeroImage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadHeroProduct() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/products?asin=${HERO_ASIN}`
        )

        if (!response.ok) {
          throw new Error(
            `Failed to load Amazon product: ${response.status}`
          )
        }

        const data = await response.json()

        const image =
          data.image ||
          (Array.isArray(data.images)
            ? data.images.find(Boolean)
            : null)

        if (!cancelled && image) {
          setHeroImage(image)
        }
      } catch (error) {
        console.error(
          'Failed to load Hero Amazon product:',
          error
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadHeroProduct()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">

      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">

        <div>

          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            <Sparkles
              size={15}
              aria-hidden="true"
            />

            Fashion, reimagined
          </p>

          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">
            Try Before{' '}
            <span className="text-accent">
              You Buy
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Experience fashion differently.
            Upload your photo, choose a look,
            and visualize how it fits you with
            AI-powered virtual try-on.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">

            <Link
              to="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3.5 text-sm font-bold text-white transition hover:bg-accent-dark"
            >
              <Sparkles
                size={17}
                aria-hidden="true"
              />

              Try It On
            </Link>

            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-ink"
            >
              Explore Collection

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </Link>

          </div>

          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-5 text-xs text-muted">

            <span>
              <strong className="text-ink">
                01
              </strong>{' '}
              Personal
            </span>

            <span>
              <strong className="text-ink">
                02
              </strong>{' '}
              Visual
            </span>

            <span>
              <strong className="text-ink">
                03
              </strong>{' '}
              Confident
            </span>

          </div>

        </div>

        <div className="relative">

          <div className="overflow-hidden rounded-[2rem] border border-line bg-[#e8e5dc]">

            <div className="flex items-center justify-between border-b border-white/60 px-6 py-4">

              <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Vesta / Edit
              </span>

            </div>

            <div className="relative aspect-[4/5] w-full overflow-hidden">

              {loading ? (

                <div className="absolute inset-0 animate-pulse bg-accent-soft" />

              ) : heroImage ? (

                <img
                  src={heroImage}
                  alt="Amazon fashion product"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />

              ) : (

                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">

                  <p className="text-sm text-muted">
                    Fashion image unavailable.
                  </p>

                </div>

              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />

              <div className="absolute bottom-5 left-5 max-w-[230px] border border-line bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm">

                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
                  Your style, visualized
                </p>

                <p className="mt-1 text-sm font-semibold text-ink">
                  See the possibility
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  )
}

export default Hero