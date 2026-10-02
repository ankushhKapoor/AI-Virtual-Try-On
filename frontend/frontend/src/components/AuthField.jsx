import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'

function AuthField({ label, type = 'text', value, onChange, error, placeholder, autoComplete, required = true }) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && visible ? 'text' : type

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`min-h-12 w-full rounded-md border bg-canvas px-4 text-sm text-ink placeholder:text-subtle focus:bg-surface focus:outline-none ${isPassword ? 'pr-12' : ''} ${error ? 'border-danger focus:border-danger' : 'border-line-strong focus:border-accent'}`}
        />
        {isPassword ? <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}><span className="sr-only">{visible ? 'Hide' : 'Show'} {label.toLowerCase()}</span>{visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button> : null}
      </div>
      {error ? <p id={errorId} className="mt-2 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  )
}

export default AuthField