import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import OutfitCard from '../OutfitCard'
import SectionHeading from '../SectionHeading'
import { mockLooks } from '../../data/mockProducts'

function FeaturedLooks() {
  return <section className="border-y border-line bg-[#f0eee8]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><SectionHeading eyebrow="Style inspiration" title="Find your next look" description="A little inspiration goes a long way. Explore visual stories built around pieces you can make your own." action={<Link to="/saved-looks" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark">Saved looks <ArrowRight size={16} aria-hidden="true" /></Link>} /><div className="mt-10 grid gap-5 sm:grid-cols-3">{mockLooks.map((look) => <OutfitCard key={look.id} outfit={look} onSave={() => {}} onSelect={() => {}} className="border-transparent" />)}</div></div></section>
}

export default FeaturedLooks
