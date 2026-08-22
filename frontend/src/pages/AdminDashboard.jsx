import { CalendarDays, CircleCheck, CircleX, Sparkles, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import useAuth from '../hooks/useAuth'
import Button from '../components/Button'
import { ApiError } from '../services/api'
import { getAdminStatistics } from '../services/adminService'
import AdminUsersSection from '../components/admin/AdminUsersSection'

const statisticCards = [
  { key: 'total_users', label: 'Total Users', icon: Users },
  { key: 'total_try_ons', label: 'Total Try-Ons', icon: Sparkles },
  { key: 'successful_try_ons', label: 'Successful Try-Ons', icon: CircleCheck },
  { key: 'failed_try_ons', label: 'Failed Try-Ons', icon: CircleX },
  { key: 'try_ons_today', label: 'Try-Ons Today', icon: CalendarDays },
]

const numberFormat = new Intl.NumberFormat()

function AdminDashboard() {
  const { admin, accessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleLogout = () => {
    const path = logout()
    window.location.assign(path)
  }

  const loadStatistics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getAdminStatistics(accessToken)
      setStatistics(result)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        const path = logout()
        navigate(path, { replace: true })
        return
      }
      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Your admin account does not have access to these statistics.')
      } else {
        setError('Statistics are temporarily unavailable. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken, logout, navigate])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  return <main className="min-h-screen bg-canvas px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Admin Portal</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Platform overview</h1><p className="mt-2 text-sm text-muted">Signed in as {admin?.email}</p></div><Button variant="outline" onClick={handleLogout}>Log out</Button></div><section className="mt-10" aria-labelledby="statistics-heading"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">At a glance</p><h2 id="statistics-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">Platform statistics</h2></div>{error ? <Button variant="outline" size="sm" onClick={loadStatistics}>Retry</Button> : null}</div>{error ? <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{statisticCards.map(({ key, label, icon: Icon }) => <article key={key} className="rounded-md border border-line bg-surface p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p><span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon size={17} aria-hidden="true" /></span></div>{loading ? <div className="mt-6 h-9 w-20 animate-pulse rounded bg-accent-soft" aria-label={`Loading ${label}`} /> : <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-ink">{numberFormat.format(Number(statistics?.[key] ?? 0))}</p>}</article>)}</div></section><AdminUsersSection /><Link to="/" className="mt-10 inline-flex text-sm font-bold text-accent hover:text-accent-dark">Return to Vesta AI</Link></div></main>
}

export default AdminDashboard