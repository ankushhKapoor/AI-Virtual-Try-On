import { Check, Star } from 'lucide-react'
import { useState } from 'react'
import Button from './Button'

const issues = ['Blurry', 'Wrong alignment', 'Wrong color', 'Body/face issue', 'Other']

function FeedbackSection() {
  const [rating, setRating] = useState(0)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [submitted, setSubmitted] = useState(false)

  function toggleIssue(issue) {
    setSelectedIssues((current) => current.includes(issue) ? current.filter((item) => item !== issue) : [...current, issue])
    setSubmitted(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return <section className="mt-10 rounded-md border border-line bg-surface p-5 sm:p-7" aria-labelledby="feedback-heading"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Help us improve</p><h2 id="feedback-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">How was your try-on?</h2><p className="mt-2 text-sm leading-6 text-muted">Share a quick assessment of this generated look.</p></div><form onSubmit={handleSubmit} className="mt-6 space-y-6"><fieldset><legend className="text-sm font-semibold text-ink">Rate the result</legend><div className="mt-3 flex gap-1"><span className="sr-only">{rating} out of 5 stars selected</span>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => { setRating(value); setSubmitted(false) }} className="rounded-md p-1 text-[#b8893f] transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`Rate ${value} out of 5 stars`} aria-pressed={rating === value}><Star size={24} className={value <= rating ? 'fill-current' : ''} aria-hidden="true" /></button>)}</div></fieldset><fieldset><legend className="text-sm font-semibold text-ink">What could be improved?</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{issues.map((issue) => <label key={issue} className="flex cursor-pointer items-center gap-3 text-sm text-muted"><input type="checkbox" checked={selectedIssues.includes(issue)} onChange={() => toggleIssue(issue)} className="size-4 accent-[var(--color-accent)]" />{issue}</label>)}</div></fieldset><div className="flex flex-wrap items-center gap-4"><Button type="submit" size="sm" disabled={!rating && !selectedIssues.length}>Submit Feedback</Button>{submitted ? <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success" role="status"><Check size={15} aria-hidden="true" /> Thanks for your feedback.</p> : null}</div></form></section>
}

export default FeedbackSection