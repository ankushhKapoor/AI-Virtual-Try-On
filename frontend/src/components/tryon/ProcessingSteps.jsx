import { Check, Circle, LoaderCircle } from 'lucide-react'

const steps = ['Preparing your photo', 'Preparing selected clothing', 'Creating your virtual look', 'Evaluating result quality', 'Finalizing result']

function ProcessingSteps({ progress = 0 }) {
  const activeIndex = progress < 20 ? 0 : progress < 40 ? 1 : progress < 60 ? 2 : progress < 80 ? 3 : 4
  return <ol className="grid gap-3 sm:grid-cols-2">{steps.map((step, index) => { const complete = progress >= (index + 1) * 20 && index < 4; const active = index === activeIndex; return <li key={step} className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${complete ? 'border-[#cde4d5] bg-[#f3faf5] text-success' : active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}>{complete ? <Check size={17} aria-hidden="true" /> : active ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}<span className="font-semibold">{step}</span><span className="sr-only">{complete ? 'completed' : active ? 'in progress' : 'pending'}</span></li>})}</ol>
}

export default ProcessingSteps
