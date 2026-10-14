import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, getClusterTheme, defaultTooltipStyle } from './chartSetup'
import { PieChart as PieIcon, Crosshair } from 'lucide-react'

export default function KMeansClusterChart({
  profiles = [],
  usersSample = [],
  selectedCluster = '',
  onSelectCluster = () => {},
}) {
  const scatterContainerRef = useRef(null)
  const donutContainerRef = useRef(null)
  const scatterCanvasRef = useRef(null)
  const donutCanvasRef = useRef(null)
  const scatterChartRef = useRef(null)
  const donutChartRef = useRef(null)

  const [yMetric, setYMetric] = useState('success') // 'success' or 'wishlist'

  // Pre-group users by cluster_id
  const usersByCluster = useMemo(() => {
    const map = {}
    usersSample.forEach((u) => {
      if (!u) return
      const cId = u.cluster_id ?? 0
      if (!map[cId]) map[cId] = []
      map[cId].push(u)
    })
    return map
  }, [usersSample])

  // Total shoppers count calculated safely
  const totalShoppers = useMemo(() => {
    if (usersSample.length > 0) return usersSample.length
    return profiles.reduce((sum, p) => sum + (Number(p.user_count) || 0), 0)
  }, [usersSample, profiles])

  // 1. Build 2D Scatter Chart
  useEffect(() => {
    if (!scatterCanvasRef.current || !profiles.length) return

    if (scatterChartRef.current) {
      scatterChartRef.current.destroy()
      scatterChartRef.current = null
    }

    const ctx = scatterCanvasRef.current.getContext('2d')

    // Find maximum try-ons for sensible axis headroom
    let maxX = 50
    usersSample.forEach((u) => {
      const val = Number(u.total_tryons)
      if (!isNaN(val) && val > maxX) maxX = val
    })
    const suggestedMaxX = Math.ceil((maxX + 6) / 10) * 10

    // Prepare datasets per cluster using centralized themes & stable keys
    const datasets = profiles.map((p, idx) => {
      const theme = getClusterTheme(p, idx)
      const clusterUsers = usersByCluster[p.cluster_id] || []
      const isSelected = selectedCluster === '' || selectedCluster === p.cluster_id

      // Validate coordinates: finite, non-null, within valid ranges
      const points = clusterUsers
        .filter((u) => {
          if (!u) return false
          const x = Number(u.total_tryons)
          const y = yMetric === 'success' ? Number(u.success_rate_pct) : Number(u.wishlist_rate_pct)
          return (
            !isNaN(x) &&
            !isNaN(y) &&
            isFinite(x) &&
            isFinite(y) &&
            x >= 0 &&
            y >= 0 &&
            y <= 100
          )
        })
        .map((u) => ({
          x: Number(u.total_tryons),
          y: yMetric === 'success' ? Number(u.success_rate_pct) : Number(u.wishlist_rate_pct),
          raw: u,
        }))

      return {
        label: p.cluster_name,
        clusterId: p.cluster_id,
        clusterKey: p.cluster_key || theme.key,
        data: points,
        clip: false, // Prevents points at the canvas edge from being cut off
        backgroundColor: isSelected ? theme.pointFill : 'rgba(148, 163, 184, 0.22)',
        borderColor: isSelected ? '#ffffff' : 'rgba(148, 163, 184, 0.40)',
        borderWidth: isSelected ? 1.2 : 0.8,
        pointRadius: isSelected ? (selectedCluster !== '' ? 5.5 : 4.5) : 3,
        pointHoverRadius: 7.5,
        pointHoverBackgroundColor: theme.fill,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    })

    scatterChartRef.current = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500,
          easing: 'easeOutQuart',
        },
        layout: {
          padding: {
            top: 16,
            right: 20,
            bottom: 8,
            left: 10,
          },
        },
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
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 14,
              font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
              color: '#1f2421',
              generateLabels: (chart) => {
                return chart.data.datasets.map((ds, i) => {
                  const profile = profiles[i]
                  const theme = getClusterTheme(profile, i)
                  const isSelected = selectedCluster === '' || selectedCluster === ds.clusterId
                  return {
                    text: `  ${ds.label}`,
                    fillStyle: isSelected ? theme.fill : 'rgba(148, 163, 184, 0.35)',
                    strokeStyle: isSelected ? theme.border : 'rgba(148, 163, 184, 0.5)',
                    lineWidth: 1,
                    pointStyle: 'circle',
                    hidden: false,
                    datasetIndex: i,
                  }
                })
              },
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
                return raw ? `${raw.name || 'Shopper'} (Shopper #${raw.user_id})` : ''
              },
              label: (context) => {
                const raw = context.raw?.raw
                if (!raw) return ''
                return [
                  `  Group: ${raw.cluster_name}`,
                  `  Total Try-Ons: ${raw.total_tryons} sessions`,
                  `  ${yMetric === 'success' ? 'Success Rate' : 'Wishlist Rate'}: ${yMetric === 'success' ? raw.success_rate_pct : raw.wishlist_rate_pct}%`,
                  `  Wishlist Rate: ${raw.wishlist_rate_pct}%`,
                  `  Photo Quality: ${raw.avg_quality_score}/5.0`,
                ]
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Total Try-Ons per Shopper',
              font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
              color: '#64748b',
              padding: { top: 10 },
            },
            grid: {
              color: 'rgba(226, 232, 240, 0.7)',
              drawBorder: false,
            },
            border: { display: false },
            min: 0,
            suggestedMax: suggestedMaxX,
            ticks: {
              stepSize: 10,
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#64748b',
              padding: 6,
            },
          },
          y: {
            title: {
              display: true,
              text: yMetric === 'success' ? 'Success Rate (%)' : 'Wishlist Rate (%)',
              font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
              color: '#64748b',
              padding: { bottom: 10 },
            },
            grid: {
              color: 'rgba(226, 232, 240, 0.7)',
              drawBorder: false,
            },
            border: { display: false },
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              callback: (val) => `${val}%`,
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#64748b',
              padding: 6,
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
  }, [profiles, usersByCluster, selectedCluster, yMetric, onSelectCluster, usersSample])

  // 2. Build Donut Chart with mathematically exact center text plugin
  useEffect(() => {
    if (!donutCanvasRef.current || !profiles.length) return

    if (donutChartRef.current) {
      donutChartRef.current.destroy()
      donutChartRef.current = null
    }

    const ctx = donutCanvasRef.current.getContext('2d')
    const labels = profiles.map((p) => p.cluster_name)
    const data = profiles.map((p) => Number(p.pct_of_userbase || 0))

    const themes = profiles.map((p, idx) => getClusterTheme(p, idx))
    const bgColors = profiles.map((p, idx) => {
      const isSelected = selectedCluster === '' || selectedCluster === p.cluster_id
      return isSelected ? themes[idx].fill : 'rgba(148, 163, 184, 0.35)'
    })
    const hoverBgColors = themes.map((t) => t.border)

    // Custom plugin: draws centered total shopper count exactly inside the doughnut hole
    const centerTextPlugin = {
      id: 'centerTextPlugin',
      afterDraw: (chart) => {
        const { ctx: chartCtx, chartArea } = chart
        if (!chartArea) return

        const centerX = (chartArea.left + chartArea.right) / 2
        const centerY = (chartArea.top + chartArea.bottom) / 2

        chartCtx.save()
        chartCtx.textAlign = 'center'
        chartCtx.textBaseline = 'middle'

        // Total count
        chartCtx.font = '800 24px Manrope, sans-serif'
        chartCtx.fillStyle = '#1f2421'
        chartCtx.fillText(totalShoppers.toLocaleString(), centerX, centerY - 8)

        // Subtitle
        chartCtx.font = '700 10px Manrope, sans-serif'
        chartCtx.fillStyle = '#64748b'
        chartCtx.letterSpacing = '1px'
        chartCtx.fillText('SHOPPERS', centerX, centerY + 13)

        chartCtx.restore()
      },
    }

    donutChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: bgColors,
            hoverBackgroundColor: hoverBgColors,
            borderColor: '#ffffff',
            borderWidth: 2.5,
            hoverOffset: 6,
            borderRadius: 3,
          },
        ],
      },
      plugins: [centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 600,
          easing: 'easeOutQuart',
        },
        layout: {
          padding: {
            top: 8,
            bottom: 4,
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index
            const profile = profiles[idx]
            if (profile) {
              onSelectCluster(profile.cluster_id === selectedCluster ? '' : profile.cluster_id)
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 12,
              font: { family: 'Manrope, sans-serif', size: 10.5, weight: '700' },
              color: '#1f2421',
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0]
                return chart.data.labels.map((label, i) => {
                  const profile = profiles[i]
                  const theme = getClusterTheme(profile, i)
                  const isSelected = selectedCluster === '' || selectedCluster === profile.cluster_id
                  return {
                    text: `  ${label}  (${Number(ds.data[i]).toFixed(1)}%)`,
                    fillStyle: isSelected ? theme.fill : 'rgba(148, 163, 184, 0.35)',
                    strokeStyle: isSelected ? theme.border : 'rgba(148, 163, 184, 0.5)',
                    lineWidth: 0,
                    pointStyle: 'circle',
                    hidden: false,
                    index: i,
                  }
                })
              },
            },
            onClick: (e, legendItem) => {
              const profile = profiles[legendItem.index]
              if (profile) {
                onSelectCluster(profile.cluster_id === selectedCluster ? '' : profile.cluster_id)
              }
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex
                return profiles[idx]?.cluster_name || ''
              },
              label: (context) => {
                const idx = context.dataIndex
                const p = profiles[idx]
                return [
                  `  ${Number(p.pct_of_userbase).toFixed(1)}% of all shoppers (${Number(p.user_count || 0).toLocaleString()} users)`,
                  `  Avg Try-Ons: ${Number(p.avg_tryons_per_user).toFixed(1)} sessions`,
                  `  Success Rate: ${Number(p.avg_success_rate_pct).toFixed(1)}%`,
                  `  Wishlist Rate: ${Number(p.avg_wishlist_rate_pct).toFixed(1)}%`,
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
  }, [profiles, selectedCluster, onSelectCluster, totalShoppers])

  // ResizeObserver for reliable responsive chart dimensions
  useEffect(() => {
    if (!scatterContainerRef.current) return
    const ro = new ResizeObserver(() => {
      if (scatterChartRef.current) {
        scatterChartRef.current.resize()
      }
      if (donutChartRef.current) {
        donutChartRef.current.resize()
      }
    })
    ro.observe(scatterContainerRef.current)
    if (donutContainerRef.current) ro.observe(donutContainerRef.current)

    return () => ro.disconnect()
  }, [])

  if (!profiles.length) return null

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 2D Cluster Scatter Plot (2 cols on large screen) */}
      <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs lg:col-span-2">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Crosshair size={16} />
                </span>
                <h4 className="text-sm font-bold text-ink">Interactive Shopper Behavioral Map</h4>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-indigo-700">
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

          <div ref={scatterContainerRef} className="relative mt-4 h-80 sm:h-96 w-full">
            <canvas ref={scatterCanvasRef} />
          </div>
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

      {/* Customer Share Donut Chart (1 col on large screen) */}
      <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 border-b border-line/60 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PieIcon size={16} />
            </span>
            <div>
              <h4 className="text-sm font-bold text-ink">Customer Group Breakdown</h4>
              <p className="text-[11px] text-muted">Distribution across {profiles.length} groups</p>
            </div>
          </div>

          <div ref={donutContainerRef} className="relative mt-4 h-80 sm:h-96 w-full flex items-center justify-center">
            <canvas ref={donutCanvasRef} />
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-canvas p-2.5 text-center text-[11px] text-muted">
          <span className="font-semibold text-ink">Active Segmentation:</span> {profiles.length} Distinct Behavioral Profiles
        </div>
      </div>
    </div>
  )
}
