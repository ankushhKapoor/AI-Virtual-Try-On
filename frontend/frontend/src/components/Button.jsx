import { LoaderCircle } from 'lucide-react'
import { forwardRef } from 'react'

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  secondary: 'bg-accent-soft text-accent hover:bg-[#d8e8df]',
  outline: 'border border-line-strong bg-transparent text-ink hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:bg-canvas hover:text-ink',
  danger: 'bg-danger text-white hover:bg-[#963b3b]',
}

const sizes = {
  sm: 'min-h-9 gap-2 px-3 text-xs',
  md: 'min-h-11 gap-2 px-4 text-sm',
  lg: 'min-h-12 gap-2.5 px-5 text-sm',
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-semibold tracking-[0.01em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  )
})

export default Button
