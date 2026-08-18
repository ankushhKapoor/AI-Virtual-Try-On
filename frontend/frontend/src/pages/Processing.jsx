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

function Processing() {
  const navigate = useNavigate()
  const { userPhoto, selectedProduct, addLook } = useTryOn()
  const [progress, setProgress] = useState(50)
  const resultId = useRef(`demo-${Date.now()}`)

  useEffect(() => {
    if (!userPhoto || !selectedProduct) return undefined

    // TEMPORARY FRONTEND DEMO PROCESSING: replace this timer with the real AI/API completion callback later.
    addLook({ id: resultId.current, productId: selectedProduct.id, product: selectedProduct, userPhoto, resultImage: null, createdAt: new Date().toISOString(), saved: false, favorite: false })
    const duration = 4800
    const startedAt = Date.now()
    const progressTimer = window.setInterval(() => setProgress(Math.min(100, 50 + Math.round(((Date.now() - startedAt) / duration) * 50))), 100)
    const navigationTimer = window.setTimeout(() => navigate(`/result/${resultId.current}`), duration)
    return () => { window.clearInterval(progressTimer); window.clearTimeout(navigationTimer) }
  }, [addLook, navigate, selectedProduct, userPhoto])

  if (!userPhoto || !selectedProduct) return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><ErrorState title="Your Try-On session is missing" message="Start with a photo and a clothing item before creating your look." action={<Link to="/upload"><Button icon={ArrowLeft}>Start Again</Button></Link>} /></main><Footer /></div>

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12"><Breadcrumbs items={[{ label: 'Try-On Setup', to: '/try-on' }, { label: 'Creating Your Look' }]} /><div className="mt-8"><TryOnProgress activeStep={3} /></div><section className="mx-auto mt-12 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 03 · A moment for your look</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Creating Your Look</h1><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">We're creating a virtual try-on preview using your photo and selected clothing.</p><div className="mt-10 text-left"><ProcessingAnimation photo={userPhoto} product={selectedProduct} progress={progress} /></div><div className="mt-8 text-left"><ProcessingSteps progress={progress} /></div><p className="mt-7 text-xs text-muted">This is a frontend preview while the AI integration is being prepared.</p></section></div></main><Footer /></div>
}

export default Processing
