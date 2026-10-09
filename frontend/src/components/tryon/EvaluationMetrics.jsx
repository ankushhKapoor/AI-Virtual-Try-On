function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`
}

function Metric({ label, value, note }) {
  return <div className="min-w-0 rounded-md bg-canvas px-4 py-3"><dt className="break-words text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 break-words text-lg font-semibold text-ink">{value}</dd><p className="mt-1 break-words text-xs leading-5 text-muted">{note}</p></div>
}

function EvaluationMetrics({ metrics, resultImage, className = '', compact = false }) {
  if (!resultImage) return null

  if (!metrics || (metrics.overall_ssim == null && metrics.person_background_ssim == null)) {
    return <section className={`min-w-0 rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 break-words text-sm leading-6 text-muted">Metrics are unavailable for this result. Restart the Model API and generate a new look to calculate the current evaluation summary.</p></section>
  }

  const gridClass = compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'
  return <section className={`min-w-0 overflow-hidden rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p>{!compact ? <p className="mt-2 text-sm leading-6 text-muted">Overall SSIM includes the intended clothing change. Masked SSIM and PSNR check only the preserved person/background area; higher is better. Garment similarity compares the clothing region with the selected product.</p> : null}<dl className={`mt-5 grid gap-3 ${gridClass}`}>{metrics.garment_siglip_similarity != null ? <Metric label="Garment similarity" value={formatPercent(metrics.garment_siglip_similarity)} note="FashionSigLIP semantic similarity to the selected product" /> : <Metric label="Garment similarity" value="Unavailable" note={metrics.garment_siglip_error || 'FashionSigLIP could not evaluate this result'} />}{metrics.overall_ssim != null ? <Metric label="Overall SSIM" value={formatPercent(metrics.overall_ssim)} note="Whole-image structural similarity to your original photo" /> : null}{metrics.person_background_ssim != null ? <Metric label="Masked background SSIM" value={formatPercent(metrics.person_background_ssim)} note="Structural preservation outside CatVTON’s edited garment mask" /> : null}{metrics.person_background_psnr_db != null ? <Metric label="Masked background PSNR" value={`${Number(metrics.person_background_psnr_db).toFixed(1)} dB`} note="Pixel preservation outside CatVTON’s edited garment mask" /> : null}</dl></section>
}

export default EvaluationMetrics
