const styles = {
  neutral: 'bg-canvas text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-[#e8f3ec] text-success',
  warning: 'bg-[#f7efdf] text-warning',
  danger: 'bg-danger-soft text-danger',
}

function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

export default Badge
