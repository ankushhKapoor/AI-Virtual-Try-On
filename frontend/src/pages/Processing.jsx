import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ErrorState from '../components/ErrorState'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import Breadcrumbs from '../components/products/Breadcrumbs'
import ProcessingAnimation from '../components/tryon/ProcessingAnimation'
import ProcessingSteps from '../components/tryon/ProcessingSteps'
import TryOnProgress from '../components/tryon/TryOnProgress'
import useTryOn from '../hooks/useTryOn'
import { API_BASE_URL, MODEL_BASE_URL } from '../services/urls'
import { detectClothType } from '../utils/clothType'

// ── Detect simple device type from UA ────────────────────────
function detectDeviceType() {
  const ua = navigator.userAgent || ''
  if (/Mobi|Android/i.test(ua)) return 'Mobile'
  if (/Tablet|iPad/i.test(ua)) return 'Tablet'
  return 'Desktop'
}

// ── Fire-and-forget DWH recording (never throws) ─────────────
async function recordTryOnEvent({ success, failureReason, product, processingTimeMs, evaluationMetrics }) {
  try {
    let token = ''
    try {
      const session = JSON.parse(localStorage.getItem('vesta_auth_session') || '{}')
      token = session?.accessToken || ''
    } catch (_e) {}
    if (!token) {
      token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || ''
    }
    const cat = (product?.category || '').toLowerCase()
    const price = product?.price
    let priceBracket = 'Mid (₹1000–₹2999)'
    if (typeof price === 'number') {
      if (price < 500) priceBracket = 'Budget (Under ₹500)'
      else if (price < 1000) priceBracket = 'Low (₹500–₹999)'
      else if (price < 3000) priceBracket = 'Mid (₹1000–₹2999)'
      else if (price < 7000) priceBracket = 'High (₹3000–₹6999)'
      else priceBracket = 'Premium (₹7000+)'
    }
    let uploadMethod = 'File Upload'
    const clothUrl = product?.image || (product?.images && product.images[0]) || ''
    if (clothUrl.startsWith('http')) uploadMethod = 'Studio URL'

    const body = {
      success,
      failure_reason: failureReason || 'None',
      product_id: String(product?.id || product?.asin || 'unknown'),
      product_category: product?.category || 'Unknown',
      product_price_bracket: priceBracket,
      device_type: detectDeviceType(),
      upload_method: uploadMethod,
      processing_time_ms: processingTimeMs ?? null,
      quality_score: success
        ? evaluationMetrics?.garment_visual_match ?? evaluationMetrics?.fit_placement_plausibility ?? null
        : null,
    }
    await fetch(`${API_BASE_URL}/tryon/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch (_err) {
    // Silently swallow — never affect UX
  }
}


function Processing() {
  const navigate = useNavigate()
  const { userPhoto, selectedProduct, addLook, updateLook, setProcessingState, setProcessingError } = useTryOn()
  const [progress, setProgress] = useState(10)
  const [apiError, setApiError] = useState(null)
  const resultId = useRef('tryon-' + Date.now())
  const calledRef = useRef(false)

  useEffect(() => {
    if (!userPhoto || !selectedProduct) return undefined
    if (calledRef.current) return undefined
    calledRef.current = true

    const prodId = selectedProduct.id || selectedProduct.asin || 'product'

    addLook({
      id: resultId.current,
      productId: prodId,
      product: selectedProduct,
      userPhoto,
      resultImage: null,
      createdAt: new Date().toISOString(),
      saved: false,
      favorite: false,
    })

    setProgress(20)

    async function runTryOn() {
      const startMs = Date.now()
      try {
        const formData = new FormData()

        if (userPhoto.file instanceof File) {
          formData.append('person_image', userPhoto.file, userPhoto.fileName)
        } else {
          const blob = await fetch(userPhoto.previewUrl).then(r => r.blob())
          formData.append('person_image', blob, userPhoto.fileName || 'person.jpg')
        }

        const clothImageUrl =
          selectedProduct.image ||
          (selectedProduct.images && selectedProduct.images[0])
        if (!clothImageUrl) throw new Error('No clothing image URL found for this product.')
        formData.append('cloth_url', clothImageUrl)

        const clothType = detectClothType(selectedProduct)
        formData.append('cloth_type', clothType)
        formData.append('garment_name', selectedProduct.title || selectedProduct.name || '')
        formData.append('garment_category', selectedProduct.category || '')
        formData.append('num_inference_steps', '50')
        formData.append('guidance_scale', '2.5')
        formData.append('seed', '42')

        setProgress(40)
        let response
        try {
          response = await fetch(MODEL_BASE_URL + '/tryon', {
            method: 'POST',
            body: formData,
          })
        } catch (_modelErr) {
          response = await fetch(API_BASE_URL + '/tryon', {
            method: 'POST',
            body: formData,
          })
        }
        setProgress(85)


        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: response.statusText }))
          throw new Error(errData.detail || 'Model API error ' + response.status)
        }

        const data = await response.json()
        const processingTimeMs = Date.now() - startMs
        updateLook(resultId.current, {
          resultImage: data.result_image,
          evaluationMetrics: data.evaluation_metrics || null,
        })
        setProgress(100)

        // ── Record success in live DWH (fire-and-forget) ─────
        recordTryOnEvent({
          success: true,
          product: selectedProduct,
          processingTimeMs,
          evaluationMetrics: data.evaluation_metrics,
        })

        setTimeout(() => navigate('/result/' + resultId.current), 400)
      } catch (err) {
        const processingTimeMs = Date.now() - startMs
        console.error('Try-on API call failed:', err)
        setApiError(err.message || 'Unknown error')
        updateLook(resultId.current, { resultImage: null, error: err.message })

        // ── Record failure in live DWH (fire-and-forget) ─────
        recordTryOnEvent({ success: false, failureReason: err.message, product: selectedProduct, processingTimeMs })

        setTimeout(() => navigate('/result/' + resultId.current), 2000)
      }
    }

    runTryOn()
  }, [addLook, updateLook, navigate, selectedProduct, userPhoto])

  if (!userPhoto || !selectedProduct) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-24 sm:px-8">
          <ErrorState
            title="Your Try-On session is missing"
            message="Start with a photo and a clothing item before creating your look."
            action={<Link to="/upload"><Button icon={ArrowLeft}>Start Again</Button></Link>}
          />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main>
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
          <Breadcrumbs
            items={[{ label: 'Try-On Setup', to: '/try-on' }, { label: 'Creating Your Look' }]}
          />
          <div className="mt-8">
            <TryOnProgress activeStep={3} />
          </div>
          <section className="mx-auto mt-12 max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              Step 03 - A moment for your look
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
              Creating Your Look
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">
              {apiError
                ? ('Note: ' + apiError + ' - redirecting to result page...')
                : "We're generating your virtual try-on using AI. This may take a minute."}
            </p>
            <div className="mt-10 text-left">
              <ProcessingAnimation photo={userPhoto} product={selectedProduct} progress={progress} />
            </div>
            <div className="mt-8 text-left">
              <ProcessingSteps progress={progress} />
            </div>
            {!apiError && (
              <p className="mt-7 text-xs text-muted">
                Powered by CatVTON AI model - processing on GPU
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Processing
