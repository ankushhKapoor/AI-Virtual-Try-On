import { Inbox } from 'lucide-react'

function EmptyState({ title = 'Nothing here yet', message, action, icon: Icon = Inbox, className = '' }) {
  return (
    <div className={`flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface px-6 py-12 text-center ${className}`}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon size={22} aria-hidden="true" /></span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {message ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default EmptyState
