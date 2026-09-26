import { ArrowUpRight } from 'lucide-react'

function CategoryCard({ image, name, description, onClick, visualClass = 'bg-accent-soft', className = '' }) {
  const content = (
    <>
      <div className={`aspect-[4/3] overflow-hidden bg-canvas ${visualClass}`}>
        {image ? <img src={image} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="h-full w-full bg-inherit" aria-hidden="true" />}
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h3 className="font-semibold text-ink">{name}</h3>
          {description ? <p className="mt-1 text-sm leading-5 text-muted">{description}</p> : null}
        </div>
        <ArrowUpRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </div>
    </>
  )

  return onClick ? <button type="button" onClick={onClick} className={`group block w-full overflow-hidden rounded-md border border-line bg-surface text-left transition-shadow hover:shadow-[var(--shadow-soft)] ${className}`}>{content}</button> : <article className={`group overflow-hidden rounded-md border border-line bg-surface ${className}`}>{content}</article>
}

export default CategoryCard
