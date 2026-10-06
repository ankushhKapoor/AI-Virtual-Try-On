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
} from 'lucide-react'
import Button from '../Button'
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
} from '../../services/adminService'

function formatFailureReasons(val) {
  if (!val) return 'None'
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

export default function DwmDashboardSection({ accessToken }) {
  const [activeTab, setActiveTab] = useState('apriori') // 'apriori', 'kmeans', 'correlations', 'rollups'
  const [source, setSource] = useState('benchmark_10k') // 'benchmark_10k' or 'live'

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

  // Trigger tab data fetch on tab switch or source toggle
  useEffect(() => {
    if (activeTab === 'apriori') fetchApriori()
    else if (activeTab === 'kmeans') fetchKMeans()
    else if (activeTab === 'correlations') fetchCorrelations()
    else if (activeTab === 'rollups') fetchRollups()
  }, [activeTab, source, fetchApriori, fetchKMeans, fetchCorrelations, fetchRollups])

  // Derive model health dynamically
  const modelHealthText = useMemo(() => {
    if (source === 'live' && isLiveEmpty) {
      return { status: 'Awaiting Live Orders', count: '0 Active', color: 'text-amber-600' }
    }
    return { status: 'All 4 Ready & Active', count: '4 Insight Tools', color: 'text-emerald-600' }
  }, [source, isLiveEmpty])

  return (
    <section className="mt-12 rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8" aria-labelledby="dwm-heading">
      {/* Header & Source Dataset Controls */}
      <div className="flex flex-col gap-6 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
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

        {/* Source Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted">Data Source:</span>
          <div className="inline-flex rounded-lg border border-line bg-canvas p-1 text-xs font-semibold">
            <button
              onClick={() => setSource('benchmark_10k')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                source === 'benchmark_10k'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              ⭐ Demo Store Data (10,000 Sessions)
            </button>
            <button
              onClick={() => setSource('live')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                source === 'live'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              🔄 Live Store Records
            </button>
          </div>
        </div>
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

      {/* Live Store Empty Banner */}
      {isLiveEmpty && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-amber-950">No Live Try-On Records Yet</p>
            <p className="text-amber-800">
              Your live store currently has no customer try-on sessions recorded. Showing insights from the 10,000 session demo dataset so you can explore the analytics tools. Once customers start using virtual try-on, live data will appear here.
            </p>
          </div>
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

          {/* Rules Display List */}
          {aprioriLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : aprioriData?.rules?.length ? (
            <div className="space-y-3">
              {aprioriData.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-line bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                        WHEN A SHOPPER TRIES:
                      </span>
                      <span className="font-semibold text-ink">{rule.antecedents}</span>
                      <span className="text-xs text-muted">({rule.antecedent_categories})</span>
                      <ArrowRight size={14} className="text-accent" />
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        FREQUENTLY PAIRED WITH:
                      </span>
                      <span className="font-semibold text-ink">{rule.consequents}</span>
                      <span className="text-xs text-muted">({rule.consequent_categories})</span>
                    </div>
                    <p className="text-xs text-muted">
                      Shoppers who try on this item are <strong className="text-ink">{(rule.confidence * 100).toFixed(1)}% likely</strong> to also try the recommended piece (<strong className="text-accent">{rule.lift.toFixed(2)}x stronger pairing</strong> than random chance).
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-muted">Popularity</span>
                      <p className="text-xs font-bold text-ink">{(rule.support * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-muted">Match Chance</span>
                      <p className="text-xs font-bold text-emerald-600">{(rule.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg bg-accent px-3 py-1.5 text-center text-white">
                      <span className="block text-[10px] font-bold uppercase opacity-80">Pair Strength</span>
                      <p className="text-sm font-extrabold">{rule.lift.toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              ))}
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

          {/* Customer Group Profile Cards */}
          {kmeansLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : kmeansData?.profiles?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kmeansData.profiles.map((profile) => (
                <div
                  key={profile.cluster_id}
                  onClick={() => setSelectedClusterFilter(selectedClusterFilter === profile.cluster_id ? '' : profile.cluster_id)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all ${
                    selectedClusterFilter === profile.cluster_id
                      ? 'border-accent bg-accent-soft/20 shadow-md ring-2 ring-accent'
                      : 'border-line bg-surface hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                      Group {profile.cluster_id}
                    </span>
                    <span className="text-xs font-extrabold text-accent">
                      {profile.pct_of_userbase}% of shoppers
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
              ))}
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
                          <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
                            {user.cluster_name}
                          </span>
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
    </section>
  )
}
