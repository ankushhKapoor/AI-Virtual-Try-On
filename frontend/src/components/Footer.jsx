import { Pin } from 'lucide-react'
import { Link } from 'react-router-dom'

const groups = [
  { title: 'Explore', links: [['Home', '/'], ['Categories', '/products'], ['Try On', '/upload']] },
  { title: 'My Collection', links: [['Wishlist', '/wishlist'], ['Saved Looks', '/saved-looks'], ['Try-On History', '/history']] },
  { title: 'Company', links: [['About', '/'], ['How It Works', '/how-it-works'], ['Contact', '/']] },
]

function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_2fr] lg:px-10 lg:py-20">
        <div className="max-w-xs"><Link to="/" className="text-xl font-extrabold tracking-[0.18em]">VESTA<span className="text-[#9bc5b2]"> AI</span></Link><p className="mt-5 text-sm leading-6 text-white/60">AI-powered virtual fashion exploration for a more confident way to discover your next look.</p></div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{groups.map((group) => <div key={group.title}><h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{group.title}</h2><ul className="mt-5 space-y-3">{group.links.map(([label, to]) => <li key={label}><Link to={to} className="text-sm text-white/70 hover:text-white">{label}</Link></li>)}</ul></div>)}</div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© 2026 VESTA AI. All rights reserved.</span><span className="inline-flex items-center gap-1.5"><Pin size={13} aria-hidden="true" /> Designed for discovery</span></div></div>
    </footer>
  )
}

export default Footer
