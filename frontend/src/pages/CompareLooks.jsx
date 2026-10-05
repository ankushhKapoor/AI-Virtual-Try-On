import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import Breadcrumbs from '../components/products/Breadcrumbs'
import ComparisonGrid from '../components/compare/ComparisonGrid'
import LookCard from '../components/compare/LookCard'
import SessionSummary from '../components/compare/SessionSummary'
import useSavedLooks from '../hooks/useSavedLooks'
import useTryOn from '../hooks/useTryOn'

function CompareLooks() {
  const navigate = useNavigate()
  const { userPhoto, selectProduct, looks, updateLook, removeLook, favoriteLookId, chooseFavorite } = useTryOn()
  const { saveLook, isSaved } = useSavedLooks()
  const [selectedIds, setSelectedIds] = useState([])
  const [removalTarget, setRemovalTarget] = useState(null)

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => looks.some((look) => look.id === id)))
  }, [looks])

  const selectedLooks = looks.filter((look) => selectedIds.includes(look.id))
  const favoriteLook = looks.find((look) => look.id === favoriteLookId)

  function toggleSelected(lookId) {
    setSelectedIds((current) => current.includes(lookId) ? current.filter((id) => id !== lookId) : current.length < 4 ? [...current, lookId] : current)
  }

  function saveSessionLook(look) {
    saveLook({ id: look.id, productId: look.productId, product: look.product, userPhoto: look.userPhoto, resultImage: look.resultImage, createdAt: look.createdAt })
    updateLook(look.id, { saved: true })
  }

  function tryLookAgain(look) {
    selectProduct(look.product, look.product.selectedSize)
    navigate(userPhoto ? '/try-on' : '/upload')
  }

  function confirmRemove() {
    if (!removalTarget) return
    removeLook(removalTarget.id)
    setRemovalTarget(null)
  }

  if (!userPhoto) return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto max-w-2xl px-5 py-24 sm:px-8"><EmptyState title="Upload a photo to start your Try-On session" message="Your looks will appear here after you create them." action={<Link to="/upload"><Button icon={ArrowLeft}>Upload Photo</Button></Link>} /></main><Footer /></div>

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><Breadcrumbs items={[{ label: 'Try-On', to: '/try-on' }, { label: 'Compare Looks' }]} /><div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your style session</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Compare Your Looks</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted">Compare different outfits and choose your favorite.</p></div><Link to="/products"><Button size="sm" variant="outline">Try Another Clothing</Button></Link></div><div className="mt-8"><SessionSummary photo={userPhoto} looks={looks} favoriteLook={favoriteLook} /></div>{!looks.length ? <div className="mt-8"><EmptyState title="No looks yet" message="Try some clothing to create your first virtual look." action={<Link to="/products"><Button>Explore Clothing</Button></Link>} /></div> : <><div className="mt-12 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Your Looks</h2><p className="mt-1 text-sm text-muted">Select up to four looks to compare.</p></div><span className="text-sm font-semibold text-muted">{selectedIds.length} / 4 selected</span></div><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{looks.map((look) => <LookCard key={look.id} look={look} selected={selectedIds.includes(look.id)} saved={look.saved || isSaved(look.id)} favorite={look.favorite} onSelect={() => toggleSelected(look.id)} onView={() => navigate(`/result/${look.id}`)} onViewProduct={() => navigate(`/products/${look.productId}`)} onSave={() => saveSessionLook(look)} onTryAgain={() => tryLookAgain(look)} onFavorite={() => chooseFavorite(look.id)} onRemove={() => setRemovalTarget(look)} />)}</div><div className="mt-12">{selectedIds.length < 2 ? <div className="rounded-md border border-line bg-surface px-5 py-4 text-sm text-muted" role="status">Select at least 2 looks to compare.</div> : <ComparisonGrid looks={selectedLooks} />}</div></>}</div></main><Footer /><Modal open={Boolean(removalTarget)} onClose={() => setRemovalTarget(null)} title="Remove this look?" actions={<><Button variant="ghost" onClick={() => setRemovalTarget(null)}>Cancel</Button><Button variant="danger" onClick={confirmRemove}>Remove</Button></>}>This look will be removed from your current Try-On session.</Modal></div>
}

export default CompareLooks
