import { ArrowRight } from 'lucide-react'
import Button from '../Button'
import ResultImagePlaceholder from './ResultImagePlaceholder'

function RecentLooks({ looks, onView, onCompare }) {
  if (!looks.length) return null
  return <section className="mt-20 border-t border-line pt-12"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Keep exploring</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Explore More Looks</h2></div><Button size="sm" variant="outline" icon={ArrowRight} onClick={onCompare}>Compare Looks</Button></div><div className="mt-8 grid gap-4 sm:grid-cols-3">{looks.slice(0, 3).map((look) => <button type="button" key={look.id} onClick={() => onView(look.id)} className="group overflow-hidden rounded-md border border-line bg-surface text-left hover:border-accent"><ResultImagePlaceholder resultImage={look.resultImage} className="aspect-[3/4] rounded-none border-0" /><div className="p-3"><p className="truncate text-sm font-semibold text-ink group-hover:text-accent">{look.product.name}</p><p className="mt-1 text-xs text-muted">{look.saved ? 'Saved' : 'Preview'}</p></div></button>)}</div></section>
}

export default RecentLooks
