import { Check, Circle, LoaderCircle } from 'lucide-react'

const steps = ['Preparing your photo', 'Preparing selected clothing', 'Creating your virtual look', 'Finalizing result']

function ProcessingSteps({ progress = 0 }) {
  const activeIndex = progress < 25 ? 0 : progress < 50 ? 1 : progress < 90 ? 2 : 3
  return <ol className="grid gap-3 sm:grid-cols-2">{steps.map((step, index) => { const complete = progress >= (index + 1) * 25 && index < 3; const active = index === activeIndex; return <li key={step} className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${complete ? 'border-[#cde4d5] bg-[#f3faf5] text-success' : active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}>{complete ? <Check size={17} aria-hidden="true" /> : active ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}<span className="font-semibold">{step}</span><span className="sr-only">{complete ? 'completed' : active ? 'in progress' : 'pending'}</span></li> })}</ol>
}

export default ProcessingSteps
