import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart } from 'chart.js'
import './chartSetup'
import { defaultTooltipStyle } from './chartSetup'
import { AlertTriangle, BarChart3, CheckCircle2, Sliders } from 'lucide-react'

export default function CorrelationsRiskChart({ correlations = [], selectedDimension = 'all' }) {
  const canvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const [metricView, setMetricView] = useState('diverging') // 'diverging' or 'success'

  const filteredItems = useMemo(() => {
    if (!correlations || !correlations.length) return []
    if (selectedDimension === 'all') return correlations
    return correlations.filter((c) => c.dimension_name === selectedDimension)
  }, [correlations, selectedDimension])

  useEffect(() => {
    if (!canvasRef.current || !filteredItems.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    const labels = filteredItems.map((c) => `${c.dimension_value} (${c.dimension_name})`)

    if (metricView === 'diverging') {
      // Diverging bar chart: correlation_with_failure (-0.20 to +0.20)
      const values = filteredItems.map((c) => Number(c.correlation_with_failure || 0))
      const bgColors = values.map((v) => {
        if (v < -0.02) return 'rgba(16, 185, 129, 0.85)' // Protective (Green)
        if (v > 0.04) return 'rgba(225, 29, 72, 0.85)'  // High Risk (Red)
        if (v > 0) return 'rgba(245, 158, 11, 0.85)'    // Mild Risk (Amber)
        return 'rgba(100, 116, 139, 0.7)'              // Neutral
      })
      const borderColors = values.map((v) => {
        if (v < -0.02) return '#059669'
        if (v > 0.04) return '#b91c1c'
        if (v > 0) return '#d97706'
        return '#475569'
      })

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Correlation with Fitting Issues',
              data: values,
              backgroundColor: bgColors,
              borderColor: borderColors,
              borderWidth: 1.5,
              borderRadius: 5,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0
                  const item = filteredItems[idx]
                  return `${item.dimension_value} [${item.dimension_name}]`
                },
                label: (context) => {
                  const idx = context.dataIndex
                  const item = filteredItems[idx]
                  const corr = context.parsed.x
                  const isProtective = corr < 0
                  return [
                    `Issue Impact: ${corr > 0 ? '+' : ''}${corr.toFixed(3)} (${isProtective ? 'Protective / Highly Smooth' : corr > 0.04 ? 'Elevated Issue Risk' : 'Normal'})`,
                    `Success Rate: ${(Number(item.success_rate || 0) * 100).toFixed(1)}%`,
                    `Issue Rate: ${(Number(item.failure_rate || 0) * 100).toFixed(1)}%`,
                    `Total Tested Sessions: ${item.total_events?.toLocaleString()}`,
                    `Risk Multiplier: ${item.relative_risk !== undefined ? `${Number(item.relative_risk).toFixed(2)}x average` : '—'}`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: '◄ Lower Risk / Reliable   |   Elevated Issue Risk ►',
                font: { size: 11, weight: 'bold' },
                color: '#68716b',
              },
              grid: {
                color: (context) => (context.tick.value === 0 ? '#1f2421' : 'rgba(229, 231, 227, 0.6)'),
                lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
              },
              ticks: { font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
                color: '#1f2421',
              },
            },
          },
        },
      })
    } else {
      // Direct Success Rate % Comparison
      const successData = filteredItems.map((c) => Number(((c.success_rate || 0) * 100).toFixed(1)))

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Try-On Success Rate (%)',
              data: successData,
              backgroundColor: successData.map((s) => (s >= 88 ? 'rgba(16, 185, 129, 0.85)' : s >= 75 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(225, 29, 72, 0.85)')),
              borderColor: successData.map((s) => (s >= 88 ? '#059669' : s >= 75 ? '#d97706' : '#b91c1c')),
              borderWidth: 1.5,
              borderRadius: 5,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                label: (context) => {
                  const idx = context.dataIndex
                  const item = filteredItems[idx]
                  return [
                    `Success Rate: ${context.parsed.x}%`,
                    `Issue Rate: ${(Number(item.failure_rate || 0) * 100).toFixed(1)}%`,
                    `Total Sessions: ${item.total_events?.toLocaleString()}`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              min: 50,
              max: 100,
              title: {
                display: true,
                text: 'Try-On Success Rate (%)',
                font: { size: 11, weight: 'bold' },
                color: '#68716b',
              },
              ticks: { callback: (val) => `${val}%`, font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
                color: '#1f2421',
              },
            },
          },
        },
      })
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [filteredItems, metricView])

  if (!filteredItems.length) return null

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={16} />
            </span>
            <h4 className="text-sm font-bold text-ink">Risk & Reliability Impact Analysis</h4>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-red-700">
              Diverging Impact
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Identify which photo upload conditions, apparel categories, or device types generate the most seamless try-on results vs. fit friction.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas p-1">
          <button
            onClick={() => setMetricView('diverging')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              metricView === 'diverging'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Sliders size={13} />
            <span>Risk vs. Reliability</span>
          </button>
          <button
            onClick={() => setMetricView('success')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              metricView === 'success'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <BarChart3 size={13} />
            <span>Success Rate %</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-4 h-72 w-full">
        <canvas ref={canvasRef} />
      </div>

      {/* Chart Legend / Guidance strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-[11px] text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <strong className="text-ink">Green (Left)</strong>: High reliability factors (minimal retry rates).
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-600" />
            <strong className="text-ink">Red (Right)</strong>: High friction factors (require better lighting or fit tips).
          </span>
        </div>
        <span className="font-semibold text-ink">
          Showing {filteredItems.length} factors across {selectedDimension === 'all' ? 'All Dimensions' : selectedDimension}
        </span>
      </div>
    </div>
  )
}
