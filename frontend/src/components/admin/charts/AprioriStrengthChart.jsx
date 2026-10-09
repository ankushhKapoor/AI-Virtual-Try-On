import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Chart } from 'chart.js'
import './chartSetup'
import { CHART_COLORS, defaultTooltipStyle } from './chartSetup'
import { BarChart3, ScatterChart as ScatterIcon, Sparkles } from 'lucide-react'

export default function AprioriStrengthChart({ rules = [] }) {
  const canvasRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const [viewMode, setViewMode] = useState('bars') // 'bars' or 'scatter'

  // Top 10 rules sorted by lift
  const topRules = useMemo(() => {
    if (!rules || !rules.length) return []
    return [...rules]
      .sort((a, b) => (b.lift || 0) - (a.lift || 0))
      .slice(0, 10)
  }, [rules])

  useEffect(() => {
    if (!canvasRef.current || !topRules.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')

    if (viewMode === 'bars') {
      // Short label helper: "A → B"
      const labels = topRules.map((r) => {
        const from = (r.antecedents || '').length > 22 ? `${(r.antecedents || '').slice(0, 20)}…` : r.antecedents
        const to = (r.consequents || '').length > 22 ? `${(r.consequents || '').slice(0, 20)}…` : r.consequents
        return `${from} → ${to}`
      })

      const liftData = topRules.map((r) => Number((r.lift || 0).toFixed(2)))
      const confData = topRules.map((r) => Number(((r.confidence || 0) * 100).toFixed(1)))

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Pairing Boost (Strength multiplier)',
              data: liftData,
              backgroundColor: 'rgba(99, 102, 241, 0.85)',
              borderColor: '#4f46e5',
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: 'yLift',
            },
            {
              label: 'Match Chance (%)',
              data: confData,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderColor: '#059669',
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: 'yConf',
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                padding: 16,
                font: { family: 'Manrope, sans-serif', size: 11, weight: 'bold' },
                color: '#1f2421',
              },
            },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? 0
                  const r = topRules[idx]
                  return `${r.antecedents} + ${r.consequents}`
                },
                label: (context) => {
                  const idx = context.dataIndex
                  const r = topRules[idx]
                  if (context.datasetIndex === 0) {
                    return ` Pairing Boost: ${context.parsed.x}x stronger than random chance`
                  }
                  return ` Match Chance: ${context.parsed.x}% of shoppers try both items together`
                },
                afterBody: (items) => {
                  const idx = items[0]?.dataIndex ?? 0
                  const r = topRules[idx]
                  return [
                    `Popularity in catalog: ${((r.support || 0) * 100).toFixed(1)}% of all fitting sessions`,
                    `Categories: ${r.antecedent_categories || 'Item'} ➔ ${r.consequent_categories || 'Item'}`,
                  ]
                },
              },
            },
          },
          scales: {
            y: {
              grid: { display: false },
              ticks: {
                font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
                color: '#1f2421',
              },
            },
            yLift: {
              type: 'linear',
              position: 'bottom',
              title: {
                display: true,
                text: 'Pairing Boost (x times baseline)',
                font: { size: 10, weight: 'bold' },
                color: '#6366f1',
              },
              grid: { color: 'rgba(229, 231, 227, 0.6)' },
              ticks: { color: '#6366f1', font: { size: 10 } },
            },
            yConf: {
              type: 'linear',
              position: 'top',
              title: {
                display: true,
                text: 'Match Chance (%)',
                font: { size: 10, weight: 'bold' },
                color: '#10b981',
              },
              grid: { display: false },
              ticks: {
                color: '#10b981',
                font: { size: 10 },
                callback: (val) => `${val}%`,
              },
            },
          },
        },
      })
    } else {
      // Scatter / Bubble plot: Popularity vs Match Chance, Bubble size = Lift
      const bubbleData = topRules.map((r) => ({
        x: Number(((r.support || 0) * 100).toFixed(2)),
        y: Number(((r.confidence || 0) * 100).toFixed(1)),
        r: Math.max(6, Math.min(22, (r.lift || 1) * 4.5)),
        raw: r,
      }))

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bubble',
        data: {
          datasets: [
            {
              label: 'Discovered Outfit Rules (Size = Pairing Boost)',
              data: bubbleData,
              backgroundColor: 'rgba(99, 102, 241, 0.65)',
              borderColor: '#4f46e5',
              borderWidth: 2,
              hoverBackgroundColor: 'rgba(36, 92, 75, 0.9)',
              hoverBorderColor: '#245c4b',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                font: { family: 'Manrope, sans-serif', size: 11, weight: 'bold' },
                color: '#1f2421',
              },
            },
            tooltip: {
              ...defaultTooltipStyle,
              callbacks: {
                title: (items) => {
                  const raw = items[0]?.raw?.raw
                  return raw ? `${raw.antecedents} ➔ ${raw.consequents}` : ''
                },
                label: (context) => {
                  const raw = context.raw?.raw
                  if (!raw) return ''
                  return [
                    `Popularity: ${context.raw.x}% of sessions`,
                    `Match Chance: ${context.raw.y}% likelihood`,
                    `Pairing Boost: ${(raw.lift || 0).toFixed(2)}x baseline`,
                  ]
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Catalog Popularity (% of try-on sessions including primary item)',
                font: { size: 11, weight: 'bold' },
                color: '#68716b',
              },
              grid: { color: 'rgba(229, 231, 227, 0.6)' },
              ticks: { callback: (val) => `${val}%`, font: { size: 10 } },
            },
            y: {
              title: {
                display: true,
                text: 'Match Rate (% who also tried the recommended piece)',
                font: { size: 11, weight: 'bold' },
                color: '#68716b',
              },
              grid: { color: 'rgba(229, 231, 227, 0.6)' },
              ticks: { callback: (val) => `${val}%`, font: { size: 10 } },
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
  }, [topRules, viewMode])

  if (!topRules.length) return null

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles size={16} />
            </span>
            <h4 className="text-sm font-bold text-ink">Outfit Pairing Recommendation Matrix</h4>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-indigo-700">
              Interactive
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Visually compare which clothing pieces generate the highest cross-sell lift when shoppers try them on together.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas p-1">
          <button
            onClick={() => setViewMode('bars')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === 'bars'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <BarChart3 size={13} />
            <span>Ranking Bars</span>
          </button>
          <button
            onClick={() => setViewMode('scatter')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === 'scatter'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <ScatterIcon size={13} />
            <span>Popularity vs Match Matrix</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative mt-4 h-72 w-full">
        <canvas ref={canvasRef} />
      </div>

      {/* Insight strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-[11px] text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-indigo-600" />
            <strong className="text-ink">Pairing Boost (Lift)</strong>: Values &gt; 1.0x mean customers pair these items far more than random chance.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <strong className="text-ink">Match Chance (Confidence)</strong>: Exact percentage of shoppers who accepted the pairing.
          </span>
        </div>
        <span className="font-semibold text-accent">
          Top Rule: {topRules[0]?.antecedents} → {topRules[0]?.consequents} ({topRules[0]?.lift?.toFixed(2)}x boost)
        </span>
      </div>
    </div>
  )
}
