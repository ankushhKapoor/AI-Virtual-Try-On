import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

const toastStyles = {
  success: { icon: CheckCircle2, className: 'border-[#cde4d5] bg-[#f3faf5] text-success' },
  error: { icon: XCircle, className: 'border-[#efd0d0] bg-danger-soft text-danger' },
  info: { icon: Info, className: 'border-line bg-surface text-ink' },
}

function Toast({ message, type = 'info', onClose, className = '' }) {
  if (!message) return null
  const { icon: Icon, className: tone } = toastStyles[type]

  return (
    <div className={`flex max-w-sm items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-[var(--shadow-soft)] ${tone} ${className}`} role="status" aria-live="polite">
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      {onClose ? <button type="button" onClick={onClose} className="rounded p-1 opacity-70 hover:opacity-100" aria-label="Dismiss notification"><X size={16} aria-hidden="true" /></button> : null}
    </div>
  )
}

export default Toast
