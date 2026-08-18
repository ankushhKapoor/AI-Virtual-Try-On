import { Trash2 } from 'lucide-react'
import Button from '../Button'
import ComparisonCard from '../ComparisonCard'

function LookCard({ look, selected, saved, onSelect, onView, onViewProduct, onSave, onTryAgain, onRemove, favorite, onFavorite }) {
  const product = look.product
  const price = typeof product.price === 'number' ? `₹${product.price.toLocaleString('en-IN')}` : product.price
  return <article className={`rounded-md border bg-surface p-3 transition-shadow ${favorite ? 'border-[#b8893f] ring-1 ring-[#b8893f]' : 'border-line'} ${selected ? 'shadow-[var(--shadow-soft)]' : ''}`}><ComparisonCard image={look.resultImage} name={product.name} price={price} alt={`Try-On result for ${product.name}`} selected={selected} onSelect={onSelect} /><div className="space-y-2 px-1 pt-3"><div className="flex items-center justify-between gap-2 text-xs text-muted"><span>{product.category}</span><span>★ {product.rating}</span></div><p className="text-xs text-muted">{product.color}{product.selectedSize ? ` · Size ${product.selectedSize}` : ''}</p>{saved ? <p className="text-xs font-semibold text-success">Saved look</p> : null}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={onView}>View Look</Button><Button size="sm" variant="ghost" onClick={onViewProduct}>View Product</Button><Button size="sm" variant="ghost" onClick={onSave}>{saved ? 'Saved' : 'Save Look'}</Button><Button size="sm" variant="ghost" onClick={onTryAgain}>Try Again</Button></div><div className="mt-2 flex items-center justify-between border-t border-line pt-2"><button type="button" onClick={onFavorite} aria-pressed={favorite} className={`text-xs font-bold ${favorite ? 'text-[#9a6b25]' : 'text-muted hover:text-ink'}`}>{favorite ? '★ Favorite' : 'Choose Favorite'}</button><button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted hover:text-danger" aria-label={`Remove ${product.name} look`}><Trash2 size={14} aria-hidden="true" /> Remove</button></div></article>
}

export default LookCard
