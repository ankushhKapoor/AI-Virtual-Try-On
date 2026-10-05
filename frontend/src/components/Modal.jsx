import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

function Modal({ open, onClose, title, children, actions, className = '' }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section ref={dialogRef} tabIndex={-1} className={`w-full max-w-lg rounded-lg bg-surface p-6 shadow-[var(--shadow-soft)] ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-ink" aria-label="Close dialog"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="mt-5 text-sm leading-6 text-muted">{children}</div>
        {actions ? <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div> : null}
      </section>
    </div>
  )
}

export default Modal
