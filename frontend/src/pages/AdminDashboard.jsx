import { CalendarDays, CircleCheck, CircleX, Sparkles, Users, Cpu, ShieldCheck, Database } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import useAuth from '../hooks/useAuth'
import Button from '../components/Button'
import { ApiError } from '../services/api'
import { getAdminStatistics } from '../services/adminService'
import AdminUsersSection from '../components/admin/AdminUsersSection'
import DwmDashboardSection from '../components/admin/DwmDashboardSection'

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
  const [activeMainTab, setActiveMainTab] = useState('dwm') // 'dwm' or 'platform'
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

  return (
    <main className="min-h-screen bg-canvas px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-md bg-accent text-white">
                <ShieldCheck size={14} />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Admin Portal</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">Admin Management Hub</h1>
            <p className="mt-1 text-sm text-muted">Signed in as <strong className="text-ink">{admin?.email}</strong></p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-all hover:bg-canvas"
            >
              Back to Storefront
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        {/* Main Admin Section Navigation Tabs */}
        <div className="mt-8 flex border-b border-line">
          <button
            onClick={() => setActiveMainTab('dwm')}
            className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
              activeMainTab === 'dwm'
                ? 'border-accent text-accent bg-accent-soft/20'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Cpu size={18} />
            <span>Store Insights & Analytics (4 Tools)</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-white">
              Smart Hub
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('platform')}
            className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
              activeMainTab === 'platform'
                ? 'border-accent text-accent bg-accent-soft/20'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Users size={18} />
            <span>Platform Overview & Users</span>
          </button>
        </div>

        {/* Tab 1: DWM Data Mining Dashboard */}
        {activeMainTab === 'dwm' && (
          <DwmDashboardSection accessToken={accessToken} />
        )}

        {/* Tab 2: General Platform Stats & Users Management */}
        {activeMainTab === 'platform' && (
          <>
            <section className="mt-8" aria-labelledby="statistics-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">At a glance</p>
                  <h2 id="statistics-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">
                    Platform Statistics
                  </h2>
                </div>
                {error ? <Button variant="outline" size="sm" onClick={loadStatistics}>Retry</Button> : null}
              </div>

              {error ? (
                <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {statisticCards.map(({ key, label, icon: Icon }) => (
                  <article key={key} className="rounded-md border border-line bg-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                    </div>
                    {loading ? (
                      <div className="mt-6 h-9 w-20 animate-pulse rounded bg-accent-soft" aria-label={`Loading ${label}`} />
                    ) : (
                      <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-ink">
                        {numberFormat.format(Number(statistics?.[key] ?? 0))}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <AdminUsersSection />
          </>
        )}
      </div>
    </main>
  )
}

export default AdminDashboard