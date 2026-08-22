import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function AuthLayout({ eyebrow, title, description, children, admin = false }) {
  return (
    <main className="min-h-screen bg-canvas px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl overflow-hidden rounded-md border border-line bg-surface shadow-[0_24px_70px_rgb(31_36_33/8%)] sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,0.88fr)_minmax(22rem,1.12fr)]">
        <section className="flex flex-col px-6 py-8 sm:px-12 sm:py-12 lg:px-16 lg:py-14">
          <Link to="/" className="w-fit text-xl font-extrabold tracking-[0.18em] text-ink" aria-label="Vesta AI home">VESTA<span className="text-accent"> AI</span></Link>
          <div className="my-auto w-full max-w-md py-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="text-xs text-subtle">{admin ? 'Authorized platform access' : 'A more considered way to discover your next look.'}</p>
        </section>
        <aside className="relative hidden overflow-hidden bg-accent lg:block" aria-label="Vesta AI fashion statement">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_16%,rgb(155_197_178/25%),transparent_30%),linear-gradient(145deg,#245c4b_0%,#193f34_100%)]" />
          <div className="absolute -right-24 top-24 size-80 rounded-full border border-white/15" />
          <div className="absolute -right-8 top-40 size-64 rounded-full border border-white/10" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-white/65"><Sparkles size={15} aria-hidden="true" /> Vesta AI</div>
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b8d7c8]">Your style, visualized</p>
              <p className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">See what feels like you.</p>
              <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Explore pieces, imagine possibilities, and make room for a little more confidence in every look.</p>
            </div>
            <Link to="/how-it-works" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-white hover:text-[#b8d7c8]">How it works <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default AuthLayout