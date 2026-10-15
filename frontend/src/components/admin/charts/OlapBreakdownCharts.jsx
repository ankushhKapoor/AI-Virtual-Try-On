import React, { useRef, useEffect, useMemo } from 'react'
import { Chart, CHART_COLORS, defaultTooltipStyle } from './chartSetup'
import { ShoppingBag, Smartphone, CheckCircle2, AlertTriangle, Layers, Filter } from 'lucide-react'

export default function OlapBreakdownCharts({
  byCategory = [],
  byDevice = [],
  byOutcome = { SUCCESS: 0, FAILURE: 0, success_rate_pct: 0, failure_rate_pct: 0 },
  onSliceCategory = () => {},
  onSliceDevice = () => {},
  selectedCategory = '',
  selectedDevice = '',
}) {
  const catCanvasRef = useRef(null)
  const devCanvasRef = useRef(null)
  const outcomeCanvasRef = useRef(null)

  const catChartRef = useRef(null)
  const devChartRef = useRef(null)
  const outcomeChartRef = useRef(null)

  // 1. Category Breakdown Chart (Horizontal Bar)
  useEffect(() => {
    if (!catCanvasRef.current || !byCategory.length) return

    if (catChartRef.current) {
      catChartRef.current.destroy()
      catChartRef.current = null
    }

    const ctx = catCanvasRef.current.getContext('2d')
    const topCategories = byCategory.slice(0, 8)
    const labels = topCategories.map((c) => c.category)
    const volumes = topCategories.map((c) => c.total_tryons)

    const bgColors = topCategories.map((c) => {
      const isSelected = selectedCategory && selectedCategory.toLowerCase() === c.category.toLowerCase()
      if (selectedCategory && !isSelected) return 'rgba(148, 163, 184, 0.25)'
      return isSelected ? '#4F46E5' : 'rgba(36, 92, 75, 0.75)'
    })

    catChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Try-On Sessions',
            data: volumes,
            backgroundColor: bgColors,
            borderColor: '#245c4b',
            borderWidth: 1,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (!elements || !elements.length) return
          const idx = elements[0].index
          const clickedCat = topCategories[idx]
          if (clickedCat) {
            onSliceCategory(clickedCat.category)
          }
        },
        onHover: (event, elements) => {
          if (catCanvasRef.current) {
            catCanvasRef.current.style.cursor = elements.length ? 'pointer' : 'default'
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              afterBody: (context) => {
                const item = topCategories[context[0]?.dataIndex]
                if (!item) return ''
                return [
                  `Success Rate: ${item.success_rate_pct}%`,
                  `Avg Latency: ${(item.avg_processing_time_ms / 1000).toFixed(1)}s`,
                  `👉 Click to Slice by ${item.category}`,
                ].join('\n')
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(229, 231, 227, 0.6)' },
            ticks: { font: { family: 'Manrope, sans-serif', size: 10 } },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: 'Manrope, sans-serif', size: 11, weight: '600' },
              color: '#334155',
            },
          },
        },
      },
    })

    return () => {
      if (catChartRef.current) {
        catChartRef.current.destroy()
        catChartRef.current = null
      }
    }
  }, [byCategory, selectedCategory, onSliceCategory])

  // 2. Device Breakdown Chart (Grouped Bar: Camera vs Gallery)
  useEffect(() => {
    if (!devCanvasRef.current || !byDevice.length) return

    if (devChartRef.current) {
      devChartRef.current.destroy()
      devChartRef.current = null
    }

    const ctx = devCanvasRef.current.getContext('2d')
    const labels = byDevice.map((d) => d.device_type)
    const cameraCounts = byDevice.map((d) => d.camera_count || 0)
    const galleryCounts = byDevice.map((d) => d.gallery_count || 0)

    devChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Camera Upload',
            data: cameraCounts,
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 5,
            borderSkipped: false,
          },
          {
            label: 'Gallery Upload',
            data: galleryCounts,
            backgroundColor: 'rgba(15, 157, 120, 0.75)',
            borderColor: '#0F9D78',
            borderWidth: 1,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (!elements || !elements.length) return
          const idx = elements[0].index
          const clickedDev = byDevice[idx]
          if (clickedDev) {
            onSliceDevice(clickedDev.device_type)
          }
        },
        onHover: (event, elements) => {
          if (devCanvasRef.current) {
            devCanvasRef.current.style.cursor = elements.length ? 'pointer' : 'default'
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 10,
              usePointStyle: true,
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#475569',
            },
          },
          tooltip: {
            ...defaultTooltipStyle,
            callbacks: {
              afterBody: (context) => {
                const item = byDevice[context[0]?.dataIndex]
                if (!item) return ''
                return [
                  `Overall Success: ${item.success_rate_pct}%`,
                  `Total: ${item.total_tryons.toLocaleString()}`,
                  `👉 Click to Slice by ${item.device_type}`,
                ].join('\n')
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Manrope, sans-serif', size: 11, weight: '600' },
              color: '#334155',
            },
          },
          y: {
            grid: { color: 'rgba(229, 231, 227, 0.6)' },
            ticks: { font: { family: 'Manrope, sans-serif', size: 10 } },
          },
        },
      },
    })

    return () => {
      if (devChartRef.current) {
        devChartRef.current.destroy()
        devChartRef.current = null
      }
    }
  }, [byDevice, onSliceDevice])

  // 3. Success vs Failure Donut Chart with Exact Center Plugin
  useEffect(() => {
    if (!outcomeCanvasRef.current) return

    if (outcomeChartRef.current) {
      outcomeChartRef.current.destroy()
      outcomeChartRef.current = null
    }

    const ctx = outcomeCanvasRef.current.getContext('2d')
    const succ = byOutcome.SUCCESS || 0
    const fail = byOutcome.FAILURE || 0
    const total = succ + fail
    const succPct = byOutcome.success_rate_pct || (total > 0 ? ((succ / total) * 100).toFixed(1) : 0)

    const centerPlugin = {
      id: 'olapCenterPlugin',
      afterDraw: (chart) => {
        const { ctx: chartCtx, chartArea } = chart
        if (!chartArea) return
        const centerX = (chartArea.left + chartArea.right) / 2
        const centerY = (chartArea.top + chartArea.bottom) / 2

        chartCtx.save()
        chartCtx.textAlign = 'center'
        chartCtx.textBaseline = 'middle'

        // Success rate percentage
        chartCtx.font = '800 20px Manrope, sans-serif'
        chartCtx.fillStyle = '#10b981'
        chartCtx.fillText(`${succPct}%`, centerX, centerY - 7)

        // Subtitle
        chartCtx.font = '700 9px Manrope, sans-serif'
        chartCtx.fillStyle = '#64748b'
        chartCtx.letterSpacing = '1px'
        chartCtx.fillText('SUCCESS', centerX, centerY + 12)

        chartCtx.restore()
      },
    }

    outcomeChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Success', 'Failure / Retry'],
        datasets: [
          {
            data: [succ, fail],
            backgroundColor: ['#10b981', '#f43f5e'],
            hoverBackgroundColor: ['#059669', '#e11d48'],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      plugins: [centerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 8,
              usePointStyle: true,
              font: { family: 'Manrope, sans-serif', size: 10, weight: '600' },
              color: '#475569',
              padding: 12,
            },
          },
          tooltip: defaultTooltipStyle,
        },
      },
    })

    return () => {
      if (outcomeChartRef.current) {
        outcomeChartRef.current.destroy()
        outcomeChartRef.current = null
      }
    }
  }, [byOutcome])

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* 1. Category Breakdown Chart */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-accent" />
            <h4 className="text-sm font-bold text-ink">Category Breakdown</h4>
          </div>
          <span className="text-[11px] font-semibold text-muted">Click to Filter</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">Try-on volume by apparel category</p>
        <div className="relative mt-3 h-52 w-full">
          <canvas ref={catCanvasRef} />
        </div>
      </div>

      {/* 2. Device & Upload Method Comparison */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-accent" />
            <h4 className="text-sm font-bold text-ink">Device & Upload Method</h4>
          </div>
          <span className="text-[11px] font-semibold text-muted">Camera vs Gallery</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">Breakdown by device and photo upload type</p>
        <div className="relative mt-3 h-52 w-full">
          <canvas ref={devCanvasRef} />
        </div>
      </div>

      {/* 3. Outcome Ratio Donut */}
      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h4 className="text-sm font-bold text-ink">Success vs Failure</h4>
          </div>
          <span className="text-[11px] font-semibold text-muted">Pass / Fail Ratio</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">Success rate for current selection</p>
        <div className="relative mt-3 h-52 w-full">
          <canvas ref={outcomeCanvasRef} />
        </div>
      </div>
    </div>
  )
}
