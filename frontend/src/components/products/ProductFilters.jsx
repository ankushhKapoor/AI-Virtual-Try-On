import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button'
import Modal from '../Modal'

function FilterFields({ filters, sizeOptions, onChange }) {
  const filterGroups = [
    { key: 'size', label: 'Size', options: sizeOptions.map((value) => ({ value, label: value })) },
    { key: 'price', label: 'Price', options: [{ value: 'under-1000', label: 'Under ₹1,000' }, { value: '1000-2000', label: '₹1,000–₹2,000' }, { value: '2000-3000', label: '₹2,000–₹3,000' }, { value: 'above-3000', label: 'Above ₹3,000' }] },
  ]
  return <div className="space-y-7">{filterGroups.map((group) => <fieldset key={group.key}><legend className="text-xs font-bold uppercase tracking-[0.14em] text-ink">{group.label}</legend><div className={group.key === 'size' ? 'mt-3 grid grid-cols-3 gap-2' : 'mt-3 space-y-2.5'}>{group.options.map((option) => group.key === 'size' ? <button key={option.value} type="button" onClick={() => onChange(group.key, option.value)} aria-pressed={filters[group.key].includes(option.value)} className={`rounded-md border px-2 py-2 text-sm font-semibold transition-colors ${filters[group.key].includes(option.value) ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface text-muted hover:border-accent hover:text-accent'}`}>{option.label}</button> : <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-muted"><input type="checkbox" checked={filters[group.key].includes(option.value)} onChange={() => onChange(group.key, option.value)} className="size-4 accent-accent" />{option.label}</label>)}</div></fieldset>)}</div>
}

function ProductFilters({ filters, sizeOptions, onChange, onClear, activeCount }) {
  const [open, setOpen] = useState(false)
  const fields = <FilterFields filters={filters} sizeOptions={sizeOptions} onChange={onChange} />
  return <>
    <aside className="hidden w-56 shrink-0 lg:block"><div className="flex items-center justify-between border-b border-line pb-4"><h2 className="text-sm font-semibold text-ink">Filter by</h2>{activeCount ? <button type="button" onClick={onClear} className="text-xs font-semibold text-accent hover:text-accent-dark">Clear all</button> : null}</div><div className="pt-6">{fields}</div></aside>
    <div className="flex items-center justify-between lg:hidden"><Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setOpen(true)}>Filters{activeCount ? ` (${activeCount})` : ''}</Button>{activeCount ? <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-accent" onKeyDown={(event) => event.key === 'Enter' && onClear()}>Clear all <X size={14} aria-hidden="true" /></button> : null}</div>
    <Modal open={open} onClose={() => setOpen(false)} title="Filter collection" actions={<Button onClick={() => setOpen(false)}>View results</Button>}><FilterFields filters={filters} sizeOptions={sizeOptions} onChange={onChange} /></Modal>
  </>
}

export default ProductFilters
