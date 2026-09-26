import { Eye, Trash2 } from 'lucide-react'
import Button from '../Button'
import ResultImagePlaceholder from '../tryon/ResultImagePlaceholder'

function formatTime(value) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

function HistoryCard({ look, saved, onView, onSave, onTryAgain, onDelete }) {
  return <article className="flex flex-col gap-4 rounded-md border border-line bg-surface p-3 sm:flex-row"><ResultImagePlaceholder resultImage={look.resultImage} className="aspect-[3/4] w-full shrink-0 rounded-md sm:w-32" /><div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-1"><div><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{look.product.category}</p><h2 className="mt-1 font-semibold text-ink">{look.product.name}</h2></div><span className="whitespace-nowrap text-xs text-muted">{formatTime(look.createdAt)}</span></div><p className="mt-2 text-sm text-muted">{look.product.color}{look.product.selectedSize ? ` · Size ${look.product.selectedSize}` : ''} · ★ {look.product.rating}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onView} icon={Eye}>View</Button><Button size="sm" variant="ghost" onClick={onSave}>{saved ? 'Saved' : 'Save'}</Button><Button size="sm" variant="ghost" onClick={onTryAgain}>Try Again</Button><button type="button" onClick={onDelete} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold text-muted hover:text-danger" aria-label={`Delete ${look.product.name} from history`}><Trash2 size={14} aria-hidden="true" /> Delete</button></div></div></article>
}

export default HistoryCard
