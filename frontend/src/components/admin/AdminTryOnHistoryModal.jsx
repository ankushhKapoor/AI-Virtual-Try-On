import { History, useCallback, useEffect, useState } from 'react'
import Badge from '../Badge'
import Button from '../Button'
import EmptyState from '../EmptyState'
import LoadingSpinner from '../LoadingSpinner'
import Modal from '../Modal'
import { ApiError } from '../../services/api'
import { getUserTryOnHistory } from '../../services/adminService'

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateTimeFormat.format(date)
}

function statusPresentation(status) {
  const normalizedStatus = String(status || 'UNKNOWN').toUpperCase()
  const presentation = {
    PENDING: { label: 'Processing', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'danger' },
  }
  return presentation[normalizedStatus] || { label: String(status || 'Unknown'), variant: 'neutral' }
}

function AdminTryOnHistoryModal({ user, accessToken, onUnauthorized, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setHistory(await getUserTryOnHistory(user.id, accessToken))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onUnauthorized()
        return
      }
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('This user could not be found.')
      } else {
        setError('Unable to load try-on history.')
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken, onUnauthorized, user.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return <Modal open title="Try-On History" onClose={onClose} className="max-w-5xl"><div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-5 text-sm"><span><strong className="font-semibold text-ink">{user.name}</strong></span><span>{user.email}</span><span>User ID #{user.id}</span></div>{error ? <div className="mt-5 flex flex-col gap-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-danger" role="alert">{error}</p><Button variant="outline" size="sm" onClick={loadHistory}>Retry</Button></div> : null}{loading ? <div className="flex justify-center py-12"><LoadingSpinner label="Loading try-on history" /></div> : !error && !history.length ? <EmptyState title="No try-ons yet" message="This user has not created any try-on jobs." icon={History} className="mt-5 rounded-md" /> : !error ? <div className="mt-5 overflow-hidden rounded-md border border-line"><div className="overflow-x-auto"><table className="w-full min-w-[54rem] text-left"><caption className="sr-only">Try-on history for {user.name}</caption><thead className="border-b border-line bg-canvas"><tr>{['Job ID', 'Product ID', 'Status', 'Created At', 'Completed At', 'Processing Time'].map((heading) => <th key={heading} scope="col" className="px-4 py-4 text-xs font-bold uppercase tracking-[0.1em] text-muted">{heading}</th>)}</tr></thead><tbody>{history.map((job) => { const status = statusPresentation(job.status); return <tr key={job.id} className="border-b border-line last:border-0"><td className="px-4 py-4 text-sm font-semibold text-ink">#{job.id}</td><td className="px-4 py-4 text-sm text-muted">#{job.product_id}</td><td className="px-4 py-4"><Badge variant={status.variant}>{status.label}</Badge></td><td className="px-4 py-4 text-sm text-muted">{formatDate(job.created_at)}</td><td className="px-4 py-4 text-sm text-muted">{formatDate(job.completed_at)}</td><td className="px-4 py-4 text-sm text-muted">{job.processing_time == null ? 'N/A' : `${job.processing_time} sec`}</td></tr> })}</tbody></table></div></div> : null}</Modal>
}

export default AdminTryOnHistoryModal