import { LoaderCircle } from 'lucide-react'

function LoadingSpinner({ label = 'Loading', size = 24, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-muted ${className}`} role="status" aria-live="polite">
      <LoaderCircle size={size} className="animate-spin text-accent" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

export default LoadingSpinner
