import { Check, Heart } from 'lucide-react'

function SessionSummary({ photo, looks, favoriteLook }) {
  return <aside className="rounded-md border border-line bg-surface p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your Try-On Session</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3 sm:gap-6"><div><dt className="text-muted">Photo</dt><dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-success"><Check size={15} aria-hidden="true" /> {photo ? 'Uploaded' : 'Missing'}</dd></div><div><dt className="text-muted">Looks Created</dt><dd className="mt-1 font-semibold text-ink">{looks.length}</dd></div><div><dt className="text-muted">Favorite</dt><dd className="mt-1 inline-flex max-w-full items-center gap-1 truncate font-semibold text-ink">{favoriteLook ? <><Heart size={14} className="fill-[#b8893f] text-[#b8893f]" aria-hidden="true" /> {favoriteLook.product.name}</> : 'Not chosen'}</dd></div></dl></aside>
}

export default SessionSummary
