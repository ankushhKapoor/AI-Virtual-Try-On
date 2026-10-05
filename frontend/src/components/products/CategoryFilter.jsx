function CategoryFilter({ categories, value, onChange }) {
  return <nav aria-label="Product categories" className="flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category} type="button" onClick={() => onChange(category)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-colors ${value === category ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted hover:border-accent hover:text-accent'}`}>{category}</button>)}</nav>
}

export default CategoryFilter
