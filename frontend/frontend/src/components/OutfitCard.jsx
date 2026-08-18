import { Check, Heart } from 'lucide-react'
import Button from './Button'

function OutfitCard({ outfit, onSave, onSelect, isSelected = false, className = '' }) {
  const { image, name, price, alt = name } = outfit
  const displayPrice = typeof price === 'number' ? `₹${price.toLocaleString('en-IN')}` : price

  return (
    <article className={`overflow-hidden rounded-md border bg-surface transition-colors ${isSelected ? 'border-accent ring-1 ring-accent' : 'border-line'} ${className}`}>
      <div className="relative aspect-[3/4] bg-canvas">{image ? <img src={image} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-accent-soft" role="img" aria-label={`${name} image placeholder`} />}</div>
      <div className="space-y-3 p-4">
        <div><h3 className="font-semibold text-ink">{name}</h3><p className="mt-1 text-sm text-muted">{displayPrice}</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" icon={Heart} onClick={onSave} className="flex-1">Save</Button><Button size="sm" variant={isSelected ? 'secondary' : 'primary'} icon={isSelected ? Check : undefined} onClick={onSelect} className="flex-1">{isSelected ? 'Selected' : 'Select'}</Button></div>
      </div>
    </article>
  )
}

export default OutfitCard
