import FeedbackSection from './FeedbackSection'
import QualityAssessment from './QualityAssessment'

const mockQuality = new URLSearchParams(window.location.search).get('quality') === 'low'
  ? { qualityScore: 42, qualityStatus: 'Needs Retry', qualityIssues: ['Image is blurry', 'Subject is partially obscured'] }
  : { qualityScore: 86, qualityStatus: 'Good', qualityIssues: ['Minor garment edge distortion', 'Slight shadow variation'] }

function TryOnQuality({ qualityScore = mockQuality.qualityScore, qualityStatus = mockQuality.qualityStatus, qualityIssues = mockQuality.qualityIssues, onTryAgain }) {
  return <section className="mt-10" aria-labelledby="try-on-quality-heading"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Review your result</p><h2 id="try-on-quality-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Try-On Quality</h2><p className="mt-2 text-sm leading-6 text-muted">Check the generated look and tell us how it turned out.</p></div><div className="space-y-5"><QualityAssessment qualityScore={qualityScore} qualityStatus={qualityStatus} qualityIssues={qualityIssues} onTryAgain={onTryAgain} /><FeedbackSection /></div></section>
}

export default TryOnQuality