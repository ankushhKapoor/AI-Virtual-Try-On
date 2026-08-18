import { Search, X } from 'lucide-react'
import { useState } from 'react'

function SearchBar({ placeholder = 'Search products', value, defaultValue = '', onChange, onSearch, className = '' }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const inputValue = value ?? internalValue

  function updateValue(nextValue) {
    if (value === undefined) setInternalValue(nextValue)
    onChange?.(nextValue)
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSearch?.(inputValue)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative flex w-full items-center ${className}`} role="search">
      <Search size={18} className="pointer-events-none absolute left-4 text-subtle" aria-hidden="true" />
      <label htmlFor="site-search" className="sr-only">Search products</label>
      <input
        id="site-search"
        type="search"
        value={inputValue}
        onChange={(event) => updateValue(event.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-md border border-line bg-surface pl-11 pr-11 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
      />
      {inputValue ? (
        <button type="button" onClick={() => updateValue('')} className="absolute right-3 rounded p-1 text-muted hover:text-ink" aria-label="Clear search">
          <X size={17} aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
}

export default SearchBar
