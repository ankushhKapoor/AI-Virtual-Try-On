import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import SectionHeading from '../components/SectionHeading'
import { AccountNav, HistoryCard } from '../components/account'
import useSavedLooks from '../hooks/useSavedLooks'
import useTryOn from '../hooks/useTryOn'

function History() {
  const navigate = useNavigate()
  const { history, userPhoto, selectProduct, updateHistoryLook, removeHistoryLook } = useTryOn()
  const { saveLook, isSaved } = useSavedLooks()
  const [sort, setSort] = useState('recent')
  const [removalTarget, setRemovalTarget] = useState(null)
  const sortedHistory = useMemo(() => [...history].sort((first, second) => sort === 'oldest' ? new Date(first.createdAt) - new Date(second.createdAt) : new Date(second.createdAt) - new Date(first.createdAt)), [history, sort])
  const groups = useMemo(() => sortedHistory.reduce((result, look) => { const date = new Date(look.createdAt); const days = Number.isNaN(date.getTime()) ? 999 : Math.floor((Date.now() - date.getTime()) / 86400000); const label = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? 'This Week' : 'Earlier'; (result[label] ||= []).push(look); return result }, {}), [sortedHistory])

  function saveHistoryLook(look) {
    saveLook({ id: look.id, productId: look.productId, product: look.product, userPhoto: look.userPhoto, resultImage: look.resultImage, createdAt: look.createdAt })
    updateHistoryLook(look.id, { saved: true })
  }

  function tryAgain(look) {
    selectProduct(look.product, look.product.selectedSize)
    navigate(userPhoto?.previewUrl ? '/try-on' : '/upload')
  }

  function confirmRemove() {
    if (removalTarget) removeHistoryLook(removalTarget.id)
    setRemovalTarget(null)
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><SectionHeading eyebrow="Your personal edit" title="Try-On History" description="Revisit the looks you've explored." /><div className="mt-10 flex flex-col gap-8 lg:flex-row"><AccountNav /><section className="min-w-0 flex-1">{history.length ? <><div className="flex justify-end"><label className="flex min-h-11 items-center rounded-md border border-line bg-surface px-3 text-sm text-muted"><span className="mr-2 text-xs font-bold uppercase tracking-[0.1em]">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent font-semibold text-ink outline-none"><option value="recent">Most Recent</option><option value="oldest">Oldest</option></select></label></div><div className="mt-8 space-y-10">{['Today', 'Yesterday', 'This Week', 'Earlier'].filter((group) => groups[group]?.length).map((group) => <section key={group}><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{group}</h2><div className="mt-4 space-y-4">{groups[group].map((look) => <HistoryCard key={look.id} look={look} saved={look.saved || isSaved(look.id)} onView={() => navigate(`/result/${look.id}`)} onSave={() => saveHistoryLook(look)} onTryAgain={() => tryAgain(look)} onDelete={() => setRemovalTarget(look)} />)}</div></section>)}</div></> : <EmptyState title="No Try-On History Yet" message="Your virtual looks will appear here after you try something on." action={<Link to="/products"><Button>Try Your First Look</Button></Link>} />}</section></div></div></main><Footer /><Modal open={Boolean(removalTarget)} onClose={() => setRemovalTarget(null)} title="Remove this look from your history?" actions={<><Button variant="ghost" onClick={() => setRemovalTarget(null)}>Cancel</Button><Button variant="danger" onClick={confirmRemove}>Remove</Button></>}>This only removes the history entry. Saved Looks will remain unchanged.</Modal></div>
}

export default History
