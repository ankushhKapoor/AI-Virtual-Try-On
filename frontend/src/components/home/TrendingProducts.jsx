import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductGrid from '../ProductGrid'
import SectionHeading from '../SectionHeading'
import { mockProducts } from '../../data/mockProducts'

function TrendingProducts() {
  return <section className="border-y border-line bg-surface"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><SectionHeading eyebrow="The edit" title="Trending now" description="Pieces selected for their effortless ability to go everywhere with you." action={<Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark">View all <ArrowRight size={16} aria-hidden="true" /></Link>} /><div className="mt-10"><ProductGrid products={mockProducts} columns={4} /></div></div></section>
}

export default TrendingProducts
