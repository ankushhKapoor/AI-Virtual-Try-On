import { ArrowDownUp } from 'lucide-react'

function ProductSort({ value, onChange }) {
  return <label className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-muted"><ArrowDownUp size={16} aria-hidden="true" /><span className="sr-only">Sort products</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 bg-transparent text-sm font-semibold text-ink outline-none"><option value="recommended">Recommended</option><option value="newest">Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="rating">Rating: High to Low</option></select></label>
}

export default ProductSort
