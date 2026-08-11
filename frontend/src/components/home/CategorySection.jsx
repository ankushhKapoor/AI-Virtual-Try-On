import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import CategoryCard from '../CategoryCard'
import SectionHeading from '../SectionHeading'
import { mockCategories } from '../../data/mockProducts'

function CategorySection() {
  const navigate = useNavigate()
  return <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><SectionHeading eyebrow="Explore the edit" title="Find your everyday, elevated" description="Explore considered pieces and discover the categories that make your wardrobe feel like you." action={<Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark">View all <ArrowRight size={16} aria-hidden="true" /></Link>} /><div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-5">{mockCategories.map((category) => <CategoryCard key={category.name} {...category} onClick={() => navigate(`/products?category=${encodeURIComponent(category.name)}`)} className="[&>div:first-child]:aspect-[5/4]" />)}</div></section>
}

export default CategorySection
