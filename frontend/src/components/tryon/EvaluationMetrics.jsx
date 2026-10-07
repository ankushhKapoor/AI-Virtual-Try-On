function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`
}

function Metric({ label, value, note }) {
  return <div className="rounded-md bg-canvas px-4 py-3"><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-ink">{value}</dd><p className="mt-1 text-xs leading-5 text-muted">{note}</p></div>
}

function EvaluationMetrics({ metrics, resultImage, className = '' }) {
  if (!resultImage) return null

  if (!metrics || (metrics.person_background_ssim == null && metrics.person_background_psnr_db == null)) {
    return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">Metrics are unavailable for this result. Saved looks created before evaluation was added cannot be measured accurately because their original CatVTON garment mask was not stored. For a new try-on, restart the Model API and generate the look again.</p></section>
  }

  return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">Garment similarity evaluates the generated clothing area against the selected product. Preservation metrics evaluate only the rest of the image. Higher is better, but neither score can guarantee real-world fit.</p><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.garment_siglip_similarity != null ? <Metric label="Garment similarity" value={`${(Number(metrics.garment_siglip_similarity) * 100).toFixed(1)}%`} note="FashionSigLIP semantic similarity to the selected product" /> : <Metric label="Garment similarity" value="Unavailable" note="FashionSigLIP could not evaluate this result; see Model API log" />}{metrics.person_background_ssim != null ? <Metric label="Person & background SSIM" value={formatPercent(metrics.person_background_ssim)} note="Structural similarity outside the edited clothing area" /> : null}{metrics.person_background_psnr_db != null ? <Metric label="Person & background PSNR" value={`${Number(metrics.person_background_psnr_db).toFixed(1)} dB`} note="Pixel reconstruction similarity outside the edited clothing area" /> : null}</dl></section>
}

export default EvaluationMetrics
