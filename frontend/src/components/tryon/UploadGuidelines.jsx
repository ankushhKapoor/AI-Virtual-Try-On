import { Check } from 'lucide-react'

const tips = ['Use a clear, well-lit photo', 'Make sure your full body or relevant body area is visible', 'Stand in a simple pose', 'Avoid heavily obstructed clothing', 'Use a good-quality image']

function UploadGuidelines() {
  return <aside className="rounded-md border border-line bg-surface p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">For best results</p><ul className="mt-4 space-y-3">{tips.map((tip) => <li key={tip} className="flex items-start gap-3 text-sm leading-5 text-muted"><span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{tip}</li>)}</ul></aside>
}

export default UploadGuidelines
