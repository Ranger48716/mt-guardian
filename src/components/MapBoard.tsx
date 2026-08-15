import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { baseIcon, vehicleIcon } from '../lib/icons'
import { GRID_COLS, GRID_ROWS, GRID_ROW_COUNT, squareAt } from '../lib/grid'
import type { Point, PointGroup, RespawnMarker } from '../types'
import { groupColor } from '../types'
import './MapBoard.css'

type Props = {
  image: string
  points: Point[]
  groups: PointGroup[]
  respawns?: RespawnMarker[]
  selectedId?: string | null
  interactive?: boolean
  placeholder?: string
  activeResp?: 1 | 2
  onPlace?: (x: number, y: number) => void
  onSelect?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10))
}

export function MapBoard({
  image,
  points,
  groups,
  respawns = [],
  selectedId,
  interactive,
  placeholder,
  activeResp,
  onPlace,
  onSelect,
  onMove,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]))
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [boardOn, setBoardOn] = useState(false)

  useEffect(() => {
    const img = imgRef.current
    setBoardOn(Boolean(img?.complete && img.naturalWidth > 0))
  }, [image])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const sync = () => {
      const cell = el.clientWidth / GRID_COLS
      el.style.setProperty('--mark', `${Math.max(16, Math.round(cell / 2))}px`)
      el.style.setProperty('--resp', `${Math.max(24, Math.round(cell * 0.75))}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const vLines = Array.from({ length: GRID_COLS - 1 }, (_, i) => ((i + 1) / GRID_COLS) * 100)
  const hLines = Array.from({ length: GRID_ROW_COUNT - 1 }, (_, i) => ((i + 1) / GRID_ROW_COUNT) * 100)

  function posFromEvent(clientX: number, clientY: number) {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: clampPct(((clientX - rect.left) / rect.width) * 100),
      y: clampPct(((clientY - rect.top) / rect.height) * 100),
    }
  }

  function clickBoard(e: ReactMouseEvent<HTMLDivElement>) {
    if (!interactive || !onPlace || dragRef.current) return
    const { x, y } = posFromEvent(e.clientX, e.clientY)
    onPlace(x, y)
  }

  function onDotPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (!interactive || !onMove) {
      e.stopPropagation()
      onSelect?.(id)
      return
    }
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { id, moved: false }
    setDragId(id)
    onSelect?.(id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onDotPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || !onMove) return
    const { x, y } = posFromEvent(e.clientX, e.clientY)
    if (!drag.moved) {
      const dx = Math.abs(e.movementX)
      const dy = Math.abs(e.movementY)
      if (dx + dy < 2) return
      drag.moved = true
    }
    onMove(drag.id, x, y)
  }

  function onDotPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return
    e.stopPropagation()
    const wasDrag = dragRef.current
    dragRef.current = wasDrag.moved ? { id: wasDrag.id, moved: true } : null
    setDragId(null)
    window.setTimeout(() => {
      dragRef.current = null
    }, 0)
  }

  return (
    <div className="map-frame">
      <div className="map-axis map-axis-top" aria-hidden>
        {Array.from({ length: GRID_COLS }, (_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <div className="map-axis map-axis-left" aria-hidden>
        {[...GRID_ROWS].map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>

      <div
        ref={boardRef}
        className={`map-board ${interactive ? 'is-edit' : ''} ${dragId ? 'is-dragging' : ''}`}
        onClick={clickBoard}
      >
        <img
          ref={imgRef}
          className={boardOn ? 'is-on' : ''}
          src={`${import.meta.env.BASE_URL}${image}`}
          alt=""
          width={512}
          height={512}
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onLoad={() => setBoardOn(true)}
        />
        {placeholder && !boardOn && (
          <img
            className="map-board-ph"
            src={`${import.meta.env.BASE_URL}${placeholder}`}
            alt=""
            draggable={false}
            fetchPriority="low"
          />
        )}
        <svg className="map-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {vLines.map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={100} />
          ))}
          {hLines.map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} />
          ))}
          <rect x={0.15} y={0.15} width={99.7} height={99.7} fill="none" className="map-grid-edge" />
        </svg>

        {respawns.map((r, i) => (
          <div
            key={`r${r.team}-${r.kind}-${i}`}
            className={`map-respawn team-${r.team} kind-${r.kind}${activeResp && r.team !== activeResp ? ' is-dim' : ''}${activeResp === r.team ? ' is-on' : ''}`}
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
            title={`Респ ${r.team}${r.kind === 'base' ? ' · база' : ''}`}
          >
            <img className="map-respawn-icon" src={baseIcon(r.team)} alt="" draggable={false} />
            <span className="map-respawn-num">{r.team}</span>
          </div>
        ))}

        {points.map((p) => {
          const g = byId[p.groupId]
          if (!g) return null
          const sq = squareAt(p.x, p.y)
          const color = groupColor(g)
          const icon = vehicleIcon(g.vehicleType)
          const dim = Boolean(selectedId && selectedId !== p.id)
          return (
            <div
              key={p.id}
              data-pin={p.id}
              className={`map-mark ${selectedId === p.id ? 'is-on' : ''} ${dim ? 'is-dim' : ''} ${dragId === p.id ? 'is-drag' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <button
                type="button"
                className="map-dot"
                style={
                  {
                    '--mark-color': color,
                    '--mark-icon': `url(${icon})`,
                  } as CSSProperties
                }
                title={`${g.name} · ${sq}`}
                onPointerDown={(e) => onDotPointerDown(e, p.id)}
                onPointerMove={onDotPointerMove}
                onPointerUp={onDotPointerUp}
                onPointerCancel={onDotPointerUp}
              >
                <span className="map-dot-icon" />
              </button>
              {interactive && <span className="map-mark-sq">{sq}</span>}
            </div>
          )
        })}
      </div>

      <div className="map-axis map-axis-right" aria-hidden>
        {[...GRID_ROWS].map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      <div className="map-axis map-axis-bottom" aria-hidden>
        {Array.from({ length: GRID_COLS }, (_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
    </div>
  )
}
