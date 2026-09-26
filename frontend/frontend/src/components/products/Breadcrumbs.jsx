import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

function Breadcrumbs({ items = [] }) {
  return <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-muted"><Link to="/" className="inline-flex items-center gap-1.5 hover:text-accent"><Home size={13} aria-hidden="true" /> Home</Link>{items.map((item, index) => <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2"><ChevronRight size={13} className="text-subtle" aria-hidden="true" />{item.to ? <Link to={item.to} className="hover:text-accent">{item.label}</Link> : <span className="max-w-[14rem] truncate text-ink">{item.label}</span>}</span>)}</nav>
}

export default Breadcrumbs
