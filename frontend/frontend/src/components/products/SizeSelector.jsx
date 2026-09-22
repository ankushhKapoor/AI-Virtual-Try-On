function SizeSelector({ sizes = [], selectedSize, onChange }) {
  const allSizes = ['XS', 'S', 'M', 'L', 'XL']
  return <fieldset><legend className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Select size</legend><div className="mt-3 flex flex-wrap gap-2">{allSizes.map((size) => { const available = sizes.includes(size); return <button key={size} type="button" disabled={!available} onClick={() => onChange(size)} aria-pressed={selectedSize === size} className={`inline-flex size-11 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${selectedSize === size ? 'border-accent bg-accent text-white' : available ? 'border-line-strong bg-surface text-ink hover:border-accent hover:text-accent' : 'cursor-not-allowed border-line bg-canvas text-subtle line-through'}`}>{size}</button> })}</div></fieldset>
}

export default SizeSelector
