import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../SearchBar'
import Button from '../Button'

function QuickSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  function submitSearch() {
    navigate(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`)
  }

  return <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Start with a feeling</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Search for your next look</h2><p className="mt-2 text-sm text-muted">Find dresses, shirts, jackets, and everything in between.</p></div><div className="mt-6 flex flex-col gap-2 sm:flex-row"><SearchBar value={query} onChange={setQuery} onSearch={submitSearch} placeholder="Search dresses, shirts, jackets..." className="flex-1" /><Button type="button" size="lg" icon={ArrowRight} onClick={submitSearch} className="shrink-0">Search</Button></div></section>
}

export default QuickSearch
