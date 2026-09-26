import { Bookmark, Heart, Menu, Search, Sparkles, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import Button from './Button'
import useWishlist from '../hooks/useWishlist'
import useSavedLooks from '../hooks/useSavedLooks'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Categories', to: '/products' },
  { label: 'How It Works', to: '/how-it-works' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { wishlistIds } = useWishlist()
  const { savedLooks } = useSavedLooks()
  const linkClass = ({ isActive }) => `text-sm font-semibold transition-colors ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`

  return (
    <header className="relative z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <Link to="/" className="shrink-0 text-xl font-extrabold tracking-[0.18em] text-ink" aria-label="Vesta AI home">VESTA<span className="text-accent"> AI</span></Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {links.map((link) => <NavLink key={link.label} to={link.to} className={linkClass}>{link.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/products" className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink" aria-label="Search products"><Search size={19} aria-hidden="true" /></Link>
          <Link to="/wishlist" className="relative hidden size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink sm:inline-flex" aria-label={`Wishlist${wishlistIds.length ? `, ${wishlistIds.length} items` : ''}`}><Heart size={19} aria-hidden="true" />{wishlistIds.length ? <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-white">{wishlistIds.length}</span> : null}</Link>
          <Link to="/history" className="hidden size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink sm:inline-flex" aria-label="Profile and history"><UserRound size={19} aria-hidden="true" /></Link>
          <Link to="/saved-looks" className="relative hidden size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink md:inline-flex" aria-label={`Saved Looks${savedLooks.length ? `, ${savedLooks.length} items` : ''}`}><Bookmark size={19} aria-hidden="true" />{savedLooks.length ? <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-white">{savedLooks.length}</span> : null}</Link>
          <Link to="/upload" className="hidden sm:block"><Button size="sm" icon={Sparkles}>Try On</Button></Link>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</button>
        </div>
      </div>
      {menuOpen ? <nav className="border-t border-line bg-canvas px-5 py-4 lg:hidden" aria-label="Mobile navigation"><div className="mx-auto flex max-w-7xl flex-col gap-1">{links.map((link) => <NavLink key={link.label} to={link.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `rounded-md px-3 py-3 text-sm font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink'}`}>{link.label}</NavLink>)}<Link to="/wishlist" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink">Wishlist {wishlistIds.length ? `(${wishlistIds.length})` : ''}</Link><Link to="/saved-looks" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink">Saved Looks {savedLooks.length ? `(${savedLooks.length})` : ''}</Link><Link to="/history" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink">Try-On History</Link><Link to="/upload" onClick={() => setMenuOpen(false)} className="mt-2"><Button className="w-full" icon={Sparkles}>Try On</Button></Link></div></nav> : null}
    </header>
  )
}

export default Navbar
