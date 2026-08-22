import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const { userPhoto, selectedProduct, processingState, processingError, setProcessingState, setProcessingError } = useTryOn()
  const progress = 50

  if (!userPhoto || !selectedProduct) return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><ErrorState title="Your Try-On session is missing" message="Start with a photo and a clothing item before creating your look." action={<Link to="/upload"><Button icon={ArrowLeft}>Start Again</Button></Link>} /></main><Footer /></div>

  if (processingState === 'ERROR') return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><ErrorState title="Something went wrong" message={processingError || "We couldn't create your try-on right now."} action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => { setProcessingError(''); setProcessingState('PROCESSING') }}>Try Again</Button><Link to="/products"><Button variant="outline">Choose Another Clothing</Button></Link></div>} /></main><Footer /></div>

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-12"><Breadcrumbs items={[{ label: 'Try-On Setup', to: '/try-on' }, { label: 'Preparing Try-On' }]} /><div className="mt-8"><TryOnProgress activeStep={3} /></div><section className="mx-auto mt-12 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 03 · Preparing your look</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Preparing Your Try-On</h1><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted">Your photo and selected clothing are ready for the future AI processing step.</p><div className="mt-10 text-left"><ProcessingAnimation photo={userPhoto} product={selectedProduct} progress={progress} /></div><div className="mt-8 text-left"><ProcessingSteps progress={progress} /></div><p className="mt-7 text-xs text-muted">AI processing will be connected in a later integration step.</p><Link to="/try-on" className="mt-6 inline-flex text-sm font-bold text-accent hover:text-accent-dark">Back to Try-On Setup</Link></section></div></main><Footer /></div>
}

export default Processing
