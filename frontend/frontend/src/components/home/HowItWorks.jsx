import { Camera, Check, Layers3, ScanFace } from 'lucide-react'
import SectionHeading from '../SectionHeading'

const steps = [
  { number: '01', title: 'Upload Your Photo', description: 'Add a clear photo of yourself.', icon: Camera },
  { number: '02', title: 'Choose Your Look', description: 'Browse clothing and select what you want to try.', icon: Layers3 },
  { number: '03', title: 'AI Creates Your Look', description: 'Our virtual try-on experience generates your personalized look.', icon: ScanFace },
  { number: '04', title: 'Explore & Compare', description: 'Save your favorites and compare different outfits.', icon: Check },
]

function HowItWorks() {
  return <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><SectionHeading eyebrow="A new way to shop" title="How virtual try-on works" description="A simple four-step ritual for making your next fashion choice feel more certain." /><div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{steps.map(({ number, title, description, icon: Icon }) => <article key={number} className="relative border-t border-line pt-5"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.15em] text-accent">{number}</span><Icon size={21} className="text-accent" aria-hidden="true" /></div><h3 className="mt-8 text-base font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{description}</p></article>)}</div></section>
}

export default HowItWorks
