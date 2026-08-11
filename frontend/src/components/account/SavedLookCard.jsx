import { ExternalLink, Trash2 } from 'lucide-react'
import Button from '../Button'
import ResultImagePlaceholder from '../tryon/ResultImagePlaceholder'

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SavedLookCard({ look, onView, onViewProduct, onTryAgain, onRemove }) {
  const price = typeof look.product.price === 'number' ? `₹${look.product.price.toLocaleString('en-IN')}` : look.product.price
  return <article className="overflow-hidden rounded-md border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-soft)]"><ResultImagePlaceholder resultImage={look.resultImage} className="aspect-[3/4] rounded-none border-0" /><div className="space-y-3 p-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{look.product.category}</p><h2 className="mt-1 font-semibold text-ink">{look.product.name}</h2><p className="mt-1 text-sm text-muted">{price} · Saved {formatDate(look.createdAt)}</p></div><div className="grid grid-cols-2 gap-2"><Button size="sm" onClick={onView} icon={ExternalLink}>View Look</Button><Button size="sm" variant="outline" onClick={onViewProduct}>View Product</Button><Button size="sm" variant="ghost" onClick={onTryAgain}>Try Again</Button><Button size="sm" variant="ghost" onClick={onRemove} className="text-danger hover:text-danger"><Trash2 size={14} aria-hidden="true" /> Remove</Button></div></div></article>
}

export default SavedLookCard
