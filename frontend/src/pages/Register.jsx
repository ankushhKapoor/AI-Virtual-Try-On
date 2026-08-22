import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthField from '../components/AuthField'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { registerUser } = useAuth()
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.'
    if (!form.email) nextErrors.email = 'Please enter your email.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Please enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    try {
      await registerUser(form)
      navigate('/login', { state: { message: 'Account created successfully. You can now sign in.' } })
    } catch (requestError) {
      const message = requestError.status === 409 ? 'This email is already registered. Please sign in instead.' : requestError.message
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  return <AuthLayout eyebrow="Start exploring" title="Create your account" description="Join us and discover fashion in a whole new way."><form onSubmit={submit} noValidate className="space-y-4">{errors.form ? <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs font-semibold text-danger" role="alert">{errors.form}</p> : null}<AuthField label="Full Name" value={form.name} onChange={update('name')} placeholder="Your name" autoComplete="name" error={errors.name} /><AuthField label="Email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" error={errors.email} /><AuthField label="Password" type="password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" autoComplete="new-password" error={errors.password} /><AuthField label="Confirm Password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Repeat your password" autoComplete="new-password" error={errors.confirmPassword} /><Button type="submit" className="mt-2 w-full" size="lg" icon={ArrowRight} loading={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button><p className="pt-1 text-center text-sm text-muted">Already have an account? <Link to="/login" className="font-bold text-accent hover:text-accent-dark">Sign in</Link></p></form></AuthLayout>
}

export default Register