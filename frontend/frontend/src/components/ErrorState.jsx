import { AlertCircle } from 'lucide-react'
import Button from './Button'

function ErrorState({ title = 'Something went wrong', message = 'Please try again.', onRetry, className = '' }) {
  return (
    <div className={`flex min-h-64 flex-col items-center justify-center rounded-md border border-[#efd0d0] bg-danger-soft px-6 py-12 text-center ${className}`} role="alert">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-white text-danger"><AlertCircle size={22} aria-hidden="true" /></span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{message}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">Try again</Button> : null}
    </div>
  )
}

export default ErrorState
