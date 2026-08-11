import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../Button'
import editorialPlaceholder from '../../assets/images/editorial-placeholder.svg'

function Hero() {
  return (
    <section className="overflow-hidden border-b border-line bg-canvas">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1fr_minmax(20rem,0.92fr)] lg:gap-14 lg:px-10 lg:py-16">
        <div className="max-w-xl"><p className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent"><Sparkles size={14} aria-hidden="true" /> Fashion, reimagined</p><h1 className="max-w-lg text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-ink sm:text-6xl lg:text-7xl">Try Before <span className="text-accent">You Buy</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg">Experience fashion differently. Upload your photo, choose a look, and visualize how it fits you with AI-powered virtual try-on.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/upload"><Button size="lg" icon={Sparkles}>Try It On</Button></Link><Link to="/products"><Button size="lg" variant="outline" icon={ArrowRight}>Explore Collection</Button></Link></div><div className="mt-8 flex items-center gap-6 border-t border-line pt-5 text-xs text-muted"><span><strong className="text-ink">01</strong> Personal</span><span><strong className="text-ink">02</strong> Visual</span><span><strong className="text-ink">03</strong> Confident</span></div></div>
        <div className="relative mx-auto w-full max-w-[28rem] lg:ml-auto"><div className="absolute -left-4 top-8 hidden h-32 w-32 border-l border-t border-accent/30 sm:block" aria-hidden="true" /><div className="relative overflow-hidden rounded-[2rem] bg-[#dcdeda]">
            <img src={editorialPlaceholder} alt="Editorial fashion placeholder for Vesta AI" className="aspect-[4/5] h-full w-full object-cover object-center transition-transform duration-700 hover:scale-[1.02]" />
            <div className="absolute bottom-5 left-5 bg-surface/90 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Your style, visualized</p>
              <p className="mt-1 text-sm font-semibold text-ink">See the possibility</p>
            </div>
          </div>
          <div className="absolute -bottom-3 -right-3 h-20 w-20 border-b border-r border-accent/30 sm:-right-5" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

export default Hero
