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

const MODEL_API_URL = 'http://127.0.0.1:8001'

function Processing() {
  const navigate = useNavigate()
  const { userPhoto, selectedProduct, addLook, updateLook } = useTryOn()
  const [progress, setProgress] = useState(10)
  const [apiError, setApiError] = useState(null)
  const resultId = useRef('tryon-' + Date.now())
  const calledRef = useRef(false)

  useEffect(() => {
    if (!userPhoto || !selectedProduct) return undefined
    if (calledRef.current) return undefined
    calledRef.current = true

    addLook({
      id: resultId.current,
      productId: selectedProduct.id,
      product: selectedProduct,
      userPhoto,
      resultImage: null,
      createdAt: new Date().toISOString(),
      saved: false,
      favorite: false,
    })
    setProgress(20)

    async function runTryOn() {
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

        const cat = (selectedProduct.category || '').toLowerCase()
        let clothType = 'upper'
        if (cat.includes('trouser') || cat.includes('jean') ||
            cat.includes('pant') || cat.includes('skirt')) {
          clothType = 'lower'
        } else if (cat.includes('dress') || cat.includes('overall') || cat.includes('suit')) {
          clothType = 'overall'
        }
        formData.append('cloth_type', clothType)
        formData.append('num_inference_steps', '50')
        formData.append('guidance_scale', '2.5')
        formData.append('seed', '42')

        setProgress(40)
        const response = await fetch(MODEL_API_URL + '/tryon', {
          method: 'POST',
          body: formData,
        })
        setProgress(85)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: response.statusText }))
          throw new Error(errData.detail || 'Model API error ' + response.status)
        }

        const data = await response.json()
        updateLook(resultId.current, { resultImage: data.result_image })
        setProgress(100)
        setTimeout(() => navigate('/result/' + resultId.current), 400)
      } catch (err) {
        console.error('Try-on API call failed:', err)
        setApiError(err.message || 'Unknown error')
        updateLook(resultId.current, { resultImage: null, error: err.message })
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
