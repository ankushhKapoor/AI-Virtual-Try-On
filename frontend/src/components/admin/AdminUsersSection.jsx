import { ArrowDown, ArrowUp, ArrowUpDown, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../Badge'
import Button from '../Button'
import EmptyState from '../EmptyState'
import SearchBar from '../SearchBar'
import { ApiError } from '../../services/api'
import { getAdminUsers } from '../../services/adminService'
import useAuth from '../../hooks/useAuth'
import AdminTryOnHistoryModal from './AdminTryOnHistoryModal'

const sortOptions = [
  { key: 'name', label: 'Name' },
  { key: 'try_on_count', label: 'Try-On Count' },
  { key: 'created_at', label: 'Joined Date' },
  { key: 'last_login_at', label: 'Last Login' },
]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function formatDate(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateFormat.format(date)
}

function compareValues(first, second, key) {
  if (key === 'name') return String(first.name).localeCompare(String(second.name))
  if (key === 'try_on_count') return Number(first.try_on_count) - Number(second.try_on_count)
  const firstDate = first[key] ? new Date(first[key]).getTime() : 0
  const secondDate = second[key] ? new Date(second[key]).getTime() : 0
  return firstDate - secondDate
}

function UserSkeleton() {
  return <tr className="border-b border-line last:border-0">{Array.from({ length: 7 }, (_, index) => <td key={index} className="px-4 py-5"><div className={`h-4 animate-pulse rounded bg-accent-soft ${index === 1 ? 'w-28' : 'w-20'}`} /></td>)}</tr>
}

function AdminUsersSection() {
  const { accessToken, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setUsers(await getAdminUsers(accessToken))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        const path = logout()
        navigate(path, { replace: true })
        return
      }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [accessToken, logout, navigate])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return users
      .filter((user) => !normalizedSearch || String(user.id).toLowerCase().includes(normalizedSearch) || user.name.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch))
      .sort((first, second) => compareValues(first, second, sortKey) * (sortDirection === 'asc' ? 1 : -1))
  }, [search, sortDirection, sortKey, users])

  const changeSort = (key) => {
    if (key === sortKey) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  return <><section className="mt-12" aria-labelledby="users-heading"><div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">People on Vesta</p><h2 id="users-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">Users</h2><p className="mt-2 text-sm text-muted">Review account activity and try-on participation.</p></div><div className="w-full lg:max-w-sm"><SearchBar label="Search users" placeholder="Search by name, email, or ID" value={search} onChange={setSearch} /></div></div>{error ? <div className="mt-6 flex flex-col gap-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-danger" role="alert">Unable to load users.</p><Button variant="outline" size="sm" onClick={loadUsers}>Retry</Button></div> : null}<div className="mt-6 overflow-hidden rounded-md border border-line bg-surface"><div className="overflow-x-auto"><table className="w-full min-w-[60rem] text-left"><caption className="sr-only">User management table</caption><thead className="border-b border-line bg-canvas"><tr>{[<span key="id">User ID</span>, ...sortOptions.map(({ key, label }) => <button key={key} type="button" onClick={() => changeSort(key)} className="inline-flex items-center gap-2 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted hover:text-ink">{label}{sortKey === key ? sortDirection === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" /> : <ArrowUpDown size={14} aria-hidden="true" />}</button>), <span key="status">Account Status</span>].map((heading, index) => <th key={index} scope="col" className="px-4 py-4">{heading}</th>)}</tr></thead><tbody>{loading ? Array.from({ length: 5 }, (_, index) => <UserSkeleton key={index} />) : visibleUsers.map((user) => <tr key={user.id} onClick={() => setSelectedUser(user)} onKeyDown={(event) => event.key === 'Enter' && setSelectedUser(user)} tabIndex="0" aria-label={`View try-on history for ${user.name}`} className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/60 focus-within:bg-canvas/60"><td className="px-4 py-4 text-sm font-semibold text-ink">#{user.id}</td><td className="px-4 py-4 text-sm font-semibold text-ink">{user.name}</td><td className="px-4 py-4 text-sm text-muted">{user.email}</td><td className="px-4 py-4 text-sm text-muted">{user.try_on_count}</td><td className="px-4 py-4"><Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Inactive'}</Badge></td><td className="px-4 py-4 text-sm text-muted">{formatDate(user.created_at)}</td><td className="px-4 py-4 text-sm text-muted">{formatDate(user.last_login_at)}</td></tr>)}{!loading && !error && !visibleUsers.length ? <tr><td colSpan="7"><EmptyState title={users.length ? 'No matching users' : 'No users found'} message={users.length ? 'Try a different name, email, or user ID.' : 'User accounts will appear here once they are created.'} icon={Users} className="rounded-none border-0" /></td></tr> : null}</tbody></table></div></div></section>{selectedUser ? <AdminTryOnHistoryModal user={selectedUser} accessToken={accessToken} onUnauthorized={() => { const path = logout(); navigate(path, { replace: true }) }} onClose={() => setSelectedUser(null)} /> : null}</>
}

export default AdminUsersSection