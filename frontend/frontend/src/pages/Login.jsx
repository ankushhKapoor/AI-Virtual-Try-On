import { ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthField from '../components/AuthField'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'

function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { loginUser } = useAuth()

  const submit = async (event) => {
    event.preventDefault()
    if (!form.email) return setError('Please enter your email.')
    if (!form.password) return setError('Password is required.')
    setError('')
    setLoading(true)
    try {
      await loginUser(form)
      navigate(location.state?.from || '/')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return <AuthLayout eyebrow="Welcome back" title="Welcome back" description="Sign in to continue your fashion journey."><form onSubmit={submit} noValidate className="space-y-5">{location.state?.message ? <p className="rounded-md border border-success/30 bg-accent-soft px-3 py-2.5 text-xs font-semibold text-success" role="status">{location.state.message}</p> : null}<AuthField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" autoComplete="email" /><AuthField label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" autoComplete="current-password" />{error ? <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs font-semibold text-danger" role="alert">{error}</p> : null}<div className="flex items-center justify-end"><span className="text-sm font-semibold text-muted">Forgot Password?</span></div><Button type="submit" className="w-full" size="lg" icon={ArrowRight} loading={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button><p className="text-center text-sm text-muted">Don&apos;t have an account? <Link to="/register" className="font-bold text-accent hover:text-accent-dark">Create one</Link></p><p className="text-center text-xs text-subtle">Admin? <Link to="/admin/login" className="font-bold text-accent hover:text-accent-dark">Sign in here</Link></p></form></AuthLayout>
}

export default Login