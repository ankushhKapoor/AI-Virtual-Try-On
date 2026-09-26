import { Sparkles } from 'lucide-react'
import SafeImage from '../SafeImage'

function ResultImagePlaceholder({ resultImage, className = '' }) {
  return <div className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-md border border-line bg-[#e9e8e2] ${className}`}>{resultImage ? <SafeImage src={resultImage} alt="Generated virtual try-on result" className="h-full w-full object-contain" fallbackClassName="h-full w-full" /> : <div className="px-6 text-center"><span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-surface text-accent shadow-sm"><Sparkles size={25} aria-hidden="true" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-accent">Try-On Result</p><p className="mt-2 text-sm leading-6 text-muted">Generated image will appear here once the AI integration is connected.</p></div>}</div>
}

export default ResultImagePlaceholder
