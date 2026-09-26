function SectionHeading({ eyebrow, title, description, action, headingLevel = 'h2' }) {
  const Heading = headingLevel
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p> : null}
        <Heading className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{title}</Heading>
        {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export default SectionHeading
