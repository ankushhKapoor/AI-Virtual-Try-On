import { Download, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
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
  const fileInputRef = useRef(null)
  const { savedLooks, removeSavedLook, exportSavedLooks, importSavedLooks } = useSavedLooks()
  const { selectProduct, userPhoto, updateLook } = useTryOn()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [transferMessage, setTransferMessage] = useState('')
  const [transferring, setTransferring] = useState(false)
  const filteredLooks = useMemo(() => savedLooks.filter((look) => {
    const query = search.toLowerCase().trim()
    return !query || look.product.name.toLowerCase().includes(query) || look.product.category.toLowerCase().includes(query)
  }).sort((first, second) => sort === 'oldest' ? new Date(first.createdAt) - new Date(second.createdAt) : new Date(second.createdAt) - new Date(first.createdAt)), [savedLooks, search, sort])

  function removeLook(look) {
    removeSavedLook(look.id)
    updateLook(look.id, { saved: false })
  }

  function tryAgain(look) {
    selectProduct(look.product, look.product.selectedSize)
    navigate(userPhoto?.previewUrl ? '/try-on' : '/upload')
  }

  async function exportLooks() {
    setTransferring(true)
    setTransferMessage('')
    try {
      const count = await exportSavedLooks()
      setTransferMessage(`Exported ${count} saved ${count === 1 ? 'look' : 'looks'} with images.`)
    } catch (error) {
      setTransferMessage(error.message || 'Could not export Saved Looks.')
    } finally {
      setTransferring(false)
    }
  }

  async function importLooks(event) {
    const [file] = event.target.files || []
    event.target.value = ''
    if (!file) return
    setTransferring(true)
    setTransferMessage('')
    try {
      const count = await importSavedLooks(file)
      setTransferMessage(`Imported ${count} saved ${count === 1 ? 'look' : 'looks'} with images.`)
    } catch (error) {
      setTransferMessage(error.message || 'Could not import Saved Looks.')
    } finally {
      setTransferring(false)
    }
  }

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16"><SectionHeading eyebrow="Your personal edit" title="Saved Looks" description="Your favorite virtual try-on outfits." /><div className="mt-10 flex flex-col gap-8 lg:flex-row"><AccountNav savedCount={savedLooks.length} /><section className="min-w-0 flex-1"><input ref={fileInputRef} type="file" accept="application/json,.json" className="sr-only" onChange={importLooks} />{savedLooks.length ? <><div className="flex flex-col gap-3 xl:flex-row"><SearchBar value={search} onChange={setSearch} placeholder="Search saved looks..." /><label className="flex min-h-12 items-center rounded-md border border-line bg-surface px-3 text-sm text-muted"><span className="mr-2 text-xs font-bold uppercase tracking-[0.1em]">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent font-semibold text-ink outline-none"><option value="recent">Recently Saved</option><option value="oldest">Oldest</option></select></label><Button size="sm" variant="outline" icon={Download} loading={transferring} onClick={exportLooks}>Export</Button><Button size="sm" variant="outline" icon={Upload} disabled={transferring} onClick={() => fileInputRef.current?.click()}>Import</Button></div>{transferMessage ? <p className="mt-3 text-sm font-medium text-muted" role="status">{transferMessage}</p> : null}{filteredLooks.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredLooks.map((look) => <SavedLookCard key={look.id} look={look} onView={() => navigate(`/result/${look.id}`)} onViewProduct={() => navigate(`/products/${look.productId}`)} onTryAgain={() => tryAgain(look)} onRemove={() => removeLook(look)} />)}</div> : <div className="mt-8"><EmptyState title="No matching saved looks" message="Try a different search term." /></div>}</> : <EmptyState title="Your Saved Looks are Empty" message="Import a Saved Looks backup or try different outfits and save the ones you love." action={<div className="flex flex-wrap justify-center gap-3"><Button variant="outline" icon={Upload} onClick={() => fileInputRef.current?.click()}>Import Backup</Button><button type="button" onClick={() => navigate('/products')} className="text-sm font-bold text-accent hover:text-accent-dark">Start Trying On</button></div>} />}</section></div></div></main><Footer /></div>
}

export default SavedLooks
