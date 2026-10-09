function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`
}

function Metric({ label, value, note }) {
  return <div className="rounded-md bg-canvas px-4 py-3"><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-ink">{value}</dd><p className="mt-1 text-xs leading-5 text-muted">{note}</p></div>
}

function EvaluationMetrics({ metrics, resultImage, className = '' }) {
  if (!resultImage) return null

  const hasCurrentMetrics = metrics?.garment_visual_match != null || metrics?.fit_placement_plausibility != null
  const hasLegacyMetric = metrics?.garment_siglip_similarity != null

  if (!metrics || (!hasCurrentMetrics && !hasLegacyMetric)) {
    return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">Metrics are unavailable for this result. Generate the look again after restarting the Model API to receive the current product-match and fit/placement estimates.</p></section>
  }

  return <section className={`rounded-md border border-line bg-surface p-5 sm:p-6 ${className}`} aria-label="Try-on quality evaluation"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Try-On Evaluation</p><p className="mt-2 text-sm leading-6 text-muted">These evaluate the edited garment, not the unchanged background. They are AI estimates for comparing results—not proof of real-world sizing, fit, or fabric quality.</p><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.garment_visual_match != null ? <Metric label="Product appearance match" value={formatPercent(metrics.garment_visual_match)} note="Fashion semantics plus colour-palette and fine-detail distribution against the selected product" /> : <Metric label="Product appearance match" value={formatPercent(metrics.garment_siglip_similarity)} note="Legacy FashionSigLIP semantic match; regenerate for colour/detail-aware evaluation" />}{metrics.garment_detail_match != null ? <Metric label="Pattern & detail match" value={formatPercent(metrics.garment_detail_match)} note="Texture and edge-detail distribution relative to the selected product; not pixel-perfect texture verification" /> : null}{metrics.fit_placement_plausibility != null ? <Metric label="Fit & placement plausibility" value={formatPercent(metrics.fit_placement_plausibility)} note="AI estimate of whether the garment appears naturally placed on the person rather than warped or floating" /> : <Metric label="Fit & placement plausibility" value="Unavailable" note="Generate this look again to calculate the current fit/placement estimate" />}</dl></section>
}

export default EvaluationMetrics
