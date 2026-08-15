import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapBoard } from '../components/MapBoard'
import { isAssaultMode, publicModeLabel, respawnsFor } from '../lib/arena'
import { loadCatalog } from '../lib/catalog'
import { squareAt } from '../lib/grid'
import { vehicleIcon } from '../lib/icons'
import { getMapMeta, modeGuide, publishedModes } from '../lib/maps'
import { publishedVersion } from '../lib/publish'
import { groupColor, type Catalog, type Point, type PointGroup, type Resp } from '../types'

function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function shortGroup(name: string) {
  return name.split(/[\\,]/)[0].trim()
}

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 860px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 860px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function MapGuide() {
  const { mapId = '', modeId = 'ctf' } = useParams()
  const nav = useNavigate()
  const meta = getMapMeta(mapId)
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const [resp, setResp] = useState<Resp>(1)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog().then(setCatalog)
  }, [])

  useEffect(() => {
    const back = window.Telegram?.WebApp?.BackButton
    if (!back) return
    const go = () => nav('/')
    try {
      back.show()
      back.onClick(go)
    } catch {
      return
    }
    return () => {
      try {
        back.offClick?.(go)
        back.hide()
      } catch {
        /* ignore */
      }
    }
  }, [nav])

  const guide = modeGuide(catalog, mapId, modeId)
  const version = publishedVersion(guide)
  const respawns = useMemo(() => respawnsFor(mapId, modeId), [mapId, modeId])
  const groups = version?.groups || []
  const currentGroup = groups.find((g) => g.id === activeGroup) || groups[0] || null
  const otherModes = publishedModes(catalog, mapId).filter((id) => id !== modeId)

  useEffect(() => {
    setActiveGroup(version?.groups[0]?.id || null)
    setSelectedId(null)
    setResp(1)
  }, [mapId, modeId, version])

  const points = useMemo(() => {
    if (!version || !currentGroup) return []
    return version.points.filter((p) => p.groupId === currentGroup.id && p.resp === resp)
  }, [version, currentGroup, resp])

  useEffect(() => {
    setSelectedId(points[0]?.id || null)
  }, [currentGroup?.id, resp, points])

  if (!meta) {
    return (
      <div className="page">
        <Link to="/">Назад</Link>
        <p>Карта не найдена</p>
      </div>
    )
  }

  const assault = isAssaultMode(modeId)

  return (
    <div className="g-page">
      <header className="g-top">
        <Link className="g-back" to="/" aria-label="К картам">
          <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
            <path fill="currentColor" d="M10.5 2.2 4.7 8l5.8 5.8 1.1-1.1L6.9 8l4.7-4.7z" />
          </svg>
        </Link>
        <div className="g-heading">
          <div className="g-title">{meta.name}</div>
          <div className="g-mode">{publicModeLabel(modeId)}</div>
        </div>
        <div className="seg sm">
          <button type="button" className={resp === 1 ? 'is-on' : ''} onClick={() => setResp(1)}>
            {assault ? 'Атака' : 'Респ 1'}
          </button>
          <button type="button" className={resp === 2 ? 'is-on' : ''} onClick={() => setResp(2)}>
            {assault ? 'Оборона' : 'Респ 2'}
          </button>
        </div>
      </header>

      {!version ? (
        <p className="muted g-pad">Гайдов нет</p>
      ) : (
        <>
          {otherModes.length > 0 && (
            <div className="mode-pills g-modes">
              <button type="button" className="is-on">
                {publicModeLabel(modeId)}
              </button>
              {otherModes.map((id) => (
                <button key={id} type="button" onClick={() => nav(`/maps/${mapId}/${id}`)}>
                  {publicModeLabel(id)}
                </button>
              ))}
            </div>
          )}

          <nav className="g-chips">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={currentGroup?.id === g.id ? 'is-on' : ''}
                title={g.name}
                style={{ ['--g' as string]: groupColor(g) }}
                onClick={() => setActiveGroup(g.id)}
              >
                <img src={vehicleIcon(g.vehicleType)} alt="" />
                {shortGroup(g.name)}
              </button>
            ))}
          </nav>

          {currentGroup && (
            <GuideStage
              image={meta.image}
              points={points}
              groups={version.groups}
              respawns={respawns}
              selectedId={selectedId}
              accent={groupColor(currentGroup)}
              onSelect={setSelectedId}
            />
          )}
        </>
      )}
    </div>
  )
}

function GuideStage({
  image,
  points,
  groups,
  respawns,
  selectedId,
  accent,
  onSelect,
}: {
  image: string
  points: Point[]
  groups: PointGroup[]
  respawns: ReturnType<typeof respawnsFor>
  selectedId: string | null
  accent: string
  onSelect: (id: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const wide = useWide()
  const selected = points.find((p) => p.id === selectedId) || null
  const selectedN = selected ? points.findIndex((p) => p.id === selected.id) + 1 : 0
  const sheetTop = (selected?.y ?? 0) >= 50

  useEffect(() => {
    const root = rootRef.current
    const svg = svgRef.current
    if (!root || !svg) return
    if (!wide) {
      svg.innerHTML = ''
      return
    }

    const draw = () => {
      const box = root.getBoundingClientRect()
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
      svg.setAttribute('width', String(box.width))
      svg.setAttribute('height', String(box.height))
      const pins = [...root.querySelectorAll<HTMLElement>('[data-pin]')]
      const notes = [...root.querySelectorAll<HTMLElement>('[data-note]')]
      const parts: string[] = []
      pins.forEach((pin) => {
        const id = pin.dataset.pin
        const note = notes.find((n) => n.dataset.note === id)
        const port = note?.querySelector<HTMLElement>('.note-port')
        if (!note || !port) return
        const a = pin.getBoundingClientRect()
        const b = port.getBoundingClientRect()
        const x1 = a.left + a.width / 2 - box.left
        const y1 = a.top + a.height / 2 - box.top
        const x2 = b.left + b.width / 2 - box.left
        const y2 = b.top + b.height / 2 - box.top
        const on = id === selectedId
        parts.push(
          `<path d="M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" fill="none" stroke="${on ? accent : hexAlpha(accent, 0.16)}" stroke-width="${on ? 1.5 : 0.9}" stroke-linecap="round" />`,
        )
      })
      svg.innerHTML = parts.join('')
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(root)
    window.addEventListener('scroll', draw, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', draw, true)
    }
  }, [points, selectedId, accent, wide])

  function stepSheet(dir: -1 | 1) {
    const i = points.findIndex((p) => p.id === selectedId)
    if (i < 0) return
    onSelect(points[(i + dir + points.length) % points.length].id)
  }

  function openNote(id: string) {
    onSelect(id)
    rootRef.current?.querySelector(`[data-note="${id}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  return (
    <div
      className={`guide-annot ${wide ? 'is-callout' : 'is-sheet'}`}
      ref={rootRef}
      style={{ ['--g' as string]: accent }}
    >
      {wide && <svg className="connectors" ref={svgRef} aria-hidden />}
      <div className="guide-map">
        <MapBoard
          image={image}
          points={points}
          groups={groups}
          respawns={respawns}
          selectedId={selectedId}
          numbered
          onSelect={openNote}
        />
        {!wide && selected && (
          <article className={`pin-sheet ${sheetTop ? 'is-top' : 'is-bottom'}`}>
            {points.length > 1 && (
              <>
                <div className="pin-sheet-dots">
                  {points.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={p.id === selected.id ? 'is-on' : ''}
                      aria-label={`Точка ${squareAt(p.x, p.y)}`}
                      onClick={() => onSelect(p.id)}
                    />
                  ))}
                </div>
                <div className="pin-sheet-bar">
                  <button
                    type="button"
                    className="pin-sheet-nav"
                    aria-label="Предыдущая"
                    onClick={() => stepSheet(-1)}
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
                  <div className="pin-sheet-n">
                    {selectedN}
                    <span>/</span>
                    {points.length}
                  </div>
                  <button
                    type="button"
                    className="pin-sheet-nav"
                    aria-label="Следующая"
                    onClick={() => stepSheet(1)}
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
              </>
            )}
            <h3 className="pin-sheet-sq">{squareAt(selected.x, selected.y)}</h3>
            <p>{selected.description}</p>
          </article>
        )}
      </div>
      {wide && (
        <ol className="notes">
          {points.length === 0 && <li className="muted">Нет точек для этого респа</li>}
          {points.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`note ${selectedId === p.id ? 'is-on' : ''}`}
                data-note={p.id}
                onClick={() => onSelect(p.id)}
              >
                <span className="note-port" aria-hidden />
                <span className="note-idx">{String(i + 1).padStart(2, '0')}</span>
                <div className="note-copy">
                  <div className="note-kicker">{squareAt(p.x, p.y)}</div>
                  <p>{p.description}</p>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
