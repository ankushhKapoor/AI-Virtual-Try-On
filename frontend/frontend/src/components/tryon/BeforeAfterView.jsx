import ResultImagePlaceholder from './ResultImagePlaceholder'

function BeforeAfterView({ beforeImage, afterImage }) {
  return <section><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">A clear comparison</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Before / After</h2></div><div className="grid gap-5 md:grid-cols-2"><figure className="overflow-hidden rounded-md border border-line bg-surface"><div className="aspect-[4/5] bg-canvas">{beforeImage ? <img src={beforeImage} alt="Before: your uploaded photo" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-muted">Photo unavailable</div>}</div><figcaption className="border-t border-line px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Before</p><p className="mt-1 text-sm font-semibold text-ink">Your Photo</p></figcaption></figure><figure className="overflow-hidden rounded-md border border-line bg-surface"><ResultImagePlaceholder resultImage={afterImage} className="rounded-none border-0" /><figcaption className="border-t border-line px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">After</p><p className="mt-1 text-sm font-semibold text-ink">Try-On Result</p></figcaption></figure></div></section>
}

export default BeforeAfterView
