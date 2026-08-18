import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import SectionHeading from '../components/SectionHeading'
import { AccountNav, SavedLookCard } from '../components/account'
import useSavedLooks from '../hooks/useSavedLooks'
import useTryOn from '../hooks/useTryOn'

function SavedLooks() {
  const navigate = useNavigate()
  const { savedLooks, removeSavedLook } = useSavedLooks()
  const { selectProduct, userPhoto, updateLook } = useTryOn()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const filteredLooks = useMemo(() => savedLooks.filter((look) => { const query = search.toLowerCase().trim(); return !query || look.product.name.toLowerCase().includes(query) || look.product.category.toLowerCase().includes(query) }).sort((first, second) => sort === 'oldest' ? new Date(first.createdAt) - new Date(second.createdAt) : new Date(second.createdAt) - new Date(first.createdAt)), [savedLooks, search, sort])

  function removeLook(look) {
    removeSavedLook(look.id)
    updateLook(look.id, { saved: false })
  }

  function tryAgain(look) {
    selectProduct(look.product, look.product.selectedSize)
    navigate(userPhoto?.previewUrl ? '/try-on' : '/upload')
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><SectionHeading eyebrow="Your personal edit" title="Saved Looks" description="Your favorite virtual try-on outfits." /><div className="mt-10 flex flex-col gap-8 lg:flex-row"><AccountNav savedCount={savedLooks.length} /><section className="min-w-0 flex-1">{savedLooks.length ? <><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><SearchBar value={search} onChange={setSearch} placeholder="Search saved looks..." /><label className="flex min-h-12 items-center rounded-md border border-line bg-surface px-3 text-sm text-muted"><span className="mr-2 text-xs font-bold uppercase tracking-[0.1em]">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent font-semibold text-ink outline-none"><option value="recent">Recently Saved</option><option value="oldest">Oldest</option></select></label></div>{filteredLooks.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredLooks.map((look) => <SavedLookCard key={look.id} look={look} onView={() => navigate(`/result/${look.id}`)} onViewProduct={() => navigate(`/products/${look.productId}`)} onTryAgain={() => tryAgain(look)} onRemove={() => removeLook(look)} />)}</div> : <div className="mt-8"><EmptyState title="No matching saved looks" message="Try a different search term." /></div>}</> : <EmptyState title="Your Saved Looks are Empty" message="Try different outfits and save the ones you love." action={<button type="button" onClick={() => navigate('/products')} className="text-sm font-bold text-accent hover:text-accent-dark">Start Trying On</button>} />}</section></div></div></main><Footer /></div>
}

export default SavedLooks
