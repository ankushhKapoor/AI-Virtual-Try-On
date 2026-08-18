import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import Button from '../components/Button'
import HowItWorksSection from '../components/home/HowItWorks'

function HowItWorks() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">How It Works</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
              Try on styles with confidence, step by step
            </h1>
            <p className="mt-6 text-base leading-8 text-muted">
              Learn how VESTA AI turns a simple photo into a personalized styling experience. Discover the process, get inspired, and start your virtual try-on journey.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/upload"><Button size="lg" icon={Sparkles}>Upload Your Photo</Button></Link>
              <Link to="/products"><Button size="lg" variant="outline">Browse Clothing</Button></Link>
            </div>
          </div>
        </section>
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  )
}

export default HowItWorks
