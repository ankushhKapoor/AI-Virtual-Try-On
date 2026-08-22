import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import Breadcrumbs from '../components/products/Breadcrumbs'
import TryOnProgress from '../components/tryon/TryOnProgress'
import TryOnSummary from '../components/tryon/TryOnSummary'
import useTryOn from '../hooks/useTryOn'

function TryOn() {
  const navigate = useNavigate()
  const { userPhoto, selectedProduct, setProcessingState, setProcessingError } = useTryOn()

  function startProcessing() {
    if (!userPhoto?.previewUrl || !selectedProduct) return
    setProcessingError('')
    setProcessingState('PROCESSING')
    navigate('/processing')
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12"><Breadcrumbs items={[{ label: 'Upload Photo', to: '/upload' }, { label: 'Review Look' }]} /><div className="mt-8"><TryOnProgress activeStep={2} /></div><div className="mt-12"><Link to="/upload" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent"><ArrowLeft size={16} aria-hidden="true" /> Change Photo</Link><p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 02 · Review your look</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Ready to Try It On?</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted">Review your photo and selected clothing before generating your look.</p></div><div className="mt-10"><TryOnSummary photo={userPhoto} product={selectedProduct} onChangePhoto={() => navigate('/upload')} onChangeClothing={() => navigate('/products')} onStart={startProcessing} /></div></div></main><Footer /></div>
}

export default TryOn
