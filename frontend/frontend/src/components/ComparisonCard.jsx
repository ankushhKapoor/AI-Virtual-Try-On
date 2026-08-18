import { Check } from 'lucide-react'

function ComparisonCard({ image, name, price, selected = false, onSelect, alt = name, className = '' }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`group overflow-hidden rounded-md border bg-surface text-left transition-colors ${selected ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-line-strong'} ${className}`}>
      <div className="relative aspect-[3/4] bg-canvas">{image ? <img src={image} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-accent-soft" role="img" aria-label={`${name} comparison placeholder`} />}{selected ? <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-accent text-white"><Check size={16} aria-hidden="true" /></span> : null}</div>
      <div className="p-4"><h3 className="font-semibold text-ink">{name}</h3><p className="mt-1 text-sm text-muted">{price}</p></div>
    </button>
  )
}

export default ComparisonCard
