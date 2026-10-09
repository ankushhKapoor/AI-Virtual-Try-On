import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, CHART_COLORS, defaultTooltipStyle } from './chartSetup'
import { TrendingUp, Activity, Zap, Users } from 'lucide-react'

export default function RollupsTrendChart({ rollups = [], period = 'daily' }) {
  const canvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const [metricMode, setMetricMode] = useState('success') // 'success', 'users', 'performance'

  // Ensure chronological order
  const sortedRollups = useMemo(() => {
    if (!rollups || !rollups.length) return []
    return [...rollups].sort((a, b) => (a.period_key > b.period_key ? 1 : -1))
  }, [rollups])

  useEffect(() => {
    if (!canvasRef.current || !sortedRollups.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    const labels = sortedRollups.map((r) => r.period_key)

    // Primary Volume Dataset (Common to Modes)
    const volumeData = sortedRollups.map((r) => r.total_tryons)
    const successCountData = sortedRollups.map((r) => r.successful_tryons)

    // Canvas Gradients for modern glow effect
    const volumeGrad = ctx.createLinearGradient(0, 0, 0, 300)
    volumeGrad.addColorStop(0, 'rgba(36, 92, 75, 0.35)')
    volumeGrad.addColorStop(1, 'rgba(36, 92, 75, 0.02)')

    let datasets = []
    let scalesConfig = {}

    if (metricMode === 'success') {
      const successRateData = sortedRollups.map((r) => Number(r.success_rate_pct || 0))

      datasets = [
        {
          label: 'Total Try-Ons (Volume)',
          data: volumeData,
          type: 'line',
          fill: true,
          backgroundColor: volumeGrad,
          borderColor: '#245c4b',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          tension: 0.35,
          yAxisID: 'yVolume',
        },
        {
          label: 'Success Rate (%)',
          data: successRateData,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#10b981',
          pointBorderWidth: 2,
          tension: 0.35,
          yAxisID: 'yRate',
        },
      ]

      scalesConfig = {
        yVolume: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Fitting Sessions Volume',
            font: { size: 11, weight: 'bold' },
            color: '#245c4b',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
          ticks: { font: { size: 10 } },
        },
        yRate: {
          type: 'linear',
          position: 'right',
          min: 60,
          max: 100,
          title: {
            display: true,
            text: 'Success Rate (%)',
            font: { size: 11, weight: 'bold' },
            color: '#10b981',
          },
          grid: { display: false },
          ticks: {
            callback: (v) => `${v}%`,
            font: { size: 10 },
            color: '#10b981',
          },
        },
      }
    } else if (metricMode === 'users') {
      const activeUsersData = sortedRollups.map((r) => r.unique_active_users)

      datasets = [
        {
          label: 'Total Try-On Sessions',
          data: volumeData,
          type: 'bar',
          backgroundColor: 'rgba(36, 92, 75, 0.75)',
          borderRadius: 4,
          yAxisID: 'yVolume',
        },
        {
          label: 'Unique Active Shoppers',
          data: activeUsersData,
          type: 'line',
          borderColor: '#6366f1',
          backgroundColor: '#6366f1',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.35,
          yAxisID: 'yUsers',
        },
      ]

      scalesConfig = {
        yVolume: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Session Volume',
            font: { size: 11, weight: 'bold' },
            color: '#245c4b',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
        },
        yUsers: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Active Shoppers Count',
            font: { size: 11, weight: 'bold' },
            color: '#6366f1',
          },
          grid: { display: false },
          ticks: { color: '#6366f1' },
        },
      }
    } else {
      // performance mode: Latency & Quality
      const speedSecData = sortedRollups.map((r) => Number(((r.avg_processing_time_ms || 0) / 1000).toFixed(2)))
      const qualityData = sortedRollups.map((r) => Number(r.avg_quality_score || 0))

      datasets = [
        {
          label: 'Avg Processing Speed (seconds)',
          data: speedSecData,
          type: 'line',
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          fill: true,
          borderWidth: 2,
          pointRadius: 2.5,
          tension: 0.35,
          yAxisID: 'ySpeed',
        },
        {
          label: 'Photo Quality Score (1–5)',
          data: qualityData,
          type: 'line',
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          pointRadius: 3,
          tension: 0.35,
          yAxisID: 'yQuality',
        },
      ]

      scalesConfig = {
        ySpeed: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Avg Render Time (seconds)',
            font: { size: 11, weight: 'bold' },
            color: '#06b6d4',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
        },
        yQuality: {
          type: 'linear',
          position: 'right',
          min: 1,
          max: 5,
          title: {
            display: true,
            text: 'Quality Score (out of 5.0)',
            font: { size: 11, weight: 'bold' },
            color: '#f59e0b',
          },
          grid: { display: false },
          ticks: { color: '#f59e0b' },
        },
      }
    }

    chartInstanceRef.current = new Chart(ctx, {
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              padding: 14,
              font: { family: 'Manrope, sans-serif', size: 11, weight: 'bold' },
              color: '#1f2421',
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              title: (items) => `Period: ${items[0]?.label}`,
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0
                const r = sortedRollups[idx]
                if (!r) return []
                return [
                  `Successful Try-Ons: ${r.successful_tryons}`,
                  `Issues / Retries: ${r.failed_tryons}`,
                  `Active Shoppers: ${r.unique_active_users}`,
                  `Avg Render Time: ${(r.avg_processing_time_ms / 1000).toFixed(2)}s`,
                ]
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Manrope, sans-serif', size: 10 },
              color: '#68716b',
              maxRotation: 45,
              minRotation: 0,
            },
          },
          ...scalesConfig,
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [sortedRollups, metricMode])

  if (!sortedRollups.length) return null

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp size={16} />
            </span>
            <h4 className="text-sm font-bold text-ink">
              Store Activity & Performance Time-Series
            </h4>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700">
              {period === 'daily' ? '60-Day Timeline' : '7-Month Timeline'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Interactive dual-axis trend analysis tracking shopper demand, try-on success rates, and system efficiency over time.
          </p>
        </div>

        {/* Metric Mode Pill Selectors */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-canvas p-1">
          <button
            onClick={() => setMetricMode('success')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              metricMode === 'success'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Activity size={13} />
            <span>Volume & Success Rate</span>
          </button>
          <button
            onClick={() => setMetricMode('users')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              metricMode === 'users'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Users size={13} />
            <span>Volume vs. Shoppers</span>
          </button>
          <button
            onClick={() => setMetricMode('performance')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              metricMode === 'performance'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Zap size={13} />
            <span>Speed & Quality</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative mt-4 h-72 w-full">
        <canvas ref={canvasRef} />
      </div>

      {/* Summary Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-[11px] text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" />
            <strong className="text-ink">Sessions Area</strong>: Total fitting volume across store.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <strong className="text-ink">Trend Curve</strong>: Moving success & quality ratings.
          </span>
        </div>
        <span className="font-semibold text-accent">
          {sortedRollups.length} Datapoints plotted • Peak Volume: {Math.max(...sortedRollups.map((r) => r.total_tryons))} sessions
        </span>
      </div>
    </div>
  )
}
