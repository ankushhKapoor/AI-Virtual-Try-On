import { ArrowLeft, Check, Star } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import Breadcrumbs from '../components/products/Breadcrumbs'
import BeforeAfterView from '../components/tryon/BeforeAfterView'
import RecentLooks from '../components/tryon/RecentLooks'
import ResultActions from '../components/tryon/ResultActions'
import ResultImagePlaceholder from '../components/tryon/ResultImagePlaceholder'
import TryOnProgress from '../components/tryon/TryOnProgress'
import useSavedLooks from '../hooks/useSavedLooks'
import useTryOn from '../hooks/useTryOn'

function TryOnResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tryOnResult, looks, updateLook } = useTryOn()
  const { saveLook, isSaved } = useSavedLooks()
  const result = tryOnResult?.id === id ? tryOnResult : looks.find((look) => look.id === id) || null

  if (!result) return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><EmptyState title="Try-On result unavailable" message="This result is no longer in the current browser session. Start again to create a new preview." action={<Link to="/upload"><Button icon={ArrowLeft}>Try Again</Button></Link>} /></main><Footer /></div>

  const product = result.product
  const displayPrice = typeof product.price === 'number' ? `₹${product.price.toLocaleString('en-IN')}` : product.price
  const saved = result.saved || isSaved(result.id)
  const otherLooks = looks.filter((look) => look.id !== result.id)

  function handleSave() {
    saveLook({ id: result.id, productId: result.productId, product, userPhoto: result.userPhoto, resultImage: result.resultImage, createdAt: result.createdAt })
    updateLook(result.id, { saved: true })
  }

  async function handleShare() {
    if (navigator.share) await navigator.share({ title: 'My VESTA AI Try-On', text: `I tried on ${product.name} with VESTA AI.` }).catch(() => {})
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><Breadcrumbs items={[{ label: 'Try-On', to: '/try-on' }, { label: 'Your New Look' }]} /><div className="mt-8"><TryOnProgress activeStep={4} /></div><div className="mt-12"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 04 · Your preview</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Your New Look</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted">Here's how your selected clothing looks in your virtual try-on.</p></div><div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.75fr)] lg:gap-16"><section><ResultImagePlaceholder resultImage={result.resultImage} /><p className="mt-3 text-xs text-muted">Generated image slot · ready for future AI output</p></section><section className="rounded-md border border-line bg-surface p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Selected Clothing</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{product.name}</h2><div className="mt-4 flex flex-wrap items-center gap-3"><p className="text-lg font-semibold text-ink">{displayPrice}</p><span className="h-4 w-px bg-line-strong" aria-hidden="true" /><span className="inline-flex items-center gap-1 text-sm text-muted"><Star size={15} className="fill-[#b8893f] text-[#b8893f]" aria-hidden="true" /> {product.rating}</span></div><p className="mt-3 text-sm text-muted">{product.category} · {product.color}{product.selectedSize ? ` · Size ${product.selectedSize}` : ''}</p><dl className="mt-7 space-y-4 border-y border-line py-6 text-sm"><div className="flex items-center justify-between"><dt className="text-muted">Your Photo</dt><dd className="inline-flex items-center gap-1.5 font-semibold text-success"><Check size={15} aria-hidden="true" /> Uploaded</dd></div><div className="flex items-center justify-between"><dt className="text-muted">Selected Clothing</dt><dd className="max-w-[12rem] truncate font-semibold text-ink">{product.name}</dd></div><div className="flex items-center justify-between"><dt className="text-muted">Status</dt><dd className="font-semibold text-accent">Virtual Try-On Preview</dd></div></dl><ResultActions result={result} isSaved={saved} onSave={handleSave} onTryAnother={() => navigate('/products')} onViewProduct={() => navigate(`/products/${result.productId}`)} onShare={handleShare} /></section></div><BeforeAfterView beforeImage={result.userPhoto?.previewUrl} afterImage={result.resultImage} /><RecentLooks looks={otherLooks} onView={(lookId) => navigate(`/result/${lookId}`)} onCompare={() => navigate('/compare')} /></div></main><Footer /></div>
}

export default TryOnResult
