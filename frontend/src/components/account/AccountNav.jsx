import { Bookmark, Clock3, Heart } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { label: 'Wishlist', to: '/wishlist', icon: Heart },
  { label: 'Saved Looks', to: '/saved-looks', icon: Bookmark },
  { label: 'Try-On History', to: '/history', icon: Clock3 },
]

function AccountNav({ wishlistCount = 0, savedCount = 0 }) {
  const counts = { Wishlist: wishlistCount, 'Saved Looks': savedCount }
  return <nav aria-label="My account collections" className="grid gap-2 sm:grid-cols-3 lg:block lg:w-56 lg:shrink-0">{links.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={({ isActive }) => `flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${isActive ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:border-accent hover:text-accent'}`}><span className="inline-flex items-center gap-3"><Icon size={17} aria-hidden="true" />{label}</span>{counts[label] ? <span className="text-xs font-bold">{counts[label]}</span> : null}</NavLink>)}</nav>
}

export default AccountNav
