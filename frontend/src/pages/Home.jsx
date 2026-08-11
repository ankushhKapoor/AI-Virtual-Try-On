import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Hero from '../components/home/Hero'
import QuickSearch from '../components/home/QuickSearch'
import CategorySection from '../components/home/CategorySection'
import TrendingProducts from '../components/home/TrendingProducts'
import HowItWorks from '../components/home/HowItWorks'
import FeaturedLooks from '../components/home/FeaturedLooks'
import FinalCTA from '../components/home/FinalCTA'

function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main>
        <Hero />
        <QuickSearch />
        <CategorySection />
        <TrendingProducts />
        <HowItWorks />
        <FeaturedLooks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

export default Home
