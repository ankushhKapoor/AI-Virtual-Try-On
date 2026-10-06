import { useEffect, useState } from 'react'

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

function formatSharpness(value) {
  return Number(value).toFixed(4)
}

async function calculateLegacyMetrics(imageUrl) {
  if (!imageUrl) return null
  const image = new Image()
  image.src = imageUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
  const luminance = new Float64Array(width * height)
  let balanced = 0
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4
    const value = (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114) / 255
    luminance[index] = value
    if (value > 0.02 && value < 0.98) balanced += 1
  }
  let sum = 0
  let sumSquares = 0
  let count = 0
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const laplacian = luminance[index - width] + luminance[index + width] + luminance[index - 1] + luminance[index + 1] - 4 * luminance[index]
      sum += laplacian
      sumSquares += laplacian * laplacian
      count += 1
    }
  }
  const sharpness = count ? (sumSquares / count) - (sum / count) ** 2 : 0
  return { output_sharpness: sharpness, exposure_balance: balanced / luminance.length }
}

function Metric({ label, value, note }) {
  return <div className="rounded-md bg-canvas px-4 py-3"><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>{note ? <p className="mt-1 text-xs leading-5 text-muted">{note}</p> : null}</div>
}

function EvaluationMetrics({ metrics, resultImage, className = '' }) {
  const [legacyMetrics, setLegacyMetrics] = useState(null)

  useEffect(() => {
    if (metrics || !resultImage) return undefined
    let active = true
    calculateLegacyMetrics(resultImage).then((value) => { if (active) setLegacyMetrics(value) }).catch(() => {})
    return () => { active = false }
  }, [metrics, resultImage])

  const values = metrics || legacyMetrics
  if (!values) return null
  const isLegacy = !metrics
  return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Quality Checks</p><p className="mt-2 text-sm leading-6 text-muted">{isLegacy ? 'Output checks calculated for this previously saved look.' : 'Measured after generation. These are quality indicators, not a fit guarantee.'}</p><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.person_background_ssim != null ? <Metric label="Person preservation" value={formatPercent(values.person_background_ssim)} note="Masked SSIM outside the edited garment area" /> : null}<Metric label="Output sharpness" value={formatSharpness(values.output_sharpness)} note="Laplacian variance; higher is sharper" /><Metric label="Exposure balance" value={formatPercent(values.exposure_balance)} note="Pixels retaining highlight and shadow detail" /></dl></section>
}

export default EvaluationMetrics
