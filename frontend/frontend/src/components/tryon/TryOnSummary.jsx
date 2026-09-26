import { ArrowRight, Shirt } from 'lucide-react'
import Button from '../Button'
import PhotoPreview from './PhotoPreview'
import SelectedProduct from './SelectedProduct'

function TryOnSummary({ photo, product, onStart, onChangePhoto, onChangeClothing }) {
  return <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><section className="rounded-md border border-line bg-surface p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your Photo</p><p className="mt-1 text-sm text-muted">{photo?.fileName || 'No photo selected'}</p></div><Button size="sm" variant="ghost" onClick={onChangePhoto}>Change Photo</Button></div><PhotoPreview src={photo?.previewUrl} alt="Your selected try-on photo" className="mt-4 aspect-[4/5]" /></section><div className="hidden size-10 items-center justify-center rounded-full bg-accent-soft text-accent lg:flex" aria-hidden="true"><ArrowRight size={18} /></div><section><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Selected Clothing</p><Button size="sm" variant="ghost" icon={Shirt} onClick={onChangeClothing}>Change Clothing</Button></div>{product ? <SelectedProduct product={product} /> : <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface px-5 text-center"><Shirt size={24} className="text-accent" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-ink">Choose a clothing item first</p><Button size="sm" className="mt-4" onClick={onChangeClothing}>Browse Collection</Button></div>}</section><div className="lg:col-span-3"><Button size="lg" className="w-full" disabled={!photo?.previewUrl || !product} onClick={onStart}>Start Virtual Try-On</Button></div></div>
}

export default TryOnSummary
