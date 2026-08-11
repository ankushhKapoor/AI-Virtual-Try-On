const steps = [
  { number: '01', label: 'Upload Photo' },
  { number: '02', label: 'Review Look' },
  { number: '03', label: 'Generate' },
  { number: '04', label: 'Result' },
]

function TryOnProgress({ activeStep = 1 }) {
  return <nav aria-label="Try-On progress" className="flex w-full items-center"><ol className="flex w-full items-center">{steps.map((step, index) => <li key={step.number} className="flex min-w-0 flex-1 items-center"><div className={`flex min-w-0 items-center gap-2 ${activeStep >= index + 1 ? 'text-accent' : 'text-subtle'}`}><span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${activeStep === index + 1 ? 'border-accent bg-accent text-white' : activeStep > index + 1 ? 'border-accent-soft bg-accent-soft text-accent' : 'border-line-strong bg-surface'}`}>{step.number}</span><span className="hidden truncate text-xs font-bold uppercase tracking-[0.08em] sm:block">{step.label}</span></div>{index < steps.length - 1 ? <span className={`mx-2 h-px min-w-4 flex-1 ${activeStep > index + 1 ? 'bg-accent' : 'bg-line'}`} aria-hidden="true" /> : null}</li>)}</ol></nav>
}

export default TryOnProgress
