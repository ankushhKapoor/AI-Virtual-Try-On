import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button'
import Modal from '../Modal'

const priceOptions = [
  { value: 'under-300', label: 'Under ₹300' },
  { value: '300-500', label: '₹300–₹500' },
  { value: '500-1000', label: '₹500–₹1,000' },
  { value: '1000-1500', label: '₹1,000–₹1,500' },
  { value: '1500-2000', label: '₹1,500–₹2,000' },
]

function labelColor(color) {
  return color.replace(/\b\w/g, letter => letter.toUpperCase())
}

function FilterFields({ filters, onChange, availableOptions }) {
  const groups = [
    { key: 'price', label: 'Price', options: priceOptions },
    { key: 'color', label: 'Color', options: availableOptions.colors.map(value => ({ value, label: labelColor(value) })) },
    { key: 'size', label: 'Size', options: availableOptions.sizes.map(value => ({ value, label: value })) },
  ]

  return <div className="space-y-7">
    {groups.map(group => (
      <fieldset key={group.key}>
        <legend className="text-xs font-bold uppercase tracking-[0.14em] text-ink">{group.label}</legend>
        {group.options.length ? (
          <div className="mt-3 space-y-2.5">
            {group.options.map(option => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-muted">
                <input type="checkbox" checked={filters[group.key].includes(option.value)} onChange={() => onChange(group.key, option.value)} className="size-4 accent-accent" />
                {option.label}
              </label>
            ))}
          </div>
        ) : group.key !== 'price' ? <p className="mt-3 text-xs text-subtle">No {group.label.toLowerCase()} data in these results.</p> : null}
      </fieldset>
    ))}
  </div>
}

function ProductFilters({ filters, onChange, onClear, activeCount, availableOptions = { colors: [], sizes: [] } }) {
  const [open, setOpen] = useState(false)
  const fields = <FilterFields filters={filters} onChange={onChange} availableOptions={availableOptions} />

  return <>
    <aside className="hidden w-56 shrink-0 lg:block"><div className="flex items-center justify-between border-b border-line pb-4"><h2 className="text-sm font-semibold text-ink">Filter by</h2>{activeCount ? <button type="button" onClick={onClear} className="text-xs font-semibold text-accent hover:text-accent-dark">Clear all</button> : null}</div><div className="pt-6">{fields}</div></aside>
    <div className="flex items-center justify-between lg:hidden"><Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setOpen(true)}>Filters{activeCount ? ` (${activeCount})` : ''}</Button>{activeCount ? <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-accent" onKeyDown={event => event.key === 'Enter' && onClear()}>Clear all <X size={14} aria-hidden="true" /></button> : null}</div>
    <Modal open={open} onClose={() => setOpen(false)} title="Filter collection" actions={<Button onClick={() => setOpen(false)}>View results</Button>}>{fields}</Modal>
  </>
}

export default ProductFilters
