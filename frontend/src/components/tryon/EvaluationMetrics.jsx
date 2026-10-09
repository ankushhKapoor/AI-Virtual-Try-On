function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`
}

function Metric({ label, value, note }) {
  return <div className="rounded-md bg-canvas px-4 py-3"><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-ink">{value}</dd><p className="mt-1 text-xs leading-5 text-muted">{note}</p></div>
}

function EvaluationMetrics({ metrics, resultImage, className = '' }) {
  if (!resultImage) return null

  if (!metrics || (metrics.overall_ssim == null && metrics.person_background_ssim == null)) {
    return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">Metrics are unavailable for this result. Restart the Model API and generate a new look to calculate the current evaluation summary.</p></section>
  }

  return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">SSIM checks how the generated image differs from your source photo. Whole-image SSIM includes the intended clothing change; masked SSIM checks only the preserved person/background area. LPIPS and FID require ground-truth references, so they are not estimated from the product image.</p><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.overall_ssim != null ? <Metric label="Overall SSIM" value={formatPercent(metrics.overall_ssim)} note="Whole-image structural similarity to your original photo; a clothing change naturally lowers it" /> : null}{metrics.person_background_ssim != null ? <Metric label="Masked background SSIM" value={formatPercent(metrics.person_background_ssim)} note="Structural preservation outside CatVTON’s edited garment mask" /> : null}{metrics.lpips != null ? <Metric label="LPIPS" value={Number(metrics.lpips).toFixed(4)} note="Perceptual distance to the paired ground-truth try-on image; lower is better" /> : <Metric label="LPIPS" value="Reference required" note={metrics.lpips_error || metrics.lpips_note || 'Requires a paired ground-truth try-on image'} />}{metrics.fid != null ? <Metric label="FID" value={Number(metrics.fid).toFixed(2)} note="Dataset-level realism distance; lower is better" /> : <Metric label="FID" value="Benchmark required" note={metrics.fid_note || 'Requires a generated/reference image set; it is not valid for one try-on'} />}{metrics.garment_siglip_similarity != null ? <Metric label="Garment similarity" value={formatPercent(metrics.garment_siglip_similarity)} note="FashionSigLIP semantic similarity to the selected product" /> : null}</dl></section>
}

export default EvaluationMetrics
