import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthField from '../components/AuthField'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'

function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loginAdmin } = useAuth()
  const submit = async (event) => {
    event.preventDefault()
    if (!form.email) return setError('Please enter your admin email.')
    if (!form.password) return setError('Password is required.')
    setError('')
    setLoading(true)
    try {
      await loginAdmin(form)
      navigate('/admin/dashboard')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return <AuthLayout eyebrow="Authorized access" title="Admin Portal" description="Sign in to manage the platform." admin><form onSubmit={submit} noValidate className="space-y-5"><AuthField label="Admin Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@example.com" autoComplete="email" /><AuthField label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" autoComplete="current-password" />{error ? <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs font-semibold text-danger" role="alert">{error}</p> : null}<Button type="submit" className="w-full" size="lg" icon={ShieldCheck} loading={loading}>{loading ? 'Signing in...' : 'Admin Sign In'}</Button><p className="text-center text-sm text-muted"><Link to="/login" className="inline-flex items-center gap-2 font-bold text-accent hover:text-accent-dark"><ArrowRight size={15} className="rotate-180" aria-hidden="true" /> Back to User Login</Link></p></form></AuthLayout>
}

export default AdminLogin