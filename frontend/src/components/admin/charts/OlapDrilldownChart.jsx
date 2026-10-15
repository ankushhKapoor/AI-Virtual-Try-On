import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, CHART_COLORS, defaultTooltipStyle } from './chartSetup'
import { ArrowDownRight, CornerRightDown, Layers, MousePointerClick, TrendingUp, Zap, HelpCircle } from 'lucide-react'

export default function OlapDrilldownChart({
  timeSeries = [],
  level = 'month',
  onDrillDown = () => {},
  onRollUp = () => {},
  canRollUp = false,
}) {
  const canvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const containerRef = useRef(null)
  const [metricMode, setMetricMode] = useState('volume_success') // 'volume_success', 'latency', 'quality'

  // Chronologically sorted items
  const sortedData = useMemo(() => {
    if (!timeSeries || !timeSeries.length) return []
    return [...timeSeries]
  }, [timeSeries])

  useEffect(() => {
    if (!canvasRef.current || !sortedData.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    const ctx = canvasRef.current.getContext('2d')
    const labels = sortedData.map((d) => d.label || d.key)
    const volumes = sortedData.map((d) => d.total_tryons)

    // Gradient background for volume
    const volGrad = ctx.createLinearGradient(0, 0, 0, 320)
    volGrad.addColorStop(0, 'rgba(79, 70, 229, 0.35)')
    volGrad.addColorStop(1, 'rgba(79, 70, 229, 0.02)')

    let datasets = []
    let scalesConfig = {}

    if (metricMode === 'volume_success') {
      const successRates = sortedData.map((d) => Number(d.success_rate_pct || 0))
      datasets = [
        {
          label: 'Total Try-Ons (Volume)',
          data: volumes,
          type: 'bar',
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          hoverBackgroundColor: '#4338CA',
          borderColor: '#4F46E5',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          yAxisID: 'yVol',
        },
        {
          label: 'Success Rate (%)',
          data: successRates,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#10b981',
          pointBorderWidth: 2,
          tension: 0.3,
          yAxisID: 'yRate',
        },
      ]

      scalesConfig = {
        yVol: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Try-On Volume',
            font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
            color: '#4F46E5',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
          ticks: { font: { family: 'Manrope, sans-serif', size: 10 } },
        },
        yRate: {
          type: 'linear',
          position: 'right',
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Success Rate (%)',
            font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
            color: '#10b981',
          },
          grid: { display: false },
          ticks: {
            callback: (v) => `${v}%`,
            font: { family: 'Manrope, sans-serif', size: 10 },
            color: '#10b981',
          },
        },
      }
    } else if (metricMode === 'latency') {
      const latencies = sortedData.map((d) => Math.round((d.avg_processing_time_ms || 0) / 100) / 10) // in seconds
      datasets = [
        {
          label: 'Avg Latency (Seconds)',
          data: latencies,
          type: 'line',
          fill: true,
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#f59e0b',
          tension: 0.35,
        },
      ]
      scalesConfig = {
        y: {
          title: {
            display: true,
            text: 'Processing Latency (s)',
            font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
            color: '#f59e0b',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
          ticks: { callback: (v) => `${v}s` },
        },
      }
    } else {
      // quality
      const qualities = sortedData.map((d) => Number(d.avg_quality_score || 0))
      datasets = [
        {
          label: 'Average Quality Score (0 - 1.0)',
          data: qualities,
          type: 'bar',
          backgroundColor: 'rgba(16, 185, 129, 0.70)',
          hoverBackgroundColor: '#059669',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ]
      scalesConfig = {
        y: {
          min: 0.5,
          max: 1.0,
          title: {
            display: true,
            text: 'Quality Score (Fidelity)',
            font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
            color: '#10b981',
          },
          grid: { color: 'rgba(229, 231, 227, 0.6)' },
          ticks: { callback: (v) => Number(v).toFixed(2) },
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
        onClick: (event, elements) => {
          if (!elements || !elements.length) return
          const elem = elements[0]
          const dataIndex = elem.index
          const clickedItem = sortedData[dataIndex]
          if (clickedItem && clickedItem.can_drill_down && clickedItem.drill_params) {
            onDrillDown(clickedItem)
          }
        },
        onHover: (event, elements) => {
          if (!canvasRef.current) return
          if (elements && elements.length > 0) {
            const item = sortedData[elements[0].index]
            canvasRef.current.style.cursor = item?.can_drill_down ? 'pointer' : 'default'
          } else {
            canvasRef.current.style.cursor = 'default'
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              font: { family: 'Manrope, sans-serif', size: 11, weight: '600' },
              color: '#475569',
              padding: 16,
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              afterBody: (context) => {
                const item = sortedData[context[0]?.dataIndex]
                if (!item) return ''
                const hints = []
                hints.push(`Successful: ${item.successful_tryons.toLocaleString()} tries`)
                hints.push(`Failed: ${item.failed_tryons.toLocaleString()} tries`)
                hints.push(`Avg Latency: ${(item.avg_processing_time_ms / 1000).toFixed(2)}s`)
                if (item.can_drill_down) {
                  const nextLevel = item.drill_params?.level || 'lower level'
                  hints.push(`👉 CLICK TO ZOOM IN for ${nextLevel.toUpperCase()} detail`)
                }
                return hints.join('\n')
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#64748b',
              maxRotation: 45,
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
  }, [sortedData, metricMode, onDrillDown])

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize()
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const nextLevelName =
    level === 'year'
      ? 'Month'
      : level === 'month'
      ? 'Day'
      : level === 'day'
      ? 'Hour'
      : null

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      {/* Header with Mode Toggles and Drill-Down hints */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" />
            <h4 className="text-base font-bold text-ink">
              Try-On Activity Over Time ({level.toUpperCase()} View)
            </h4>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            {nextLevelName ? (
              <>
                <MousePointerClick size={14} className="text-accent inline" />
                <span>
                  Interactive Chart: <strong>Click any bar</strong> to{' '}
                  <span className="text-accent font-semibold underline">zoom in</span> for{' '}
                  <strong>{nextLevelName}</strong> detail.
                </span>
              </>
            ) : (
              <span>Viewing detailed hourly breakdown. Use the buttons or breadcrumbs above to zoom back out.</span>
            )}
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas p-1">
          <button
            onClick={() => setMetricMode('volume_success')}
            className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
              metricMode === 'volume_success'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Volume & Success
          </button>
          <button
            onClick={() => setMetricMode('latency')}
            className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
              metricMode === 'latency'
                ? 'bg-surface text-amber-700 shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Latency (s)
          </button>
          <button
            onClick={() => setMetricMode('quality')}
            className={`rounded px-3 py-1.5 text-xs font-bold transition-all ${
              metricMode === 'quality'
                ? 'bg-surface text-emerald-700 shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Quality Score
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="relative mt-4 h-72 w-full">
        <canvas ref={canvasRef} />
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs text-muted">
        <div className="flex items-center gap-4">
          <span>
            Data Points: <strong className="text-ink">{sortedData.length}</strong>
          </span>
          <span>
            Total Volume in View:{' '}
            <strong className="text-ink">
              {sortedData.reduce((s, d) => s + (d.total_tryons || 0), 0).toLocaleString()}
            </strong>
          </span>
        </div>
        {canRollUp && (
          <button
            onClick={onRollUp}
            className="flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            <span>Roll up to higher level</span>
            <CornerRightDown size={14} className="rotate-180 inline" />
          </button>
        )}
      </div>
    </div>
  )
}
