import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, CLUSTER_PALETTE, defaultTooltipStyle } from './chartSetup'
import { Users, PieChart as PieIcon, Crosshair } from 'lucide-react'

export default function KMeansClusterChart({
  profiles = [],
  usersSample = [],
  selectedCluster = '',
  onSelectCluster = () => {},
}) {
  const scatterCanvasRef = useRef(null)
  const donutCanvasRef = useRef(null)
  const scatterChartRef = useRef(null)
  const donutChartRef = useRef(null)

  const [yMetric, setYMetric] = useState('success') // 'success' or 'wishlist'

  // Pre-group users by cluster_id
  const usersByCluster = useMemo(() => {
    const map = {}
    usersSample.forEach((u) => {
      const cId = u.cluster_id ?? 0
      if (!map[cId]) map[cId] = []
      map[cId].push(u)
    })
    return map
  }, [usersSample])

  // 1. Build 2D Scatter Chart
  useEffect(() => {
    if (!scatterCanvasRef.current || !profiles.length) return

    if (scatterChartRef.current) {
      scatterChartRef.current.destroy()
    }

    const ctx = scatterCanvasRef.current.getContext('2d')

    // Prepare datasets per cluster
    const datasets = profiles.map((p, idx) => {
      const clusterUsers = usersByCluster[p.cluster_id] || []
      const colorScheme = CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length]
      const isSelected = selectedCluster === '' || selectedCluster === p.cluster_id

      const points = clusterUsers.map((u) => ({
        x: Number(u.total_tryons || 0),
        y: yMetric === 'success' ? Number(u.success_rate_pct || 0) : Number(u.wishlist_rate_pct || 0),
        raw: u,
      }))

      return {
        label: p.cluster_name,
        data: points,
        backgroundColor: isSelected ? colorScheme.fill : 'rgba(154, 161, 155, 0.25)',
        borderColor: isSelected ? colorScheme.border : 'rgba(154, 161, 155, 0.4)',
        borderWidth: 1,
        pointRadius: isSelected ? 4 : 2.5,
        pointHoverRadius: 7,
        clusterId: p.cluster_id,
      }
    })

    scatterChartRef.current = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const first = elements[0]
            const dataset = datasets[first.datasetIndex]
            if (dataset) {
              onSelectCluster(dataset.clusterId === selectedCluster ? '' : dataset.clusterId)
            }
          }
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
            onClick: (e, legendItem) => {
              const profile = profiles[legendItem.datasetIndex]
              if (profile) {
                onSelectCluster(profile.cluster_id === selectedCluster ? '' : profile.cluster_id)
              }
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              title: (items) => {
                const raw = items[0]?.raw?.raw
                return raw ? `${raw.name} (Shopper #${raw.user_id})` : ''
              },
              label: (context) => {
                const raw = context.raw?.raw
                if (!raw) return ''
                return [
                  `Group: ${raw.cluster_name}`,
                  `Total Try-Ons: ${raw.total_tryons} sessions`,
                  `Try-On Success Rate: ${raw.success_rate_pct}%`,
                  `Wishlist Rate: ${raw.wishlist_rate_pct}%`,
                  `Avg Photo Quality: ${raw.avg_quality_score}/5.0`,
                ]
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fitting Frequency (Total Try-Ons per Shopper)',
              font: { size: 11, weight: 'bold' },
              color: '#68716b',
            },
            grid: { color: 'rgba(229, 231, 227, 0.6)' },
            ticks: { font: { size: 10 } },
          },
          y: {
            title: {
              display: true,
              text: yMetric === 'success' ? 'Try-On Success Rate (%)' : 'Wishlist Engagement Rate (%)',
              font: { size: 11, weight: 'bold' },
              color: '#68716b',
            },
            grid: { color: 'rgba(229, 231, 227, 0.6)' },
            ticks: {
              callback: (val) => `${val}%`,
              font: { size: 10 },
            },
          },
        },
      },
    })

    return () => {
      if (scatterChartRef.current) {
        scatterChartRef.current.destroy()
        scatterChartRef.current = null
      }
    }
  }, [profiles, usersByCluster, selectedCluster, yMetric, onSelectCluster])

  // 2. Build Donut Chart for Userbase Share
  useEffect(() => {
    if (!donutCanvasRef.current || !profiles.length) return

    if (donutChartRef.current) {
      donutChartRef.current.destroy()
    }

    const ctx = donutCanvasRef.current.getContext('2d')
    const labels = profiles.map((p) => p.cluster_name)
    const data = profiles.map((p) => Number(p.pct_of_userbase || 0))
    const bgColors = profiles.map((_, i) => CLUSTER_PALETTE[i % CLUSTER_PALETTE.length].fill)
    const borderColors = profiles.map((_, i) => CLUSTER_PALETTE[i % CLUSTER_PALETTE.length].border)

    donutChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 7,
              padding: 10,
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#1f2421',
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex
                const p = profiles[idx]
                return [
                  ` ${p.pct_of_userbase}% of shopper community`,
                  ` Avg Try-Ons: ${Number(p.avg_tryons_per_user).toFixed(1)} sessions`,
                  ` Success Rate: ${Number(p.avg_success_rate_pct).toFixed(1)}%`,
                ]
              },
            },
          },
        },
      },
    })

    return () => {
      if (donutChartRef.current) {
        donutChartRef.current.destroy()
        donutChartRef.current = null
      }
    }
  }, [profiles])

  if (!profiles.length) return null

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 2D Cluster Scatter Plot (2 cols) */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Crosshair size={16} />
              </span>
              <h4 className="text-sm font-bold text-ink">Interactive Shopper Behavioral Map</h4>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700">
                2D Scatter
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Each point represents a shopper. Click a cluster in the legend or map to isolate that behavioral group.
            </p>
          </div>

          {/* Metric toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-1">
            <button
              onClick={() => setYMetric('success')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                yMetric === 'success'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Success Rate %
            </button>
            <button
              onClick={() => setYMetric('wishlist')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                yMetric === 'wishlist'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Wishlist Rate %
            </button>
          </div>
        </div>

        <div className="relative mt-4 h-72 w-full">
          <canvas ref={scatterCanvasRef} />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[11px] text-muted">
          <span>Tip: Hover any point to inspect individual shopper fit statistics.</span>
          {selectedCluster !== '' && (
            <button
              onClick={() => onSelectCluster('')}
              className="font-bold text-accent hover:underline"
            >
              Reset Isolation Filter
            </button>
          )}
        </div>
      </div>

      {/* Customer Share Donut Chart (1 col) */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-line/60 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <PieIcon size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-ink">Customer Group Breakdown</h4>
              <p className="text-[11px] text-muted">Distribution across {profiles.length} groups</p>
            </div>
          </div>

          <div className="relative mt-4 h-60 w-full flex items-center justify-center">
            <canvas ref={donutCanvasRef} />
            <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-ink">{usersSample.length || '1,200'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Shoppers</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-canvas p-2.5 text-center text-[11px] text-muted">
          <span className="font-semibold text-ink">Active Segmentation:</span> {profiles.length} Distinct Behavioral Profiles
        </div>
      </div>
    </div>
  )
}
