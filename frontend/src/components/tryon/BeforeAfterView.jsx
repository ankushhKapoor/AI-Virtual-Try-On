import { useState } from 'react'
import { MoveHorizontal } from 'lucide-react'
import ResultImagePlaceholder from './ResultImagePlaceholder'

function BeforeAfterView({ beforeImage, afterImage }) {
  const [position, setPosition] = useState(50)
  const hasBothImages = Boolean(beforeImage && afterImage)

  return (
    <section className="mt-12">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          A clear comparison
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
          Before / After
        </h2>
        <p className="mt-2 text-sm text-muted">
          Drag the slider to compare your photo with the try-on result.
        </p>
      </div>

      {hasBothImages ? (
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-md border border-line bg-[#e9e8e2] shadow-[var(--shadow-soft)]">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src={beforeImage}
              alt="Before: your uploaded photo"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <img
              src={afterImage}
              alt="After: virtual try-on result"
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            />

            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_0_12px_rgba(0,0,0,0.22)]"
              style={{ left: `calc(${position}% - 0.5px)` }}
              aria-hidden="true"
            >
              <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white text-accent shadow-lg">
                <MoveHorizontal size={20} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <span className="rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">After</span>
              <span className="rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">Before</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              aria-label="Compare before and after images"
              className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
          <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Try-On Result
            </span>
            <span className="text-xs font-semibold text-muted">
              {position}% comparison
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Your Photo
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <figure className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="aspect-[4/5] bg-canvas">
              {beforeImage ? (
                <img
                  src={beforeImage}
                  alt="Before: your uploaded photo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Photo unavailable
                </div>
              )}
            </div>
            <figcaption className="border-t border-line px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Before</p>
              <p className="mt-1 text-sm font-semibold text-ink">Your Photo</p>
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-md border border-line bg-surface">
            <ResultImagePlaceholder resultImage={afterImage} className="rounded-none border-0" />
            <figcaption className="border-t border-line px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">After</p>
              <p className="mt-1 text-sm font-semibold text-ink">Try-On Result</p>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}

export default BeforeAfterView
