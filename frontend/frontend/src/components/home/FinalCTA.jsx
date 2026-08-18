import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../Button'

function FinalCTA() {
  return <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><div className="flex flex-col items-start justify-between gap-8 bg-accent px-6 py-12 text-white sm:px-10 sm:py-16 lg:flex-row lg:items-end lg:px-16"><div className="max-w-2xl"><p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-white/60">Your next look is waiting</p><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Ready to see yourself in a new look?</h2><p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Upload your photo and start exploring fashion with virtual try-on.</p></div><Link to="/upload"><Button variant="secondary" size="lg" icon={Sparkles} className="shrink-0">Start Virtual Try-On</Button></Link></div></section>
}

export default FinalCTA
