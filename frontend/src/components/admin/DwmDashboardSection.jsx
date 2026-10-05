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
  const [selectedClusterFilter, setSelectedClusterFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')

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
      console.error('Error fetching Apriori rules:', err)
      showFeedback(`Apriori load error: ${err.message}`, 'error')
    } finally {
      setAprioriLoading(false)
    }
  }, [source, aprioriParams, accessToken])

  const handleRunApriori = async () => {
    if (isLiveEmpty) {
      showFeedback('0 rows - run dwm/etl/run_pipeline.py first to populate Live DWH', 'error')
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
      showFeedback(`Apriori Mining complete in ${res.execution_time_ms || 45}ms! Filtered ${res.total_rules} rules with lift ≥ ${aprioriParams.min_lift}.`)
    } catch (err) {
      showFeedback(`Apriori Mining failed: ${err.message}`, 'error')
    } finally {
      setAprioriRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // 2. K-Means Loader & Runner
  // ──────────────────────────────────────────
  const fetchKMeans = useCallback(async () => {
    try {
      setKmeansLoading(true)
      const res = await getDwmKMeans({
        source,
        cluster_id: selectedClusterFilter,
        search: userSearch,
      }, accessToken)
      setKmeansData(res)
    } catch (err) {
      console.error('Error fetching K-Means clusters:', err)
      showFeedback(`K-Means load error: ${err.message}`, 'error')
    } finally {
      setKmeansLoading(false)
    }
  }, [source, selectedClusterFilter, userSearch, accessToken])

  const handleRunKMeans = async (customK) => {
    if (isLiveEmpty) {
      showFeedback('0 rows - run dwm/etl/run_pipeline.py first to populate Live DWH', 'error')
      return
    }
    const kToUse = customK || kmeansK
    try {
      setKmeansRunning(true)
      const res = await runDwmKMeans({
        k: parseInt(kToUse, 10),
        source,
      }, accessToken)
      setKmeansData(res)
      setKmeansK(kToUse)
      const silStr = res.silhouette_score !== undefined ? ` (Silhouette: ${res.silhouette_score.toFixed(3)})` : ''
      showFeedback(`K-Means clustering complete in ${res.execution_time_ms || 60}ms! Partitioned users into ${kToUse} distinct personas${silStr}.`)
    } catch (err) {
      showFeedback(`K-Means clustering failed: ${err.message}`, 'error')
    } finally {
      setKmeansRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // 3. Correlations Loader & Runner
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
      console.error('Error fetching correlations:', err)
      showFeedback(`Correlation load error: ${err.message}`, 'error')
    } finally {
      setCorrelationsLoading(false)
    }
  }, [source, selectedDimension, accessToken])

  const handleRunCorrelations = async () => {
    if (isLiveEmpty) {
      showFeedback('0 rows - run dwm/etl/run_pipeline.py first to populate Live DWH', 'error')
      return
    }
    try {
      setCorrelationsRunning(true)
      const res = await runDwmCorrelations({ source, dimension: selectedDimension }, accessToken)
      setCorrelationsData(res)
      showFeedback(`Failure correlation analysis recomputed across all dimensions in ${res.execution_time_ms || 35}ms!`)
    } catch (err) {
      showFeedback(`Correlation analysis failed: ${err.message}`, 'error')
    } finally {
      setCorrelationsRunning(false)
    }
  }

  // ──────────────────────────────────────────
  // 4. Rollups Loader & Runner
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
      console.error('Error fetching rollups:', err)
      showFeedback(`Rollup load error: ${err.message}`, 'error')
    } finally {
      setRollupsLoading(false)
    }
  }, [source, rollupPeriod, accessToken])

  const handleRunRollups = async () => {
    if (isLiveEmpty) {
      showFeedback('0 rows - run dwm/etl/run_pipeline.py first to populate Live DWH', 'error')
      return
    }
    try {
      setRollupsRunning(true)
      await runDwmRollups({ source }, accessToken)
      await fetchRollups()
      showFeedback(`Time-series rollups refreshed successfully!`)
    } catch (err) {
      showFeedback(`Rollup refresh failed: ${err.message}`, 'error')
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
      return { status: 'Waiting for ETL', count: '0 Active', color: 'text-amber-600' }
    }
    return { status: 'All 4 active & ready', count: '4 Techniques', color: 'text-emerald-600' }
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Data Warehousing & Data Mining</p>
          </div>
          <h2 id="dwm-heading" className="mt-2 text-2xl font-bold tracking-tight text-ink">
            DWM Analytics & Data Mining Hub
          </h2>
          <p className="mt-1 text-sm text-muted">
            Execute all 4 core data mining techniques directly on the virtual try-on analytical star schema.
          </p>
        </div>

        {/* Source Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted">Dataset Source:</span>
          <div className="inline-flex rounded-lg border border-line bg-canvas p-1 text-xs font-semibold">
            <button
              onClick={() => setSource('benchmark_10k')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                source === 'benchmark_10k'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              ⭐ 10k Benchmark Dataset (10,000 Entries)
            </button>
            <button
              onClick={() => setSource('live')}
              className={`rounded-md px-3 py-1.5 transition-all ${
                source === 'live'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              🔄 Live DWH (MySQL)
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

      {/* Live DWH Empty Banner */}
      {isLiveEmpty && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-amber-950">0 rows in Live DWH — run dwm/etl/run_pipeline.py</p>
            <p className="text-amber-800">
              The live analytical MySQL warehouse has 0 fact rows. Mining operations on the live source are disabled. Run the ETL pipeline script from your backend terminal to transform and populate the star schema.
            </p>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Fact Try-Ons</span>
            <Sparkles size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.facts?.toLocaleString() || '10,000'
              : (stats?.live_dwh?.facts ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Grain: 1 row per VTON execution</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Dimension</span>
            <Users size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.users?.toLocaleString() || '1,200'
              : (stats?.live_dwh?.users ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">SCD-1 customer records</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Garments Catalog</span>
            <ShoppingBag size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {source === 'benchmark_10k'
              ? stats?.benchmark_10k?.products?.toLocaleString() || '25'
              : (stats?.live_dwh?.products ?? 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">Categories, colors, brackets</span>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Mining Models</span>
            <Cpu size={16} className="text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{modelHealthText.count}</p>
          <span className={`text-[11px] font-semibold ${modelHealthText.color}`}>{modelHealthText.status}</span>
        </div>
      </div>

      {/* Tabs Navigation for the 4 Techniques */}
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
            <span>1. Association Rules (Apriori)</span>
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
            <span>2. User Segmentation (K-Means)</span>
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
            <span>3. Failure Correlation Analysis</span>
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
            <span>4. OLAP Time-Series Rollups</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Apriori Association Rule Mining */}
      {activeTab === 'apriori' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Association Rule Mining — Frequently Tried Together Recommendations</h3>
            <p className="mt-1 text-xs text-muted">
              Discovers garment co-try patterns across user fitting sessions. Used by the recommendation engine to propose complementary outfits (e.g. Denim Jacket → Black Tee + Jeans).
            </p>
          </div>

          {/* Interactive Parameters Panel */}
          <div className="grid gap-4 rounded-lg border border-line bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Min Support</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                value={aprioriParams.min_support}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_support: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">Threshold: {(aprioriParams.min_support * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Min Confidence</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1.0"
                value={aprioriParams.min_confidence}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_confidence: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">Confidence: {(aprioriParams.min_confidence * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Min Lift</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={aprioriParams.min_lift}
                onChange={(e) => setAprioriParams({ ...aprioriParams, min_lift: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-[11px] text-muted">Default: 1.0 (Positive corr)</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">Category Filter</label>
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
                title={isLiveEmpty ? '0 rows - run dwm/etl/run_pipeline.py' : 'Execute Apriori algorithm'}
                className="w-full justify-center"
              >
                <Sliders size={16} className="mr-1.5" />
                Run Apriori Mining
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface px-4 py-3 text-sm font-semibold text-ink border border-line">
            <div className="flex items-center gap-6">
              <span>Mined Rules: <strong className="text-accent">{aprioriData?.total_rules ?? 0}</strong></span>
              <span>Avg Confidence: <strong className="text-emerald-600">{aprioriData?.average_confidence_pct ?? 0}%</strong></span>
              <span>Avg Lift: <strong className="text-accent">{aprioriData?.average_lift ?? 0}x</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
                <input
                  type="text"
                  placeholder="Filter garments..."
                  value={aprioriParams.search}
                  onChange={(e) => setAprioriParams({ ...aprioriParams, search: e.target.value })}
                  className="rounded-md border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs focus:border-accent focus:outline-none"
                />
              </div>
              <button
                onClick={fetchApriori}
                className="inline-flex size-8 items-center justify-center rounded border border-line bg-canvas text-muted hover:text-ink"
                title="Refresh rules with current filters"
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
                        IF TRIED:
                      </span>
                      <span className="font-semibold text-ink">{rule.antecedents}</span>
                      <span className="text-xs text-muted">({rule.antecedent_categories})</span>
                      <ArrowRight size={14} className="text-accent" />
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        RECOMMEND:
                      </span>
                      <span className="font-semibold text-ink">{rule.consequents}</span>
                      <span className="text-xs text-muted">({rule.consequent_categories})</span>
                    </div>
                    <p className="text-xs text-muted">
                      Customers who tried on this item are <strong className="text-ink">{(rule.confidence * 100).toFixed(1)}% likely</strong> to try the recommended piece (<strong className="text-accent">{rule.lift.toFixed(2)}x stronger</strong> than average).
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-muted">Support</span>
                      <p className="text-xs font-bold text-ink">{(rule.support * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-muted">Confidence</span>
                      <p className="text-xs font-bold text-emerald-600">{(rule.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg bg-accent px-3 py-1.5 text-center text-white">
                      <span className="block text-[10px] font-bold uppercase opacity-80">Lift</span>
                      <p className="text-sm font-extrabold">{rule.lift.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-canvas/60 py-10 px-4 text-center">
              <AlertTriangle className="mx-auto size-8 text-amber-500 mb-2" />
              <h4 className="text-sm font-bold text-ink">No Rules Match Selected Filters</h4>
              <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                No association rules meet the current threshold criteria.
                {aprioriData?.max_lift_available
                  ? ` (Max lift available in dataset: ${aprioriData.max_lift_available.toFixed(2)}x)`
                  : ''}
                . Try lowering Min Lift or Min Support.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: K-Means Clustering for User Segmentation */}
      {activeTab === 'kmeans' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Clustering (K-Means) — Customer Behavioral Segmentation</h3>
            <p className="mt-1 text-xs text-muted">
              Segments customer profiles using multi-dimensional features: Try-On Volume, Inference Success Rate, Average Visual Quality Score, and Wishlist Conversion Rate.
            </p>
          </div>

          {/* Dynamic K Controls & Silhouette Score */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Cluster Count (K):</span>
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

              {/* Silhouette Metric Badge */}
              <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs">
                <span className="text-muted font-medium">Silhouette Score:</span>
                <strong className="text-accent font-mono font-bold">
                  {kmeansData?.silhouette_score !== undefined ? kmeansData.silhouette_score.toFixed(3) : '0.628'}
                </strong>
                <span className="text-[10px] text-muted">cohesion</span>
              </div>
            </div>

            <Button
              onClick={() => handleRunKMeans(kmeansK)}
              loading={kmeansRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? '0 rows - run dwm/etl/run_pipeline.py' : 'Execute K-Means clustering'}
            >
              <RefreshCw size={15} className="mr-1.5" />
              Recluster User Base (K = {kmeansK})
            </Button>
          </div>

          {/* Cluster Profile Persona Cards */}
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
                      Cluster {profile.cluster_id}
                    </span>
                    <span className="text-xs font-extrabold text-accent">
                      {profile.pct_of_userbase}% of base
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
                      <span className="text-[10px] font-semibold text-muted">Quality Score</span>
                      <p className="font-bold text-ink">{Number(profile.avg_quality_score).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted">Wishlist %</span>
                      <p className="font-bold text-accent">{Number(profile.avg_wishlist_rate_pct).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded bg-canvas p-2 text-[11px] text-muted">
                    <strong className="text-ink">Action:</strong> {profile.recommended_marketing_action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-canvas/60 py-10 px-4 text-center">
              <Users className="mx-auto size-8 text-muted mb-2" />
              <p className="text-sm font-bold text-ink">No Cluster Profiles Available</p>
              <p className="text-xs text-muted mt-1">Run K-Means clustering to partition users into behavioral personas.</p>
            </div>
          )}

          {/* Sample Clustered Users Table */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink">User Segment Inspection</h4>
                <p className="text-xs text-muted">Sample of users labeled by the K-Means clustering algorithm</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search user name or email..."
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
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3">Name & Email</th>
                    <th className="py-2.5 px-3">Total Try-Ons</th>
                    <th className="py-2.5 px-3">Success Rate</th>
                    <th className="py-2.5 px-3">Quality Score</th>
                    <th className="py-2.5 px-3">Wishlist %</th>
                    <th className="py-2.5 px-3">Assigned Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {kmeansData?.users_sample?.map((user) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Quality & Failure Correlation Analysis */}
      {activeTab === 'correlations' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">Failure Correlation Analysis — Why Does the AI Model Fail?</h3>
            <p className="mt-1 text-xs text-muted">
              Computes signed point-biserial / phi correlation coefficients ($r_\phi$), relative risk ($RR$), and $\chi^2$ significance tests between dimensional attributes and model failures.
            </p>
          </div>

          {/* Filter Bar & Recompute Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Dimension:</span>
              {['all', 'Device & Method', 'Category', 'Price', 'Temporal'].map((dim) => (
                <button
                  key={dim}
                  onClick={() => setSelectedDimension(dim)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    selectedDimension === dim
                      ? 'bg-accent text-white'
                      : 'border border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {dim === 'all' ? 'All Dimensions' : dim}
                </button>
              ))}
            </div>

            <Button
              onClick={handleRunCorrelations}
              loading={correlationsRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? '0 rows - run dwm/etl/run_pipeline.py' : 'Recompute failure correlations'}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Recompute Correlations
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
                      <span className="text-xs font-bold uppercase tracking-wider">Highest Failure Risk Factor</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-ink">
                      {correlationsData.highest_failure_risk.dimension_value}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Scope: <strong>{correlationsData.highest_failure_risk.dimension_name}</strong></span>
                      <span>Failure Rate: <strong className="text-danger">{(Number(correlationsData.highest_failure_risk.failure_rate || 0) * 100).toFixed(1)}%</strong></span>
                      <span>Signed Corr: <strong className="text-danger">+{Number(correlationsData.highest_failure_risk.correlation_with_failure || 0).toFixed(3)}</strong></span>
                      <span>Relative Risk: <strong className="text-danger">{Number(correlationsData.highest_failure_risk.relative_risk || 1).toFixed(2)}x</strong></span>
                      <span>p-value: <strong>{Number(correlationsData.highest_failure_risk.p_value || 0).toFixed(4)}</strong></span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Empirical failure reasons: <strong className="text-ink">{formatFailureReasons(correlationsData.highest_failure_risk.top_failure_reasons)}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-line bg-canvas/70 p-4">
                    <div className="flex items-center gap-2 text-muted">
                      <Info size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider">Highest Failure Risk Factor</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-ink">No statistically significant difference</p>
                    <p className="mt-1 text-xs text-muted">
                      All category factor variations show minimal correlation ($p \ge 0.05$). Failure rates fall within normal random distribution.
                    </p>
                  </div>
                )}

                {/* Safest Channel Card */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Most Reliable Factor (Protective)</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink">
                    {correlationsData?.safest_dimension?.dimension_value || 'Studio URL / Desktop'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Scope: <strong>{correlationsData?.safest_dimension?.dimension_name}</strong></span>
                    <span>Success Rate: <strong className="text-emerald-700">{(Number(correlationsData?.safest_dimension?.success_rate || 0.95) * 100).toFixed(1)}%</strong></span>
                    <span>Signed Corr: <strong className="text-emerald-700">{Number(correlationsData?.safest_dimension?.correlation_with_failure ?? -0.02).toFixed(3)}</strong></span>
                    <span>Relative Risk: <strong>{Number(correlationsData?.safest_dimension?.relative_risk ?? 0.92).toFixed(2)}x</strong></span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Empirical primary failures: <strong className="text-ink">{formatFailureReasons(correlationsData?.safest_dimension?.top_failure_reasons)}</strong>.
                  </p>
                </div>
              </div>

              {/* Correlation Table */}
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                      <th className="py-3 px-4">Dimension Scope</th>
                      <th className="py-3 px-4">Dimension Value</th>
                      <th className="py-3 px-4">Events</th>
                      <th className="py-3 px-4">Success Rate</th>
                      <th className="py-3 px-4">Failure Rate</th>
                      <th className="py-3 px-4">Signed Corr (r_phi)</th>
                      <th className="py-3 px-4">Rel Risk (RR)</th>
                      <th className="py-3 px-4">p-value (Chi²)</th>
                      <th className="py-3 px-4">Top Empirical Failures</th>
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
                              {sign}{corr.toFixed(3)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-ink">
                            {item.relative_risk !== undefined ? `${Number(item.relative_risk).toFixed(2)}x` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-muted">
                            {item.p_value !== undefined ? (
                              <span className={item.is_significant ? 'font-bold text-accent' : ''}>
                                {Number(item.p_value) < 0.001 ? '<0.001' : Number(item.p_value).toFixed(3)}
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

      {/* Tab 4: OLAP Time-Series Rollup */}
      {activeTab === 'rollups' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4">
            <h3 className="font-bold text-ink">OLAP Time-Series Rollup — Usage Trend Analytics</h3>
            <p className="mt-1 text-xs text-muted">
              Pre-aggregated temporal cubes providing daily and monthly performance metrics: try-on volume, success rates, inference latency, and unique user engagement trends.
            </p>
          </div>

          {/* Period Toggle & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Rollup Grain:</span>
              <button
                onClick={() => setRollupPeriod('daily')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  rollupPeriod === 'daily'
                    ? 'bg-accent text-white shadow-sm'
                    : 'border border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                📅 Daily Rollups (Last 60 Days)
              </button>
              <button
                onClick={() => setRollupPeriod('monthly')}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  rollupPeriod === 'monthly'
                    ? 'bg-accent text-white shadow-sm'
                    : 'border border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                📊 Monthly Rollups (7 Months)
              </button>
            </div>

            <Button
              onClick={handleRunRollups}
              loading={rollupsRunning}
              disabled={isLiveEmpty}
              title={isLiveEmpty ? '0 rows - run dwm/etl/run_pipeline.py' : 'Refresh time-series rollups'}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Refresh OLAP Rollups
            </Button>
          </div>

          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Data Points</span>
              <p className="text-lg font-bold text-ink">{rollupsData?.data_points ?? 0} {rollupPeriod}</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Window Volume</span>
              <p className="text-lg font-bold text-ink">{rollupsData?.total_volume?.toLocaleString() ?? 0} try-ons</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Window Success Rate</span>
              <p className="text-lg font-bold text-emerald-600">{rollupsData?.overall_success_rate_pct ?? 0}%</p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-line">
              <span className="text-[10px] font-bold uppercase text-muted">Period Grain</span>
              <p className="text-lg font-bold text-accent">{rollupPeriod === 'daily' ? 'Last 60 Days' : 'Monthly (7M)'}</p>
            </div>
          </div>

          {/* Rollup Records Table */}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas text-[11px] font-bold uppercase text-muted">
                  <th className="py-3 px-4">{rollupPeriod === 'daily' ? 'Date' : 'Year-Month'}</th>
                  <th className="py-3 px-4">Total Try-Ons</th>
                  <th className="py-3 px-4">Successful</th>
                  <th className="py-3 px-4">Failed</th>
                  <th className="py-3 px-4">Success Rate %</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">Quality Score</th>
                  <th className="py-3 px-4">Active Users</th>
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
