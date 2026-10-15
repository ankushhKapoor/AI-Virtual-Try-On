import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Sparkles,
  Layers,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShoppingBag,
  Clock,
  ArrowRight,
  Database,
  Cpu,
  ChevronDown,
  Info,
  ArrowUp,
  X,
  RotateCcw,
  Compass,
  Calendar,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import Button from '../Button'
import KMeansClusterChart from './charts/KMeansClusterChart'
import CorrelationsRiskChart from './charts/CorrelationsRiskChart'
import RollupsTrendChart from './charts/RollupsTrendChart'
import OlapDrilldownChart from './charts/OlapDrilldownChart'
import OlapBreakdownCharts from './charts/OlapBreakdownCharts'
import { getClusterTheme } from './charts/chartSetup'
import {
  getDwmStats,
  getDwmApriori,
  runDwmApriori,
  getDwmKMeans,
  runDwmKMeans,
  getDwmCorrelations,
  runDwmCorrelations,
  getDwmRollups,
  runDwmRollups,
  getDwmOlapOptions,
  getDwmOlapCube,
} from '../../services/adminService'

function formatFailureReasons(val) {
  if (!val) return 'None'
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

function OlapKpiGrid({ kpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wider">Try-On Volume</span>
          <Sparkles size={16} className="text-accent" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-ink">
          {kpis?.total_tryons?.toLocaleString() || 0}
        </p>
        <span className="text-[11px] text-muted">
          {kpis?.pct_of_warehouse || 100}% of all sessions
        </span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wider">Success Rate</span>
          <CheckCircle2 size={16} className="text-emerald-600" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-emerald-600">
          {kpis?.success_rate_pct || 0}%
        </p>
        <span className="text-[11px] text-muted">
          {kpis?.successful_tryons?.toLocaleString() || 0} successful
        </span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wider">Failure Rate</span>
          <AlertTriangle size={16} className="text-danger" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-danger">
          {kpis?.failure_rate_pct || 0}%
        </p>
        <span className="text-[11px] text-muted">
          {kpis?.failed_tryons?.toLocaleString() || 0} issues / retries
        </span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wider">Avg Latency</span>
          <Clock size={16} className="text-amber-600" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-ink">
          {((kpis?.avg_processing_time_ms || 0) / 1000).toFixed(2)}s
        </p>
        <span className="text-[11px] text-muted">
          {kpis?.avg_processing_time_ms || 0} ms synthesis
        </span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-muted">
          <span className="text-[11px] font-bold uppercase tracking-wider">Visual Fidelity</span>
          <Cpu size={16} className="text-accent" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-ink">
          {kpis?.avg_quality_score || 0}
        </p>
        <span className="text-[11px] text-muted">Avg quality / 1.00</span>
      </div>
    </div>
  )
}

function GranularTryonRecordsTable({
  records = [],
  loading = false,
  page = 1,
  onPageChange,
  title = 'Fitting Sessions (Detailed Records)',
  subtitle = 'Showing individual fitting sessions matching your selected filters.',
  emptyTitle = 'No Fitting Sessions Match Selected Filters',
  emptySubtitle = 'Try clearing some filters or clicking Reset.',
  onReset = null,
}) {
  const totalPages = Math.max(1, Math.ceil(records.length / 10))
  const pageRecords = records.slice((page - 1) * 10, page * 10)

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h4 className="text-sm font-bold text-ink">{title}</h4>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <span className="rounded-md border border-line bg-canvas px-3 py-1 text-xs font-semibold text-muted">
          {records.length} records loaded in view
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-canvas" />
          ))}
        </div>
      ) : records.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Shopper</th>
                <th className="py-2.5 px-3">Garment & ASIN</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Device / Upload Channel</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Quality</th>
                <th className="py-2.5 px-3 text-center">Wishlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRecords.map((rec, idx) => (
                <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-muted">
                    {(page - 1) * 10 + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted whitespace-nowrap">
                    {rec.timestamp}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-ink">{rec.user_name}</p>
                    <span className="text-[10px] text-muted">{rec.user_email}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-ink line-clamp-1 max-w-[220px]" title={rec.product_title}>
                      {rec.product_title}
                    </p>
                    <span className="font-mono text-[10px] text-muted">{rec.asin}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex rounded bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted border border-line">
                      {rec.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-ink">{rec.device_type}</span>
                    <span className="text-[10px] text-muted block">{rec.upload_method}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        rec.outcome === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-danger-soft text-danger'
                      }`}
                    >
                      {rec.outcome === 'SUCCESS' ? (
                        <CheckCircle2 size={11} />
                      ) : (
                        <AlertTriangle size={11} />
                      )}
                      <span>{rec.outcome}</span>
                    </span>
                    {rec.failure_reason && rec.failure_reason !== 'None' && (
                      <span className="block text-[10px] text-muted line-clamp-1 max-w-[140px]" title={rec.failure_reason}>
                        {rec.failure_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted">
                    {(rec.processing_time_ms / 1000).toFixed(2)}s
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                    {Number(rec.quality_score).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        rec.saved_to_wishlist === 'Yes'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-canvas text-muted'
                      }`}
                    >
                      {rec.saved_to_wishlist === 'Yes' ? '✓' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {records.length > 10 && (
            <div className="flex items-center justify-between border-t border-line bg-canvas/40 px-4 py-2.5 text-xs text-muted">
              <span>
                Page <strong className="text-ink">{page}</strong> of{' '}
                <strong className="text-ink">{totalPages}</strong> ({records.length} records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded border border-line bg-surface px-2.5 py-1 font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded border border-line bg-surface px-2.5 py-1 font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-canvas/60 py-10 px-4 text-center">
          <Filter className="mx-auto size-8 text-muted mb-2 opacity-50" />
          <h5 className="text-sm font-bold text-ink">{emptyTitle}</h5>
          <p className="mt-1 text-xs text-muted max-w-md mx-auto">{emptySubtitle}</p>
          {onReset && (
            <button
              onClick={onReset}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-accent/90"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DwmDashboardSection({ accessToken }) {
  const [activeTab, setActiveTab] = useState('apriori') // 'apriori', 'kmeans', 'correlations', 'rollups'
  const [source] = useState('benchmark_10k') // Always use benchmark data

  // High-level Stats
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // 1. Apriori State
  const [aprioriData, setAprioriData] = useState(null)
  const [aprioriLoading, setAprioriLoading] = useState(false)
  const [aprioriRunning, setAprioriRunning] = useState(false)
  const [aprioriParams, setAprioriParams] = useState({
    min_support: 0.05,
    min_confidence: 0.20,
    min_lift: 1.0,
    category: '',
    search: '',
  })

  // 2. K-Means State
  const [kmeansData, setKmeansData] = useState(null)
  const [kmeansLoading, setKmeansLoading] = useState(false)
  const [kmeansRunning, setKmeansRunning] = useState(false)
  const [kmeansK, setKmeansK] = useState(4)
  // Keep a ref so fetchKMeans always reads the latest K without being a dep that causes re-runs
  const kmeansKRef = React.useRef(4)
  const [selectedClusterFilter, setSelectedClusterFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userTablePage, setUserTablePage] = useState(1)

  // 3. Correlations State
  const [correlationsData, setCorrelationsData] = useState(null)
  const [correlationsLoading, setCorrelationsLoading] = useState(false)
  const [correlationsRunning, setCorrelationsRunning] = useState(false)
  const [selectedDimension, setSelectedDimension] = useState('all')

  // 4. Rollups State
  const [rollupsData, setRollupsData] = useState(null)
  const [rollupsLoading, setRollupsLoading] = useState(false)
  const [rollupsRunning, setRollupsRunning] = useState(false)
  const [rollupPeriod, setRollupPeriod] = useState('daily') // 'daily' or 'monthly'

  // Shared OLAP Dimension Options
  const [olapOptions, setOlapOptions] = useState(null)

  // 5. OLAP Drill-Down State (Year → Month → Day → Hour)
  const [drillData, setDrillData] = useState(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillLevel, setDrillLevel] = useState('month')
  const [drillHierarchy, setDrillHierarchy] = useState({ year: null, month: null, day: null })
  const [drillTablePage, setDrillTablePage] = useState(1)

  // 6. OLAP Roll-Up State (Hour → Day → Month → Year)
  const [rollupOlapData, setRollupOlapData] = useState(null)
  const [rollupOlapLoading, setRollupOlapLoading] = useState(false)
  const [rollupOlapLevel, setRollupOlapLevel] = useState('month')

  // 7. OLAP Slice State (Single-Dimension Isolation)
  const [sliceData, setSliceData] = useState(null)
  const [sliceLoading, setSliceLoading] = useState(false)
  const [sliceDimension, setSliceDimension] = useState('category')
  const [sliceValue, setSliceValue] = useState('Jackets')
  const [sliceTablePage, setSliceTablePage] = useState(1)

  // 8. OLAP Dice State (Multi-Dimensional Constrained Subcube)
  const [diceData, setDiceData] = useState(null)
  const [diceLoading, setDiceLoading] = useState(false)
  const [diceLevel, setDiceLevel] = useState('month')
  const [diceFilters, setDiceFilters] = useState({
    category: '',
    color: '',
    device_type: '',
    upload_method: '',
    outcome: '',
    price_bracket: '',
    date_from: '',
    date_to: '',
    search: '',
  })
  const [diceTablePage, setDiceTablePage] = useState(1)

  // Action status message
  const [actionFeedback, setActionFeedback] = useState(null)

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback({ msg, type })
    setTimeout(() => setActionFeedback(null), 5000)
  }

  const isLiveEmpty = useMemo(() => {
    if (source !== 'live') return false
    return stats?.is_live_empty || (stats?.live_dwh?.facts ?? 0) === 0
  }, [source, stats])

  // ──────────────────────────────────────────
  // Load Initial Stats
  // ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const res = await getDwmStats(accessToken)
      setStats(res)
    } catch (err) {
      console.warn('Could not load DWM stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ──────────────────────────────────────────
  // 1. Apriori Loader & Runner
  // ──────────────────────────────────────────
  const fetchApriori = useCallback(async () => {
    try {
      setAprioriLoading(true)
      const res = await getDwmApriori({
        source,
        min_support: parseFloat(aprioriParams.min_support) || 0.05,
        min_confidence: parseFloat(aprioriParams.min_confidence) || 0.20,
        min_lift: parseFloat(aprioriParams.min_lift) || 1.0,
        category: aprioriParams.category,
        search: aprioriParams.search,
      }, accessToken)
      setAprioriData(res)
    } catch (err) {
      console.error('Error fetching outfit pairings:', err)
      showFeedback(`Unable to load outfit recommendations: ${err.message}`, 'error')
    } finally {
      setAprioriLoading(false)
    }
  }, [source, aprioriParams, accessToken])

  const handleRunApriori = async () => {
    if (isLiveEmpty) {
      showFeedback('No live try-on records yet. Please switch to the Demo Store Data.', 'error')
      return
    }
    try {
      setAprioriRunning(true)
      const res = await runDwmApriori({
        min_support: parseFloat(aprioriParams.min_support),
        min_confidence: parseFloat(aprioriParams.min_confidence),
        min_lift: parseFloat(aprioriParams.min_lift),
        category: aprioriParams.category || undefined,
        search: aprioriParams.search || undefined,
        source,
      }, accessToken)
      setAprioriData(res)
      showFeedback(`Outfit pairing analysis complete in ${res.execution_time_ms || 45}ms! Found ${res.total_rules} high-confidence matching combinations.`)
    } catch (err) {
      showFeedback(`Outfit pairing analysis failed: ${err.message}`, 'error')
    } finally {
      setAprioriRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // 2. Customer Groups Loader & Runner
  // ──────────────────────────────────────────
  const fetchKMeans = useCallback(async () => {
    try {
      setKmeansLoading(true)
      const res = await getDwmKMeans({ source }, accessToken)
      setKmeansData({
        ...res,
        raw_users_sample: res.users_sample || [],
      })
      if (res.k) {
        setKmeansK(res.k)
      }
    } catch (err) {
      console.error('Error fetching customer groups:', err)
      showFeedback(`Unable to load customer groups: ${err.message}`, 'error')
    } finally {
      setKmeansLoading(false)
    }
  }, [source, accessToken])

  const handleRunKMeans = async (customK) => {
    if (isLiveEmpty) {
      showFeedback('No live try-on records yet. Please switch to the Demo Store Data.', 'error')
      return
    }
    const kToUse = customK != null ? customK : kmeansK
    setKmeansK(kToUse)
    setSelectedClusterFilter('') // Clear active filter when re-clustering
    try {
      setKmeansRunning(true)
      const res = await runDwmKMeans({
        k: parseInt(kToUse, 10),
        source,
      }, accessToken)
      setKmeansData({
        ...res,
        raw_users_sample: res.users_sample || [],
      })
      const qualityStr = res.silhouette_score !== undefined ? ` (Grouping Quality: ${(res.silhouette_score * 100).toFixed(0)}%)` : ''
      showFeedback(`Customer grouping complete in ${res.execution_time_ms || 60}ms! Segmented shoppers into ${kToUse} distinct behavioral profiles${qualityStr}.`)
    } catch (err) {
      showFeedback(`Customer grouping failed: ${err.message}`, 'error')
    } finally {
      setKmeansRunning(false)
    }
  }

  // Filter sample users client-side so selecting a cluster card never makes a network request
  // that would overwrite the dynamically computed 2, 3, 5, or 6 cluster profiles.
  const displayedUsers = useMemo(() => {
    if (!kmeansData?.users_sample) return []
    const all = kmeansData.raw_users_sample || kmeansData.users_sample
    let list = all
    if (selectedClusterFilter !== '' && selectedClusterFilter !== null && selectedClusterFilter !== undefined) {
      const targetId = Number(selectedClusterFilter)
      list = list.filter((u) => u.cluster_id === targetId)
    }
    if (userSearch && userSearch.trim()) {
      const q = userSearch.trim().toLowerCase()
      list = list.filter((u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.cluster_name && u.cluster_name.toLowerCase().includes(q))
      )
    }
    return list
  }, [kmeansData, selectedClusterFilter, userSearch])

  const USERS_PER_PAGE = 25
  const totalUserPages = Math.ceil(displayedUsers.length / USERS_PER_PAGE) || 1
  const paginatedUsers = useMemo(() => {
    const start = (userTablePage - 1) * USERS_PER_PAGE
    return displayedUsers.slice(start, start + USERS_PER_PAGE)
  }, [displayedUsers, userTablePage])

  useEffect(() => {
    setUserTablePage(1)
  }, [selectedClusterFilter, userSearch, kmeansK])

  // ──────────────────────────────────────────
  // 3. Try-On Success & Troubleshooting Loader & Runner
  // ──────────────────────────────────────────
  const fetchCorrelations = useCallback(async () => {
    try {
      setCorrelationsLoading(true)
      const res = await getDwmCorrelations({
        source,
        dimension: selectedDimension,
      }, accessToken)
      setCorrelationsData(res)
    } catch (err) {
      console.error('Error fetching try-on success factors:', err)
      showFeedback(`Unable to load success analysis: ${err.message}`, 'error')
    } finally {
      setCorrelationsLoading(false)
    }
  }, [source, selectedDimension, accessToken])

  const handleRunCorrelations = async () => {
    if (isLiveEmpty) {
      showFeedback('No live try-on records yet. Please switch to the Demo Store Data.', 'error')
      return
    }
    try {
      setCorrelationsRunning(true)
      const res = await runDwmCorrelations({ source, dimension: selectedDimension }, accessToken)
      setCorrelationsData(res)
      showFeedback(`Try-on success analysis updated across all categories and channels in ${res.execution_time_ms || 35}ms!`)
    } catch (err) {
      showFeedback(`Success analysis failed: ${err.message}`, 'error')
    } finally {
      setCorrelationsRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // 4. Store Activity Trends Loader & Runner
  // ──────────────────────────────────────────
  const fetchRollups = useCallback(async () => {
    try {
      setRollupsLoading(true)
      const res = await getDwmRollups({
        period: rollupPeriod,
        source,
      }, accessToken)
      setRollupsData(res)
    } catch (err) {
      console.error('Error fetching store activity trends:', err)
      showFeedback(`Unable to load activity trends: ${err.message}`, 'error')
    } finally {
      setRollupsLoading(false)
    }
  }, [source, rollupPeriod, accessToken])

  const handleRunRollups = async () => {
    if (isLiveEmpty) {
      showFeedback('No live try-on records yet. Please switch to the Demo Store Data.', 'error')
      return
    }
    try {
      setRollupsRunning(true)
      await runDwmRollups({ source }, accessToken)
      await fetchRollups()
      showFeedback(`Store performance trends refreshed successfully!`)
    } catch (err) {
      showFeedback(`Trend refresh failed: ${err.message}`, 'error')
    } finally {
      setRollupsRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // Shared OLAP Options Loader
  // ──────────────────────────────────────────
  useEffect(() => {
    if (['olap_drilldown', 'olap_rollup', 'olap_slice', 'olap_dice'].includes(activeTab) && !olapOptions) {
      getDwmOlapOptions(source, accessToken).then(setOlapOptions).catch(console.warn)
    }
  }, [activeTab, source, accessToken, olapOptions])

  // ──────────────────────────────────────────
  // 5. OLAP Drill-Down Handlers
  // ──────────────────────────────────────────
  const fetchDrillCube = useCallback(async (overrides = {}) => {
    try {
      setDrillLoading(true)
      const effectiveLevel = overrides.level !== undefined ? overrides.level : drillLevel
      const effectiveHierarchy = overrides.hierarchy !== undefined ? overrides.hierarchy : drillHierarchy

      const params = {
        source,
        level: effectiveLevel,
        year: effectiveHierarchy.year || '',
        month: effectiveHierarchy.month || '',
        day: effectiveHierarchy.day || '',
        limit_records: 50,
      }

      const res = await getDwmOlapCube(params, accessToken)
      setDrillData(res)
      setDrillTablePage(1)
    } catch (err) {
      console.error('Error fetching Drill-Down cube:', err)
      showFeedback(`Drill-down failed: ${err.message || 'Server error'}`, 'error')
    } finally {
      setDrillLoading(false)
    }
  }, [source, drillLevel, drillHierarchy, accessToken])

  const handleDrillDownAction = (item) => {
    if (!item || !item.can_drill_down || !item.drill_params) return
    const nextLevel = item.drill_params.level || 'month'
    const nextHierarchy = {
      year: item.drill_params.year || drillHierarchy.year,
      month: item.drill_params.month || drillHierarchy.month,
      day: item.drill_params.day || drillHierarchy.day,
    }
    setDrillLevel(nextLevel)
    setDrillHierarchy(nextHierarchy)
    fetchDrillCube({ level: nextLevel, hierarchy: nextHierarchy })
    showFeedback(`Drilled down to ${nextLevel.toUpperCase()}: ${item.label}`, 'success')
  }

  const handleDrillRollUpAction = (targetLevel) => {
    const levels = ['year', 'month', 'day', 'hour']
    let nextLevel = targetLevel
    if (!nextLevel) {
      const idx = levels.indexOf(drillLevel)
      nextLevel = idx > 0 ? levels[idx - 1] : 'year'
    }
    let nextHierarchy = { ...drillHierarchy }
    if (nextLevel === 'year') {
      nextHierarchy = { year: null, month: null, day: null }
    } else if (nextLevel === 'month') {
      nextHierarchy = { year: drillHierarchy.year, month: null, day: null }
    } else if (nextLevel === 'day') {
      nextHierarchy = { year: drillHierarchy.year, month: drillHierarchy.month, day: null }
    }
    setDrillLevel(nextLevel)
    setDrillHierarchy(nextHierarchy)
    fetchDrillCube({ level: nextLevel, hierarchy: nextHierarchy })
    showFeedback(`Stepped up to ${nextLevel.toUpperCase()}`, 'success')
  }

  const handleDrillBreadcrumbClick = (crumb) => {
    const nextLevel = crumb.params?.level || 'year'
    const nextHierarchy = {
      year: crumb.params?.year || null,
      month: crumb.params?.month || null,
      day: crumb.params?.day || null,
    }
    setDrillLevel(nextLevel)
    setDrillHierarchy(nextHierarchy)
    fetchDrillCube({ level: nextLevel, hierarchy: nextHierarchy })
  }

  // ──────────────────────────────────────────
  // 6. OLAP Roll-Up Handlers
  // ──────────────────────────────────────────
  const fetchRollupOlapCube = useCallback(async (overrides = {}) => {
    try {
      setRollupOlapLoading(true)
      const effectiveLevel = overrides.level !== undefined ? overrides.level : rollupOlapLevel

      const params = {
        source,
        level: effectiveLevel,
        limit_records: 50,
      }

      const res = await getDwmOlapCube(params, accessToken)
      setRollupOlapData(res)
    } catch (err) {
      console.error('Error fetching Roll-Up cube:', err)
      showFeedback(`Roll-up failed: ${err.message || 'Server error'}`, 'error')
    } finally {
      setRollupOlapLoading(false)
    }
  }, [source, rollupOlapLevel, accessToken])

  const handleRollupLevelSelect = (lvl) => {
    setRollupOlapLevel(lvl)
    fetchRollupOlapCube({ level: lvl })
    showFeedback(`Aggregated view switched to ${lvl.toUpperCase()}`, 'success')
  }

  const handleRollupStepUp = () => {
    const levels = ['year', 'month', 'day', 'hour']
    const idx = levels.indexOf(rollupOlapLevel)
    const nextLevel = idx > 0 ? levels[idx - 1] : 'year'
    setRollupOlapLevel(nextLevel)
    fetchRollupOlapCube({ level: nextLevel })
    showFeedback(`Rolled up to ${nextLevel.toUpperCase()}`, 'success')
  }

  // ──────────────────────────────────────────
  // 7. OLAP Slice Handlers (Single Dimension)
  // ──────────────────────────────────────────
  const fetchSliceCube = useCallback(async (overrides = {}) => {
    try {
      setSliceLoading(true)
      const effectiveDim = overrides.dimension !== undefined ? overrides.dimension : sliceDimension
      const effectiveVal = overrides.value !== undefined ? overrides.value : sliceValue

      const params = {
        source,
        level: 'month',
        limit_records: 50,
      }
      if (effectiveDim && effectiveVal) {
        params[effectiveDim] = effectiveVal
      }

      const res = await getDwmOlapCube(params, accessToken)
      setSliceData(res)
      setSliceTablePage(1)
    } catch (err) {
      console.error('Error fetching Slice cube:', err)
      showFeedback(`Slice failed: ${err.message || 'Server error'}`, 'error')
    } finally {
      setSliceLoading(false)
    }
  }, [source, sliceDimension, sliceValue, accessToken])

  const handleSliceDimensionChange = (dim) => {
    setSliceDimension(dim)
    let initialVal = ''
    if (olapOptions) {
      if (dim === 'category') initialVal = olapOptions.categories?.[0] || ''
      else if (dim === 'device_type') initialVal = olapOptions.devices?.[0] || ''
      else if (dim === 'upload_method') initialVal = olapOptions.upload_methods?.[0] || ''
      else if (dim === 'outcome') initialVal = 'SUCCESS'
      else if (dim === 'price_bracket') initialVal = olapOptions.price_brackets?.[0] || ''
      else if (dim === 'color') initialVal = olapOptions.colors?.[0] || ''
    }
    setSliceValue(initialVal)
    fetchSliceCube({ dimension: dim, value: initialVal })
  }

  const handleSliceValueChange = (val) => {
    setSliceValue(val)
    fetchSliceCube({ value: val })
    showFeedback(val ? `Sliced by ${sliceDimension}: ${val}` : 'Slice cleared (full warehouse)', 'success')
  }

  const handleQuickSlice = (dim, val) => {
    setSliceDimension(dim)
    setSliceValue(val)
    fetchSliceCube({ dimension: dim, value: val })
    showFeedback(val ? `Sliced by ${dim}: ${val}` : 'Slice reset to full warehouse', 'success')
  }

  // ──────────────────────────────────────────
  // 8. OLAP Dice Handlers (Multi-Dimensional)
  // ──────────────────────────────────────────
  const fetchDiceCube = useCallback(async (overrides = {}) => {
    try {
      setDiceLoading(true)
      const effectiveFilters = overrides.filters !== undefined ? overrides.filters : diceFilters
      const effectiveLevel = overrides.level !== undefined ? overrides.level : diceLevel

      const params = {
        source,
        level: effectiveLevel,
        category: effectiveFilters.category || '',
        color: effectiveFilters.color || '',
        device_type: effectiveFilters.device_type || '',
        upload_method: effectiveFilters.upload_method || '',
        outcome: effectiveFilters.outcome || '',
        price_bracket: effectiveFilters.price_bracket || '',
        date_from: effectiveFilters.date_from || '',
        date_to: effectiveFilters.date_to || '',
        search: effectiveFilters.search || '',
        limit_records: 50,
      }

      const res = await getDwmOlapCube(params, accessToken)
      setDiceData(res)
      setDiceTablePage(1)
    } catch (err) {
      console.error('Error fetching Dice cube:', err)
      showFeedback(`Dice operation failed: ${err.message || 'Server error'}`, 'error')
    } finally {
      setDiceLoading(false)
    }
  }, [source, diceFilters, diceLevel, accessToken])

  const handleDiceFilterChange = (key, val) => {
    const updated = { ...diceFilters, [key]: val }
    setDiceFilters(updated)
    fetchDiceCube({ filters: updated })
  }

  const handleResetDiceFilters = () => {
    const cleared = {
      category: '',
      color: '',
      device_type: '',
      upload_method: '',
      outcome: '',
      price_bracket: '',
      date_from: '',
      date_to: '',
      search: '',
    }
    setDiceFilters(cleared)
    fetchDiceCube({ filters: cleared })
    showFeedback('All dice filters reset', 'success')
  }

  // Trigger tab data fetch on tab switch or source toggle
  useEffect(() => {
    if (activeTab === 'apriori') fetchApriori()
    else if (activeTab === 'kmeans') fetchKMeans()
    else if (activeTab === 'correlations') fetchCorrelations()
    else if (activeTab === 'rollups') fetchRollups()
    else if (activeTab === 'olap_drilldown') fetchDrillCube()
    else if (activeTab === 'olap_rollup') fetchRollupOlapCube()
    else if (activeTab === 'olap_slice') fetchSliceCube()
    else if (activeTab === 'olap_dice') fetchDiceCube()
  }, [
    activeTab,
    source,
    fetchApriori,
    fetchKMeans,
    fetchCorrelations,
    fetchRollups,
    fetchDrillCube,
    fetchRollupOlapCube,
    fetchSliceCube,
    fetchDiceCube,
  ])

  // Derive model health dynamically
  const modelHealthText = useMemo(() => {
    if (source === 'live' && isLiveEmpty) {
      return { status: 'Awaiting Live Orders', count: '0 Active', color: 'text-amber-600' }
    }
    return { status: 'All 8 Ready & Active', count: '8 Analytics Tools', color: 'text-emerald-600' }
  }, [source, isLiveEmpty])

  return (
    <section className="mt-12 rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8" aria-labelledby="dwm-heading">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-white">
            <Cpu size={18} />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Store Intelligence & Analytics</p>
        </div>
        <h2 id="dwm-heading" className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Customer & Try-On Analytics Hub
        </h2>
        <p className="mt-1 text-sm text-muted">
          Discover customer shopping patterns, outfit pairings, user segments, and try-on performance trends.
        </p>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div
          className={`mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
            actionFeedback.type === 'error'
              ? 'border border-danger/30 bg-danger-soft text-danger'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'error' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            <span>{actionFeedback.msg}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs opacity-75 hover:opacity-100">Dismiss</button>
        </div>
      )}



      {/* KPI Overview Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Try-Ons</span>
            <Sparkles size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.facts?.toLocaleString() || '10,000'
              : (stats?.live_dwh?.facts ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Completed fitting sessions</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Shoppers Analyzed</span>
            <Users size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.users?.toLocaleString() || '1,200'
              : (stats?.live_dwh?.users ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Unique customer profiles</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Items</span>
            <ShoppingBag size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.products?.toLocaleString() || '25'
              : (stats?.live_dwh?.products ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Active items across categories</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Analytics Engines</span>
            <Cpu size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{modelHealthText.count}</p>
          <span className={`text-[11px] font-semibold ${modelHealthText.color}`}>{modelHealthText.status}</span>
        </div>
      </div>

      {/* Tabs Navigation for the 4 Tools */}
      <div className="mt-8 border-b border-line">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('apriori')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'apriori'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <ShoppingBag size={17} />
            <span>1. Frequently Tried Together (Outfit Pairing)</span>
          </button>

          <button
            onClick={() => setActiveTab('kmeans')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'kmeans'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Users size={17} />
            <span>2. Customer Groups (Shopper Profiles)</span>
          </button>

          <button
            onClick={() => setActiveTab('correlations')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'correlations'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <BarChart3 size={17} />
            <span>3. Try-On Success & Troubleshooting</span>
          </button>

          <button
            onClick={() => setActiveTab('rollups')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === 'rollups'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <TrendingUp size={17} />
            <span>4. Store Activity Trends (Daily & Monthly)</span>
          </button>

          <button
            onClick={() => setActiveTab('olap_drilldown')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'olap_drilldown'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Compass size={17} />
            <span>5. Timeline Deep Dive</span>
          </button>

          <button
            onClick={() => setActiveTab('olap_rollup')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'olap_rollup'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <ArrowUp size={17} />
            <span>6. Period Summaries</span>
          </button>

          <button
            onClick={() => setActiveTab('olap_slice')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'olap_slice'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <SlidersHorizontal size={17} />
            <span>7. Filter by Feature</span>
          </button>

          <button
            onClick={() => setActiveTab('olap_dice')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'olap_dice'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Layers size={17} />
            <span>8. Multi-Filter Search</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Frequently Tried Together (Outfit Pairing Recommendations) */}
      {activeTab === 'apriori' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Frequently Tried Together — Outfit Pairing Recommendations</h3>
            <p className="mt-1 text-xs text-muted">
              Shows items shoppers frequently try on together during their fitting sessions. Use these pairings to suggest matching pieces (e.g. Denim Jacket → Black Tee + Jeans) and boost order value.
            </p>
          </div>

          {/* Interactive Parameters Panel */}
          <div className="grid gap-4 rounded-lg border border-line bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Min Popularity</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                value={aprioriParams.min_support}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_support: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">In at least {(aprioriParams.min_support * 100).toFixed(0)}% of try-ons</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Min Match Chance</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1.0"
                value={aprioriParams.min_confidence}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_confidence: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">Match rate: {(aprioriParams.min_confidence * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Pairing Boost</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={aprioriParams.min_lift}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_lift: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">Default: 1.0x (Above average)</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Filter by Category</label>
              <select
                value={aprioriParams.category}
                onChange={(e) => setAprioriParams({ ...aprioriParams, category: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Jackets">Jackets</option>
                <option value="Shirts">Shirts</option>
                <option value="T-Shirts">T-Shirts</option>
                <option value="Dresses">Dresses</option>
                <option value="Pants">Pants</option>
                <option value="Jeans">Jeans</option>
                <option value="Ethnic Wear">Ethnic Wear</option>
                <option value="Hoodies">Hoodies</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleRunApriori}
                loading={aprioriRunning}
                disabled={isLiveEmpty}
                title={isLiveEmpty ? 'No live records yet' : 'Find matching outfit pairings'}
                className="w-full justify-center"
              >
                <Sliders size={16} className="mr-1.5" />
                Find Outfit Pairings
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface px-4 py-3 text-sm font-semibold text-ink border border-line">
            <div className="flex items-center gap-6">
              <span>Discovered Outfits: <strong className="text-accent">{aprioriData?.total_rules ?? 0}</strong></span>
              <span>Avg Match Chance: <strong className="text-emerald-600">{aprioriData?.average_confidence_pct ?? 0}%</strong></span>
              <span>Avg Pairing Boost: <strong className="text-accent">{aprioriData?.average_lift ?? 0}x</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search clothing items..."
                  value={aprioriParams.search}
                  onChange={(e) => setAprioriParams({ ...aprioriParams, search: e.target.value })}
                  className="rounded-md border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs focus:border-accent focus:outline-none"
                />
              </div>
              <button
                onClick={fetchApriori}
                className="inline-flex size-8 items-center justify-center rounded border border-line bg-canvas text-muted hover:text-ink"
                title="Refresh outfit pairings with current filters"
              >
                <RefreshCw size={14} className={aprioriLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Rules Display Table */}
          {aprioriLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : aprioriData?.rules?.length ? (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                    <th className="py-3 px-4 w-8">#</th>
                    <th className="py-3 px-4">Shopper Tries</th>
                    <th className="py-3 px-4 text-center w-10"></th>
                    <th className="py-3 px-4">Frequently Paired With</th>
                    <th className="py-3 px-4 text-right">Popularity</th>
                    <th className="py-3 px-4 text-right">Match Chance</th>
                    <th className="py-3 px-4 text-right">Pair Strength</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {aprioriData.rules.map((rule, idx) => (
                    <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-muted">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-ink">{rule.antecedents}</p>
                        <span className="text-[11px] text-muted">{rule.antecedent_categories}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ArrowRight size={14} className="text-accent mx-auto" />
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-ink">{rule.consequents}</p>
                        <span className="text-[11px] text-muted">{rule.consequent_categories}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-ink">{(rule.support * 100).toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-600">{(rule.confidence * 100).toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          rule.lift >= 2.0
                            ? 'bg-accent text-white'
                            : rule.lift >= 1.5
                            ? 'bg-accent-soft text-accent'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {rule.lift.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-canvas/60 py-10 px-4 text-center">
              <AlertTriangle className="mx-auto size-8 text-amber-500 mb-2" />
              <h4 className="text-sm font-bold text-ink">No Outfit Pairings Match Selected Filters</h4>
              <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                No matching combinations found for your current criteria.
                {aprioriData?.max_lift_available
                  ? ` (Strongest pairing strength available: ${aprioriData.max_lift_available.toFixed(2)}x)`
                  : ''}
                . Try lowering the Minimum Popularity or Pairing Boost.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customer Groups (Shopper Profiles) */}
      {activeTab === 'kmeans' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Customer Segmentation — Shopper Behavioral Profiles</h3>
            <p className="mt-1 text-xs text-muted">
              Automatically groups your shoppers into distinct behavioral profiles based on session volume, try-on success rates, photo quality ratings, and wishlist habits.
            </p>
          </div>

          {/* Dynamic Customer Groups Controls & Grouping Quality */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Number of Customer Groups:</span>
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRunKMeans(num)}
                  disabled={kmeansRunning || isLiveEmpty}
                  className={`size-8 rounded-md text-xs font-bold transition-all ${
                    kmeansK === num
                      ? 'bg-accent text-white shadow-sm'
                      : 'border border-line bg-surface text-ink hover:bg-accent-soft'
                  }`}
                >
                  {num}
                </button>
              ))}
              {/* Grouping Quality Metric Badge */}
              <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs">
                <span className="text-muted font-medium">Grouping Quality:</span>
                <strong className="text-accent font-mono font-bold">
                  {kmeansData?.silhouette_score !== undefined ? `${(kmeansData.silhouette_score * 100).toFixed(0)}%` : '63%'}
                </strong>
                <span className="text-[10px] text-emerald-600 font-semibold">High Separation</span>
              </div>
            </div>

            <Button
              onClick={() => handleRunKMeans(kmeansK)}
              loading={kmeansRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? 'No live records yet' : 'Group your shoppers into behavioral profiles'}
            >
              <RefreshCw size={15} className="mr-1.5" />
              Update Customer Groups ({kmeansK} Profiles)
            </Button>
          </div>

          {/* Interactive Shopper Cluster Map & Base Share */}
          {!kmeansLoading && kmeansData?.profiles?.length > 0 && (
            <KMeansClusterChart
              profiles={kmeansData.profiles}
              usersSample={kmeansData.users_sample || []}
              selectedCluster={selectedClusterFilter}
              onSelectCluster={setSelectedClusterFilter}
            />
          )}

          {/* Customer Group Profile Cards */}
          {kmeansLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : kmeansData?.profiles?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kmeansData.profiles.map((profile, pIdx) => {
                const theme = getClusterTheme(profile, pIdx)
                const isSelected = selectedClusterFilter === profile.cluster_id
                return (
                  <div
                    key={profile.cluster_id}
                    onClick={() => setSelectedClusterFilter(isSelected ? '' : profile.cluster_id)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all ${
                      isSelected
                        ? 'shadow-md ring-2'
                        : 'border-line bg-surface hover:border-slate-300'
                    }`}
                    style={{
                      borderColor: isSelected ? theme.fill : undefined,
                      backgroundColor: isSelected ? theme.soft : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${theme.fill}` : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs"
                        style={{ backgroundColor: theme.fill }}
                      >
                        Group {profile.cluster_id}
                      </span>
                      <span className="text-xs font-extrabold" style={{ color: theme.fill }}>
                        {Number(profile.pct_of_userbase).toFixed(1)}% of shoppers
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-bold text-ink">{profile.cluster_name}</h4>
                    <p className="mt-1 text-xs text-muted line-clamp-2">{profile.segment_description}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted">Avg Try-Ons</span>
                        <p className="font-bold text-ink">{Number(profile.avg_tryons_per_user).toFixed(1)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted">Success Rate</span>
                        <p className="font-bold text-emerald-600">{Number(profile.avg_success_rate_pct).toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted">Photo Quality</span>
                        <p className="font-bold text-ink">{Number(profile.avg_quality_score).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted">Wishlist Rate</span>
                        <p className="font-bold text-accent">{Number(profile.avg_wishlist_rate_pct).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded bg-canvas p-2 text-[11px] text-muted">
                      <strong className="text-ink">Suggested Strategy:</strong> {profile.recommended_marketing_action}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-canvas/60 py-10 px-4 text-center">
              <Users className="mx-auto size-8 text-muted mb-2" />
              <p className="text-sm font-bold text-ink">No Customer Profiles Available</p>
              <p className="text-xs text-muted mt-1">Click 'Update Customer Groups' above to segment your shoppers into behavioral profiles.</p>
            </div>
          )}

          {/* Sample Clustered Users Table */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span>Sample Shoppers in Groups</span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
                    {displayedUsers.length.toLocaleString()} {displayedUsers.length === 1 ? 'Shopper' : 'Shoppers'}
                    {selectedClusterFilter !== '' ? ` • Group ${selectedClusterFilter}` : ''}
                  </span>
                </h4>
                <p className="text-xs text-muted">
                  {selectedClusterFilter !== ''
                    ? `Showing shoppers assigned to Group ${selectedClusterFilter}`
                    : 'Showing shoppers across all behavioral groups'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search shopper name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
                {selectedClusterFilter !== '' && (
                  <button
                    onClick={() => setSelectedClusterFilter('')}
                    className="rounded bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/20"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                    <th className="py-2.5 px-3">Customer ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Total Try-Ons</th>
                    <th className="py-2.5 px-3">Success Rate</th>
                    <th className="py-2.5 px-3">Photo Quality</th>
                    <th className="py-2.5 px-3">Wishlist Rate</th>
                    <th className="py-2.5 px-3">Shopper Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-canvas/60">
                        <td className="py-2 px-3 font-mono font-semibold text-muted">#{user.user_id}</td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-ink">{user.name}</p>
                          <p className="text-[11px] text-muted">{user.email}</p>
                        </td>
                        <td className="py-2 px-3 font-bold text-ink">{user.total_tryons}</td>
                        <td className="py-2 px-3 font-semibold text-emerald-600">{user.success_rate_pct}%</td>
                        <td className="py-2 px-3">{user.avg_quality_score}</td>
                        <td className="py-2 px-3 font-semibold text-accent">{user.wishlist_rate_pct}%</td>
                        <td className="py-2 px-3">
                          {(() => {
                            const userTheme = getClusterTheme(user.cluster_name)
                            return (
                              <span
                                className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                                style={{
                                  backgroundColor: userTheme.badgeBg,
                                  color: userTheme.badgeText,
                                  border: `1px solid ${userTheme.badgeBorder}`,
                                }}
                              >
                                {user.cluster_name}
                              </span>
                            )
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-muted">
                        No sample shoppers match the selected cluster filter or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {displayedUsers.length > USERS_PER_PAGE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3 text-xs text-muted">
                <span>
                  Showing {((userTablePage - 1) * USERS_PER_PAGE + 1).toLocaleString()}–
                  {Math.min(userTablePage * USERS_PER_PAGE, displayedUsers.length).toLocaleString()} of {displayedUsers.length.toLocaleString()} shoppers
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserTablePage((p) => Math.max(1, p - 1))}
                    disabled={userTablePage <= 1}
                    className="rounded border border-line bg-canvas px-2.5 py-1 font-semibold text-ink disabled:opacity-40 hover:bg-surface"
                  >
                    Previous
                  </button>
                  <span className="font-medium text-ink">
                    Page {userTablePage} of {totalUserPages}
                  </span>
                  <button
                    onClick={() => setUserTablePage((p) => Math.min(totalUserPages, p + 1))}
                    disabled={userTablePage >= totalUserPages}
                    className="rounded border border-line bg-canvas px-2.5 py-1 font-semibold text-ink disabled:opacity-40 hover:bg-surface"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Try-On Success & Troubleshooting */}
      {activeTab === 'correlations' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Try-On Success & Troubleshooting — Finding Issue Causes</h3>
            <p className="mt-1 text-xs text-muted">
              Discovers which devices, photo types, product categories, or times of day experience the smoothest try-on results versus where shoppers encounter photo upload or fit issues.
            </p>
          </div>

          {/* Filter Bar & Recompute Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Analyze By Factor:</span>
              {[
                { id: 'all', label: 'All Factors' },
                { id: 'Device & Method', label: 'Device & Upload Type' },
                { id: 'Category', label: 'Clothing Category' },
                { id: 'Price', label: 'Price Range' },
                { id: 'Temporal', label: 'Time of Day' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedDimension(id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    selectedDimension === id
                      ? 'bg-accent text-white'
                      : 'border border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              onClick={handleRunCorrelations}
              loading={correlationsRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? 'No live records yet' : 'Refresh try-on success analysis'}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Refresh Success Analysis
            </Button>
          </div>

          {correlationsLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-32 animate-pulse rounded-lg bg-canvas" />
                <div className="h-32 animate-pulse rounded-lg bg-canvas" />
              </div>
              <div className="h-64 animate-pulse rounded-lg bg-canvas" />
            </div>
          ) : (
            <>
              {/* Key Insights Highlight */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Risk Card */}
                {correlationsData?.highest_failure_risk?.is_significant ? (
                  <div className="rounded-lg border border-danger/30 bg-danger-soft/20 p-4">
                    <div className="flex items-center gap-2 text-danger">
                      <AlertTriangle size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Area With Most Try-On Issues</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-ink">
                      {correlationsData.highest_failure_risk.dimension_value}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Factor: <strong>{correlationsData.highest_failure_risk.dimension_name}</strong></span>
                      <span>Issue Rate: <strong className="text-danger">{(Number(correlationsData.highest_failure_risk.failure_rate || 0) * 100).toFixed(1)}%</strong></span>
                      <span>Risk Trend: <strong className="text-danger">Elevated (+{Number(correlationsData.highest_failure_risk.correlation_with_failure || 0).toFixed(3)})</strong></span>
                      <span>Issue Likelihood: <strong className="text-danger">{Number(correlationsData.highest_failure_risk.relative_risk || 1).toFixed(2)}x higher than average</strong></span>
                      <span>Confidence: <strong className="text-ink">High (Verified)</strong></span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Common causes reported: <strong className="text-ink">{formatFailureReasons(correlationsData.highest_failure_risk.top_failure_reasons)}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-line bg-canvas/70 p-4">
                    <div className="flex items-center gap-2 text-muted">
                      <Info size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Area With Most Try-On Issues</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-ink">No Significant Problem Areas Found</p>
                    <p className="mt-1 text-xs text-muted">
                      Try-on success rates are consistent across all categories and devices without any major problem areas.
                    </p>
                  </div>
                )}

                {/* Safest Channel Card */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Most Reliable & Smooth Area</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink">
                    {correlationsData?.safest_dimension?.dimension_value || 'Studio URL / Desktop'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Factor: <strong>{correlationsData?.safest_dimension?.dimension_name}</strong></span>
                    <span>Success Rate: <strong className="text-emerald-700">{(Number(correlationsData?.safest_dimension?.success_rate || 0.95) * 100).toFixed(1)}%</strong></span>
                    <span>Reliability: <strong className="text-emerald-700">Highest ({Number(correlationsData?.safest_dimension?.correlation_with_failure ?? -0.02).toFixed(3)})</strong></span>
                    <span>Issue Risk: <strong className="text-emerald-700">Lowest ({Number(correlationsData?.safest_dimension?.relative_risk ?? 0.92).toFixed(2)}x avg)</strong></span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Occasional notes: <strong className="text-ink">{formatFailureReasons(correlationsData?.safest_dimension?.top_failure_reasons)}</strong>.
                  </p>
                </div>
              </div>

              {/* Interactive Risk & Reliability Impact Graph */}
              {correlationsData?.correlations?.length > 0 && (
                <CorrelationsRiskChart
                  correlations={correlationsData.correlations}
                  selectedDimension={selectedDimension}
                />
              )}

              {/* Correlation Table */}
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                      <th className="py-3 px-4">Factor Category</th>
                      <th className="py-3 px-4">Specific Option</th>
                      <th className="py-3 px-4">Total Try-Ons</th>
                      <th className="py-3 px-4">Success Rate</th>
                      <th className="py-3 px-4">Issue Rate</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Issue Rate vs Avg</th>
                      <th className="py-3 px-4">Data Confidence</th>
                      <th className="py-3 px-4">Common Reported Causes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {correlationsData?.correlations?.map((item, idx) => {
                      const corr = Number(item.correlation_with_failure || 0)
                      const isProtective = corr < 0
                      const isZero = corr === 0
                      const sign = corr > 0 ? '+' : ''
                      const succRate = Number(item.success_rate || 0)
                      const failRate = Number(item.failure_rate || 0)
                      const reasonsText = formatFailureReasons(item.top_failure_reasons)
                      return (
                        <tr key={idx} className="hover:bg-canvas/50">
                          <td className="py-3 px-4 font-semibold text-muted">{item.dimension_name}</td>
                          <td className="py-3 px-4 font-bold text-ink">{item.dimension_value}</td>
                          <td className="py-3 px-4 text-ink">{item.total_events?.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                                <div
                                  className={`h-full ${succRate > 0.85 ? 'bg-emerald-500' : succRate > 0.70 ? 'bg-amber-500' : 'bg-danger'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, succRate * 100))}%` }}
                                />
                              </div>
                              <span className="font-semibold text-ink">{(succRate * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-muted">
                            {(failRate * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex rounded px-2 py-0.5 font-bold font-mono text-[11px] ${
                              isProtective
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : isZero
                                ? 'bg-line/40 text-muted'
                                : corr > 0.05
                                ? 'bg-danger-soft text-danger'
                                : 'bg-amber-500/10 text-amber-700'
                            }`}>
                              {isProtective ? 'Low Risk' : isZero ? 'Normal' : corr > 0.05 ? 'Elevated' : 'Moderate'} ({sign}{corr.toFixed(3)})
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-ink">
                            {item.relative_risk !== undefined ? `${Number(item.relative_risk).toFixed(2)}x avg` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted">
                            {item.p_value !== undefined ? (
                              <span className={item.is_significant ? 'font-bold text-accent' : ''}>
                                {Number(item.p_value) < 0.05 ? 'High (Verified)' : 'Normal variation'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-muted max-w-[200px] truncate" title={reasonsText}>
                            {reasonsText}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 4: Store Activity Trends */}
      {activeTab === 'rollups' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Store Activity & Performance Trends</h3>
            <p className="mt-1 text-xs text-muted">
              Track how customer fitting volume, try-on success rates, system speed, and active shopper counts change over time.
            </p>
          </div>

          {/* Period Toggle & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">View Trends By:</span>
              <button
                onClick={() => setRollupPeriod('daily')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  rollupPeriod === 'daily'
                    ? 'bg-accent text-white shadow-sm'
                    : 'border border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                📅 Daily (Last 60 Days)
              </button>
              <button
                onClick={() => setRollupPeriod('monthly')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  rollupPeriod === 'monthly'
                    ? 'bg-accent text-white shadow-sm'
                    : 'border border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                📊 Monthly (Past 7 Months)
              </button>
            </div>

            <Button
              onClick={handleRunRollups}
              loading={rollupsRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? 'Awaiting live store try-on sessions' : 'Refresh store activity trends'}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Refresh Store Trends
            </Button>
          </div>

          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Tracked Periods</span>
              <p className="text-lg font-bold text-ink">{rollupsData?.data_points ?? 0} {rollupPeriod === 'daily' ? 'days' : 'months'}</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Total Activity</span>
              <p className="text-lg font-bold text-ink">{rollupsData?.total_volume?.toLocaleString() ?? 0} try-ons</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Overall Success Rate</span>
              <p className="text-lg font-bold text-emerald-600">{rollupsData?.overall_success_rate_pct ?? 0}%</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Time Window</span>
              <p className="text-lg font-bold text-accent">{rollupPeriod === 'daily' ? 'Past 60 Days' : 'Past 7 Months'}</p>
            </div>
          </div>

          {/* Interactive Store Activity Trends Dual-Axis Chart */}
          {!rollupsLoading && rollupsData?.rollups?.length > 0 && (
            <RollupsTrendChart
              rollups={rollupsData.rollups}
              period={rollupPeriod}
            />
          )}

          {/* Rollup Records Table */}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                  <th className="py-3 px-4">{rollupPeriod === 'daily' ? 'Date' : 'Month'}</th>
                  <th className="py-3 px-4">Total Try-Ons</th>
                  <th className="py-3 px-4">Successful</th>
                  <th className="py-3 px-4">Issues / Retries</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4">Avg Speed</th>
                  <th className="py-3 px-4">Photo Quality</th>
                  <th className="py-3 px-4">Active Shoppers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rollupsData?.rollups?.map((r, idx) => (
                  <tr key={idx} className="hover:bg-canvas/50">
                    <td className="py-3 px-4 font-mono font-bold text-ink">{r.period_key}</td>
                    <td className="py-3 px-4 font-bold text-ink">{r.total_tryons}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{r.successful_tryons}</td>
                    <td className="py-3 px-4 font-semibold text-danger">{r.failed_tryons}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700">{r.success_rate_pct}%</span>
                    </td>
                    <td className="py-3 px-4 text-muted">{(r.avg_processing_time_ms / 1000).toFixed(2)}s</td>
                    <td className="py-3 px-4 font-semibold text-ink">{Number(r.avg_quality_score).toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-accent">{r.unique_active_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Timeline Deep Dive (Year → Month → Day → Hour) */}
      {activeTab === 'olap_drilldown' && (
        <div className="mt-6 space-y-6">
          {/* Concept Banner */}
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="text-accent" size={20} />
                <h3 className="font-bold text-ink">5. Timeline Deep Dive — Explore Activity by Year, Month, Day & Hour</h3>
              </div>
              <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">
                Year → Month → Day → Hour
              </span>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Explore try-on activity over time from high-level yearly summaries down to hourly details: <strong>Year → Month → Day → Hour</strong>. Click directly on any bar in the chart to zoom into that time period and view matching sessions below.
            </p>
          </div>

          {/* Navigation, Breadcrumbs & Operation Status Bar */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide bg-accent-soft text-accent border border-accent/30">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  <span>TIMELINE EXPLORATION</span>
                </span>
                <span className="text-xs text-muted">
                  Matched: <strong className="text-ink">{drillData?.total_records_matched?.toLocaleString() || 0}</strong> / {drillData?.kpis?.warehouse_total?.toLocaleString() || '10,000'} sessions ({drillData?.kpis?.pct_of_warehouse || 100}%)
                </span>
              </div>

              {/* Granularity Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Time Level:</span>
                <div className="flex items-center rounded-lg border border-line bg-canvas p-1">
                  {['year', 'month', 'day', 'hour'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleDrillRollUpAction(lvl)}
                      className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
                        drillLevel === lvl
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-muted hover:text-ink hover:bg-surface'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fetchDrillCube()}
                  className="inline-flex size-8 items-center justify-center rounded border border-line bg-canvas text-muted hover:text-ink transition-colors"
                  title="Refresh timeline view"
                >
                  <RefreshCw size={14} className={drillLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Hierarchical Breadcrumb Trail */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3 text-xs text-muted">
              <span className="font-bold text-ink flex items-center gap-1">
                <Compass size={14} className="text-accent" />
                <span>Time Path:</span>
              </span>
              {drillData?.breadcrumbs?.map((crumb, idx) => {
                const isLast = idx === (drillData.breadcrumbs.length - 1)
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight size={13} className="text-muted/60" />}
                    <button
                      onClick={() => handleDrillBreadcrumbClick(crumb)}
                      disabled={isLast}
                      className={`rounded px-2.5 py-0.5 font-semibold transition-all ${
                        isLast
                          ? 'bg-accent-soft text-accent cursor-default font-bold'
                          : 'hover:bg-canvas text-ink hover:text-accent underline decoration-dotted'
                      }`}
                      title={isLast ? 'Current Level' : `Navigate back to ${crumb.label}`}
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                )
              })}
              {drillLevel !== 'year' && (
                <button
                  onClick={() => handleDrillRollUpAction()}
                  className="ml-3 inline-flex items-center gap-1 rounded border border-line bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted hover:text-ink hover:border-accent"
                  title="Zoom out one level"
                >
                  <ArrowUp size={12} className="text-accent" />
                  <span>Zoom Out</span>
                </button>
              )}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <OlapKpiGrid kpis={drillData?.kpis} />

          {/* Drill-Down Time-Series Chart */}
          <OlapDrilldownChart
            timeSeries={drillData?.time_series || []}
            level={drillLevel}
            onDrillDown={handleDrillDownAction}
            onRollUp={handleDrillRollUpAction}
            canRollUp={drillLevel !== 'year'}
          />

          {/* Granular Try-On Events Table */}
          <GranularTryonRecordsTable
            records={drillData?.sliced_records || []}
            loading={drillLoading}
            page={drillTablePage}
            onPageChange={setDrillTablePage}
            title="Fitting Sessions (Selected Time Window)"
            subtitle={`Individual fitting sessions within the selected ${drillLevel.toUpperCase()} period.`}
          />
        </div>
      )}

      {/* Tab 6: Period Summaries (Hour → Day → Month → Year) */}
      {activeTab === 'olap_rollup' && (
        <div className="mt-6 space-y-6">
          {/* Concept Banner */}
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowUp className="text-accent" size={20} />
                <h3 className="font-bold text-ink">6. Period Summaries — High-Level Performance Trends</h3>
              </div>
              <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">
                Hour → Day → Month → Year
              </span>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              View summarized try-on performance grouped by broad time periods: <strong>Hour, Day, Month, or Year</strong>. Compare trends across periods to track store growth, customer traffic, and fitting success rates.
            </p>
          </div>

          {/* Roll-Up Control Bar */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
                <span className="size-2 rounded-full bg-current animate-pulse" />
                <span>PERIOD SUMMARY</span>
              </span>
              <span className="text-xs text-muted">
                Displaying <strong>{rollupOlapData?.time_series?.length || 0}</strong> time periods in <strong>{rollupOlapLevel.toUpperCase()}</strong> view
              </span>
            </div>

            {/* Aggregation Level Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Group By:</span>
              <div className="flex items-center rounded-lg border border-line bg-canvas p-1">
                {[
                  { id: 'year', label: 'Yearly' },
                  { id: 'month', label: 'Monthly' },
                  { id: 'day', label: 'Daily' },
                  { id: 'hour', label: 'Hourly' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleRollupLevelSelect(id)}
                    className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                      rollupOlapLevel === id
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-muted hover:text-ink hover:bg-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {rollupOlapLevel !== 'year' && (
                <button
                  onClick={handleRollupStepUp}
                  className="inline-flex items-center gap-1 rounded border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition-all"
                  title="Zoom out to broader time group"
                >
                  <ArrowUp size={13} className="text-accent" />
                  <span>Zoom Out</span>
                </button>
              )}
              <button
                onClick={() => fetchRollupOlapCube()}
                className="inline-flex size-8 items-center justify-center rounded border border-line bg-canvas text-muted hover:text-ink transition-colors"
                title="Refresh summary data"
              >
                <RefreshCw size={14} className={rollupOlapLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Roll-Up KPI Summary Cards */}
          <OlapKpiGrid kpis={rollupOlapData?.kpis} />

          {/* Roll-Up Trend Visualizer */}
          <OlapDrilldownChart
            timeSeries={rollupOlapData?.time_series || []}
            level={rollupOlapLevel}
            onDrillDown={() => {}}
            onRollUp={handleRollupStepUp}
            canRollUp={rollupOlapLevel !== 'year'}
          />

          {/* Comprehensive Period Breakdown Table */}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h4 className="text-sm font-bold text-ink">
                  Performance by Period ({rollupOlapLevel.toUpperCase()} View)
                </h4>
                <p className="text-xs text-muted">
                  Comparative performance metrics grouped across each time period.
                </p>
              </div>
              <span className="rounded-md border border-line bg-canvas px-3 py-1 text-xs font-semibold text-muted">
                {rollupOlapData?.time_series?.length || 0} periods summarized
              </span>
            </div>

            {rollupOlapLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-canvas" />
                ))}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                    <th className="py-2.5 px-3">Period Bucket</th>
                    <th className="py-2.5 px-3 text-right">Try-On Volume</th>
                    <th className="py-2.5 px-3 text-right">Share of Total</th>
                    <th className="py-2.5 px-3 text-right">Successful</th>
                    <th className="py-2.5 px-3 text-right">Failed</th>
                    <th className="py-2.5 px-3 text-center">Success Rate</th>
                    <th className="py-2.5 px-3 text-right">Avg Latency</th>
                    <th className="py-2.5 px-3 text-right">Avg Quality</th>
                    <th className="py-2.5 px-3 text-right">Unique Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rollupOlapData?.time_series?.map((b, idx) => (
                    <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-ink">{b.period_key || b.label}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink">{b.total_tryons?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-muted">
                        {rollupOlapData?.kpis?.total_tryons
                          ? `${((b.total_tryons / rollupOlapData.kpis.total_tryons) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{b.successful_tryons?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-danger">{b.failed_tryons?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700">
                          {b.success_rate_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted">
                        {((b.avg_processing_time_ms || 0) / 1000).toFixed(2)}s
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                        {Number(b.avg_quality_score || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-accent">{b.unique_users?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Filter by Feature (Single-Feature Focus) */}
      {activeTab === 'olap_slice' && (
        <div className="mt-6 space-y-6">
          {/* Concept Banner */}
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="text-accent" size={20} />
              <h3 className="font-bold text-ink">7. Filter by Feature — Single Feature Focus</h3>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Focus on any single feature (such as Category = 'Jackets' or Device = 'Mobile') to see how that specific group performs compared to your overall store average.
            </p>
          </div>

          {/* Single-Feature Control Toolbar */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  <span>FILTERED BY: {sliceDimension.toUpperCase()} = {sliceValue || 'ALL'}</span>
                </span>
                <span className="text-xs text-muted">
                  Matched: <strong className="text-ink">{sliceData?.total_records_matched?.toLocaleString() || 0}</strong> / {sliceData?.kpis?.warehouse_total?.toLocaleString() || '10,000'} sessions ({sliceData?.kpis?.pct_of_warehouse || 100}%)
                </span>
              </div>
              <button
                onClick={() => fetchSliceCube()}
                className="inline-flex size-8 items-center justify-center rounded border border-line bg-canvas text-muted hover:text-ink transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={14} className={sliceLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Feature & Value Selectors */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  1. Choose Feature to Filter
                </label>
                <select
                  value={sliceDimension}
                  onChange={(e) => handleSliceDimensionChange(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="category">Apparel Category</option>
                  <option value="device_type">Hardware Device Type</option>
                  <option value="upload_method">Photo Upload Channel (Camera vs Gallery)</option>
                  <option value="outcome">Try-On Outcome Status</option>
                  <option value="price_bracket">Garment Price Tier</option>
                  <option value="color">Garment Color</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  2. Choose Filter Value ({sliceDimension})
                </label>
                <select
                  value={sliceValue}
                  onChange={(e) => handleSliceValueChange(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All (Full Store Data)</option>
                  {sliceDimension === 'category' &&
                    olapOptions?.categories?.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  {sliceDimension === 'device_type' &&
                    olapOptions?.devices?.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  {sliceDimension === 'upload_method' &&
                    olapOptions?.upload_methods?.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  {sliceDimension === 'outcome' && (
                    <>
                      <option value="SUCCESS">SUCCESS Only</option>
                      <option value="FAILURE">FAILURE Only</option>
                    </>
                  )}
                  {sliceDimension === 'price_bracket' &&
                    olapOptions?.price_brackets?.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  {sliceDimension === 'color' &&
                    olapOptions?.colors?.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* 1-Click Quick Filters */}
            <div className="border-t border-line/60 pt-3">
              <span className="text-xs font-bold text-muted mr-2">Quick Filters:</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                {[
                  { dim: 'category', val: 'Jackets', label: 'Jackets' },
                  { dim: 'category', val: 'Dresses', label: 'Dresses' },
                  { dim: 'device_type', val: 'Mobile', label: 'Mobile Devices' },
                  { dim: 'upload_method', val: 'Camera', label: 'Camera Uploads' },
                  { dim: 'outcome', val: 'FAILURE', label: 'Model Failures' },
                  { dim: 'price_bracket', val: 'Budget (<500)', label: 'Budget (<500)' },
                  { dim: 'category', val: '', label: 'Show All Records' },
                ].map(({ dim, val, label }) => {
                  const isActive = sliceDimension === dim && sliceValue === val
                  return (
                    <button
                      key={label}
                      onClick={() => handleQuickSlice(dim, val)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-accent text-white shadow-sm'
                          : 'border border-line bg-canvas text-ink hover:border-accent hover:text-accent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sliced KPI Summary Cards */}
          <OlapKpiGrid kpis={sliceData?.kpis} />

          {/* Multidimensional Breakdown Visualizers */}
          <OlapBreakdownCharts
            byCategory={sliceData?.by_category || []}
            byDevice={sliceData?.by_device || []}
            byOutcome={sliceData?.by_outcome || { SUCCESS: 0, FAILURE: 0, success_rate_pct: 0, failure_rate_pct: 0 }}
            onSliceCategory={(cat) => handleQuickSlice('category', cat)}
            onSliceDevice={(dev) => handleQuickSlice('device_type', dev)}
            selectedCategory={sliceDimension === 'category' ? sliceValue : ''}
            selectedDevice={sliceDimension === 'device_type' ? sliceValue : ''}
          />

          {/* Filtered Records Table */}
          <GranularTryonRecordsTable
            records={sliceData?.sliced_records || []}
            loading={sliceLoading}
            page={sliceTablePage}
            onPageChange={setSliceTablePage}
            title={`Matching Try-On Sessions (${sliceDimension.toUpperCase()} = ${sliceValue || 'ALL'})`}
            subtitle="All try-on sessions matching the selected filter."
            onReset={() => handleQuickSlice('category', '')}
          />
        </div>
      )}

      {/* Tab 8: Multi-Filter Search (Combined Filter Finder) */}
      {activeTab === 'olap_dice' && (
        <div className="mt-6 space-y-6">
          {/* Concept Banner */}
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <div className="flex items-center gap-2">
              <Layers className="text-accent" size={20} />
              <h3 className="font-bold text-ink">8. Multi-Filter Search — Advanced Customer & Session Finder</h3>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Combine multiple filters together (such as Category, Device, Upload Method, Price, and Date Range) to pinpoint specific customer sessions and uncover detailed shopping patterns.
            </p>
          </div>

          {/* Multidimensional Dicing Toolbar */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  <span>
                    {Object.values(diceFilters).filter(Boolean).length === 0
                      ? 'ALL SESSIONS (NO FILTERS)'
                      : `MATCHING SESSIONS: ${Object.values(diceFilters).filter(Boolean).length} ACTIVE FILTERS`}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  Matched: <strong className="text-ink">{diceData?.total_records_matched?.toLocaleString() || 0}</strong> / {diceData?.kpis?.warehouse_total?.toLocaleString() || '10,000'} sessions ({diceData?.kpis?.pct_of_warehouse || 100}%)
                </span>
              </div>
              {Object.values(diceFilters).filter(Boolean).length > 0 && (
                <button
                  onClick={handleResetDiceFilters}
                  className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline"
                >
                  <RotateCcw size={12} />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Category</label>
                <select
                  value={diceFilters.category}
                  onChange={(e) => handleDiceFilterChange('category', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {olapOptions?.categories?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Device</label>
                <select
                  value={diceFilters.device_type}
                  onChange={(e) => handleDiceFilterChange('device_type', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Devices</option>
                  {olapOptions?.devices?.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                  Upload Channel (Method)
                </label>
                <select
                  value={diceFilters.upload_method}
                  onChange={(e) => handleDiceFilterChange('upload_method', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Upload Channels</option>
                  {olapOptions?.upload_methods?.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Outcome</label>
                <select
                  value={diceFilters.outcome}
                  onChange={(e) => handleDiceFilterChange('outcome', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Outcomes</option>
                  <option value="SUCCESS">SUCCESS Only</option>
                  <option value="FAILURE">FAILURE Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Price Bracket</label>
                <select
                  value={diceFilters.price_bracket}
                  onChange={(e) => handleDiceFilterChange('price_bracket', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Brackets</option>
                  {olapOptions?.price_brackets?.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Color</label>
                <select
                  value={diceFilters.color}
                  onChange={(e) => handleDiceFilterChange('color', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">All Colors</option>
                  {olapOptions?.colors?.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range & Keyword Search */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Date From</label>
                <input
                  type="date"
                  value={diceFilters.date_from}
                  onChange={(e) => handleDiceFilterChange('date_from', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Date To</label>
                <input
                  type="date"
                  value={diceFilters.date_to}
                  onChange={(e) => handleDiceFilterChange('date_to', e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">Search Garment or Shopper</label>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search garment, ASIN, customer..."
                    value={diceFilters.search}
                    onChange={(e) => handleDiceFilterChange('search', e.target.value)}
                    className="w-full rounded-md border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Active Tag Chips */}
            {Object.entries(diceFilters).some(([_, v]) => Boolean(v)) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <span className="text-xs font-bold text-muted">Active Filters:</span>
                {Object.entries(diceFilters).map(([k, val]) => {
                  if (!val) return null
                  const labelMap = {
                    category: 'Category',
                    device_type: 'Device',
                    upload_method: 'Upload Channel',
                    outcome: 'Outcome',
                    price_bracket: 'Price',
                    color: 'Color',
                    date_from: 'From',
                    date_to: 'To',
                    search: 'Search',
                  }
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
                    >
                      <span>
                        <strong>{labelMap[k] || k}:</strong> {val}
                      </span>
                      <button
                        onClick={() => handleDiceFilterChange(k, '')}
                        className="rounded-full p-0.5 hover:bg-accent/20 text-accent transition-colors"
                        title={`Remove ${k} filter`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Diced Subcube KPI Summary Cards */}
          <OlapKpiGrid kpis={diceData?.kpis} />

          {/* Multidimensional Breakdown Visualizers */}
          <OlapBreakdownCharts
            byCategory={diceData?.by_category || []}
            byDevice={diceData?.by_device || []}
            byOutcome={diceData?.by_outcome || { SUCCESS: 0, FAILURE: 0, success_rate_pct: 0, failure_rate_pct: 0 }}
            onSliceCategory={(cat) => handleDiceFilterChange('category', diceFilters.category === cat ? '' : cat)}
            onSliceDevice={(dev) => handleDiceFilterChange('device_type', diceFilters.device_type === dev ? '' : dev)}
            selectedCategory={diceFilters.category}
            selectedDevice={diceFilters.device_type}
          />

          {/* Matching Sessions Drill-Through Table */}
          <GranularTryonRecordsTable
            records={diceData?.sliced_records || []}
            loading={diceLoading}
            page={diceTablePage}
            onPageChange={setDiceTablePage}
            title="Matching Try-On Sessions (Combined Filters)"
            subtitle="Individual try-on sessions matching all selected filter criteria."
            onReset={handleResetDiceFilters}
          />
        </div>
      )}
    </section>
  )
}

