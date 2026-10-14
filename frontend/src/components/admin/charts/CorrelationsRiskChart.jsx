import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart, defaultTooltipStyle } from './chartSetup'
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

  // Dynamic chart height based on number of items
  const chartHeight = useMemo(() => {
    const minH = 280
    const perBar = 36
    return Math.max(minH, filteredItems.length * perBar + 60)
  }, [filteredItems])

  useEffect(() => {
    if (!canvasRef.current || !filteredItems.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    const labels = filteredItems.map((c) => c.dimension_value)

    if (metricView === 'diverging') {
      // Diverging bar chart: correlation_with_failure (-0.20 to +0.20)
      const values = filteredItems.map((c) => Number(c.correlation_with_failure || 0))

      // Create gradient-style colors for a more professional look
      const bgColors = values.map((v) => {
        if (v < -0.03) return 'rgba(16, 185, 129, 0.75)'   // Strong Protective (Green)
        if (v < -0.01) return 'rgba(52, 211, 153, 0.65)'   // Mild Protective (Light green)
        if (v > 0.06) return 'rgba(225, 29, 72, 0.80)'     // High Risk (Red)
        if (v > 0.03) return 'rgba(251, 146, 60, 0.75)'    // Moderate Risk (Orange)
        if (v > 0) return 'rgba(245, 158, 11, 0.65)'       // Mild Risk (Amber)
        return 'rgba(148, 163, 184, 0.55)'                 // Neutral (Slate)
      })
      const borderColors = values.map((v) => {
        if (v < -0.03) return '#059669'
        if (v < -0.01) return '#34d399'
        if (v > 0.06) return '#be123c'
        if (v > 0.03) return '#ea580c'
        if (v > 0) return '#d97706'
        return '#94a3b8'
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
              borderRadius: 6,
              borderSkipped: false,
              barThickness: 22,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 700,
            easing: 'easeOutQuart',
          },
          layout: {
            padding: { left: 4, right: 16, top: 8, bottom: 8 },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0
                  const item = filteredItems[idx]
                  return `${item.dimension_value}  •  ${item.dimension_name}`
                },
                label: (context) => {
                  const idx = context.dataIndex
                  const item = filteredItems[idx]
                  const corr = context.parsed.x
                  const isProtective = corr < 0
                  return [
                    `  Impact Score: ${corr > 0 ? '+' : ''}${corr.toFixed(3)} (${isProtective ? 'Protective' : corr > 0.04 ? 'Elevated Risk' : 'Normal'})`,
                    `  Success Rate: ${(Number(item.success_rate || 0) * 100).toFixed(1)}%`,
                    `  Issue Rate: ${(Number(item.failure_rate || 0) * 100).toFixed(1)}%`,
                    `  Total Sessions: ${item.total_events?.toLocaleString()}`,
                    `  Risk Multiplier: ${item.relative_risk !== undefined ? `${Number(item.relative_risk).toFixed(2)}x avg` : '—'}`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: '◄  Lower Risk / Reliable   │   Elevated Issue Risk  ►',
                font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
                color: '#68716b',
                padding: { top: 10 },
              },
              grid: {
                color: (context) => (context.tick.value === 0 ? '#374151' : 'rgba(229, 231, 227, 0.45)'),
                lineWidth: (context) => (context.tick.value === 0 ? 2 : 1),
              },
              border: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
                color: '#68716b',
                padding: 4,
              },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 11, weight: '600' },
                color: '#1f2421',
                padding: 8,
                crossAlign: 'far',
              },
            },
          },
        },
      })
    } else {
      // Direct Success Rate % Comparison
      const successData = filteredItems.map((c) => Number(((c.success_rate || 0) * 100).toFixed(1)))

      // Gradient-style coloring based on success rate thresholds
      const bgColors = successData.map((s) => {
        if (s >= 90) return 'rgba(16, 185, 129, 0.75)'
        if (s >= 85) return 'rgba(52, 211, 153, 0.65)'
        if (s >= 78) return 'rgba(245, 158, 11, 0.65)'
        if (s >= 70) return 'rgba(251, 146, 60, 0.75)'
        return 'rgba(225, 29, 72, 0.75)'
      })
      const borderColors = successData.map((s) => {
        if (s >= 90) return '#059669'
        if (s >= 85) return '#34d399'
        if (s >= 78) return '#d97706'
        if (s >= 70) return '#ea580c'
        return '#be123c'
      })

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Try-On Success Rate (%)',
              data: successData,
              backgroundColor: bgColors,
              borderColor: borderColors,
              borderWidth: 1.5,
              borderRadius: 6,
              borderSkipped: false,
              barThickness: 22,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 700,
            easing: 'easeOutQuart',
          },
          layout: {
            padding: { left: 4, right: 16, top: 8, bottom: 8 },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0
                  const item = filteredItems[idx]
                  return `${item.dimension_value}  •  ${item.dimension_name}`
                },
                label: (context) => {
                  const idx = context.dataIndex
                  const item = filteredItems[idx]
                  return [
                    `  Success Rate: ${context.parsed.x}%`,
                    `  Issue Rate: ${(Number(item.failure_rate || 0) * 100).toFixed(1)}%`,
                    `  Total Sessions: ${item.total_events?.toLocaleString()}`,
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
                font: { family: 'Manrope, sans-serif', size: 11, weight: '700' },
                color: '#68716b',
                padding: { top: 10 },
              },
              grid: {
                color: 'rgba(229, 231, 227, 0.45)',
              },
              border: { display: false },
              ticks: {
                callback: (val) => `${val}%`,
                font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
                color: '#68716b',
                padding: 4,
              },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 11, weight: '600' },
                color: '#1f2421',
                padding: 8,
                crossAlign: 'far',
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
              {metricView === 'diverging' ? 'Diverging Impact' : 'Success Comparison'}
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

      {/* Chart Canvas — Dynamic height based on data */}
      <div className="relative mt-4 w-full" style={{ height: `${chartHeight}px` }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Chart Legend / Guidance strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3 text-[11px] text-muted">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <strong className="text-ink">Green</strong>: High reliability (minimal retries).
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <strong className="text-ink">Amber</strong>: Moderate friction.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-600" />
            <strong className="text-ink">Red</strong>: Elevated issue risk.
          </span>
        </div>
        <span className="font-semibold text-ink">
          {filteredItems.length} factors  •  {selectedDimension === 'all' ? 'All Dimensions' : selectedDimension}
        </span>
      </div>
    </div>
  )
}
