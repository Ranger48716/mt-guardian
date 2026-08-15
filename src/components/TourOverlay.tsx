import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'

export function TourHelp({
  onClick,
  active,
  ref,
}: {
  onClick: () => void
  active?: boolean
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={`tour-help ${active ? 'is-tour-spot' : ''}`}
      data-tour="help"
      aria-label="Как пользоваться"
      onClick={onClick}
    >
      ?
    </button>
  )
}

type Step = { text: string }

const PAD = 8
const MARGIN = 6

function holeRect(box: DOMRect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const room = Math.min(box.left, box.top, vw - box.right, vh - box.bottom)
  const pad = Math.min(PAD, Math.max(0, room - MARGIN))
  const inset = pad === 0 ? MARGIN : 0
  return {
    top: Math.round(box.top - pad + inset),
    left: Math.round(box.left - pad + inset),
    right: Math.round(box.right + pad - inset),
    bottom: Math.round(box.bottom + pad - inset),
  }
}

function Frost({ hole }: { hole: DOMRect | null }) {
  if (!hole) return <div className="tour-frost" style={{ inset: 0 }} />
  const { top, left, right, bottom } = holeRect(hole)
  const mid = Math.max(0, bottom - top)
  const panes: ReactNode[] = []
  if (top > 0) panes.push(<div key="t" className="tour-frost" style={{ top: 0, left: 0, right: 0, height: top }} />)
  if (left > 0) panes.push(<div key="l" className="tour-frost" style={{ top, left: 0, width: left, height: mid }} />)
  if (right < window.innerWidth) {
    panes.push(<div key="r" className="tour-frost" style={{ top, left: right, right: 0, height: mid }} />)
  }
  if (bottom < window.innerHeight) {
    panes.push(<div key="b" className="tour-frost" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />)
  }
  return panes
}

function cardPos(box: DOMRect, place?: 'top' | 'bottom' | 'under' | 'above'): CSSProperties {
  if (place === 'bottom') return { left: 14, right: 14, bottom: 20, top: 'auto', width: 'auto' }
  if (place === 'above') {
    return {
      left: 14,
      right: 14,
      top: 'auto',
      bottom: Math.max(20, window.innerHeight - box.top + 12),
      width: 'auto',
    }
  }
  if (place === 'top' || place === 'under') {
    const top = Math.min(Math.max(14, box.bottom + 12), window.innerHeight - 180)
    if (place === 'top') return { left: 14, right: 14, top, width: 'auto' }
    const width = Math.min(Math.max(box.width, 260), window.innerWidth - 28)
    const left = Math.min(Math.max(box.left, 14), window.innerWidth - width - 14)
    return { top, left, width }
  }
  const gap = 14
  const width = Math.min(Math.max(box.width, 260), window.innerWidth - gap * 2)
  const left = Math.min(Math.max(box.left, gap), window.innerWidth - width - gap)
  const below = box.bottom + 12
  const top = below + 150 > window.innerHeight ? Math.max(gap, box.top - 158) : below
  return { top, left, width }
}

export function TourOverlay({
  steps,
  index,
  spot,
  place,
  preview,
  closable,
  onGo,
}: {
  steps: readonly Step[]
  index: number
  spot: DOMRect | null
  place?: 'top' | 'bottom' | 'under' | 'above'
  preview?: ReactNode
  closable?: boolean
  onGo: (n: number) => void
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewSpot, setPreviewSpot] = useState<DOMRect | null>(null)
  const hasPreview = Boolean(preview)

  useLayoutEffect(() => {
    if (!hasPreview) {
      setPreviewSpot(null)
      return
    }
    const sync = () => setPreviewSpot(previewRef.current?.getBoundingClientRect() ?? null)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [hasPreview])

  const step = steps[index - 1]
  if (!step) return null
  const last = index === steps.length
  const target = previewSpot ?? (hasPreview ? null : spot)
  const ring = target ? holeRect(target) : null

  function go(n: number) {
    if (n < 1) return
    onGo(n > steps.length ? 0 : n)
  }

  return createPortal(
    <div className="tour-layer">
      <Frost hole={hasPreview ? null : spot} />
      {preview && (
        <div ref={previewRef} className="tour-preview">
          {preview}
        </div>
      )}
      {ring && (
        <div
          className="tour-ring"
          style={{
            top: ring.top,
            left: ring.left,
            width: ring.right - ring.left,
            height: ring.bottom - ring.top,
            borderRadius:
              Math.abs(ring.right - ring.left - (ring.bottom - ring.top)) < 10 &&
              ring.right - ring.left < 56
                ? 99
                : 12,
          }}
        />
      )}
      {target && (
        <div className={`tour-card ${place === 'top' || place === 'bottom' || place === 'above' ? 'is-dock' : ''} ${closable ? 'is-close' : ''}`} style={cardPos(target, place)}>
          {closable && (
            <button type="button" className="tour-close" aria-label="Закрыть" onClick={() => onGo(0)}>
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  d="M2 2l8 8M10 2l-8 8"
                />
              </svg>
            </button>
          )}
          <p>{step.text}</p>
          <div className="tour-nav">
            <button
              type="button"
              className="tour-arrow"
              aria-label="Назад"
              disabled={index <= 1}
              onClick={() => go(index - 1)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 3.2 4.8 8 10 12.8"
                />
              </svg>
            </button>
            <div className="tour-dots">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={index === i + 1 ? 'is-on' : ''}
                  aria-label={`Шаг ${i + 1}`}
                  onClick={() => go(i + 1)}
                />
              ))}
            </div>
            <button
              type="button"
              className="tour-arrow"
              aria-label={last ? 'Готово' : 'Дальше'}
              onClick={() => go(index + 1)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 3.2 5.2 4.8L6 12.8"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
