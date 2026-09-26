import { ArrowUpRight, Heart } from 'lucide-react'
import Button from './Button'

function ResultCard({ result, onSave, onView, className = '' }) {
  const { image, name, price, alt = name } = result

  return (
    <article className={`overflow-hidden rounded-md border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-soft)] ${className}`}>
      <div className="aspect-[3/4] bg-canvas">{image ? <img src={image} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-accent-soft" role="img" aria-label={`${name} result placeholder`} />}</div>
      <div className="space-y-3 p-4"><div><h3 className="font-semibold text-ink">{name}</h3><p className="mt-1 text-sm text-muted">{price}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" icon={Heart} onClick={onSave} className="flex-1">Save</Button><Button size="sm" icon={ArrowUpRight} onClick={onView} className="flex-1">View</Button></div></div>
    </article>
  )
}

export default ResultCard
