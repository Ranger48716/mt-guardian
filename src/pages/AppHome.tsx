import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TourHelp, TourOverlay } from '../components/TourOverlay'
import { PUBLIC_MODES, resolveClientMode, type PublicModeId } from '../lib/arena'
import { loadCatalog } from '../lib/catalog'
import { hasPublished, PUBLIC_MAPS, mapBoard, mapCover } from '../lib/maps'
import { markOpened, openedIds } from '../lib/seen'
import { finishHomeTour, HOME_TOUR, homeTourStep, saveHomeTour, startHomeTour } from '../lib/tour'
import type { Catalog } from '../types'

const PEARL = PUBLIC_MAPS.find((m) => m.id === '60_asia_miao')

export function AppHome() {
  const [q, setQ] = useState('')
  const [onlyGuides, setOnlyGuides] = useState(true)
  const [mode, setMode] = useState<PublicModeId>('ctf')
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const [opened, setOpened] = useState(() => openedIds())
  const [hintId, setHintId] = useState<string | null>(null)
  const [tour, setTour] = useState(homeTourStep)
  const [closable, setClosable] = useState(false)
  const pillsRef = useRef<HTMLDivElement>(null)
  const switchRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLElement>(null)
  const helpRef = useRef<HTMLButtonElement>(null)
  const [spot, setSpot] = useState<DOMRect | null>(null)
  const nav = useNavigate()

  const step = HOME_TOUR[tour - 1]
  const showTour = Boolean(step)

  useEffect(() => {
    loadCatalog().then(setCatalog)
  }, [])

  useEffect(() => {
    if (!step) {
      setSpot(null)
      return
    }
    const sync = () => {
      if (step.target === 'status') {
        setSpot(null)
        return
      }
      const el = {
        modes: pillsRef.current,
        guides: switchRef.current,
        search: searchRef.current,
        maps: listRef.current,
        help: helpRef.current,
      }[step.target]
      setSpot(el?.getBoundingClientRect() ?? null)
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [step, onlyGuides, q, mode, catalog])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = PUBLIC_MAPS.map((map) => {
      const clientMode = resolveClientMode(map.id, mode)
      if (!clientMode) return null
      const guided = hasPublished(catalog, map.id, clientMode)
      return { map, clientMode, guided }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    const filtered = list.filter((row) => {
      if (onlyGuides && !row.guided) return false
      if (!needle) return true
      return row.map.name.toLowerCase().includes(needle)
    })

    return filtered.sort((a, b) => a.map.name.localeCompare(b.map.name, 'ru'))
  }, [catalog, mode, onlyGuides, q])

  const emptyGuides = onlyGuides && !q.trim() && rows.length === 0

  return (
    <div className={`app-shell ${showTour ? 'is-tour' : ''}`}>
      <div
        className="home-hero"
        style={{
          ['--hero' as string]: `url(${import.meta.env.BASE_URL}ui/hero.jpg)`,
        }}
      >
      <header className="home-top">
        <button
          ref={switchRef}
          type="button"
          className={`switch ${onlyGuides ? 'is-on' : ''} ${step?.target === 'guides' ? 'is-tour-spot' : ''}`}
          onClick={() => setOnlyGuides((v) => !v)}
          aria-pressed={onlyGuides}
        >
          <span className="switch-knob" />
          Есть гайды
        </button>
        <TourHelp
          ref={helpRef}
          active={step?.target === 'help'}
          onClick={() => {
            setClosable(true)
            setTour(startHomeTour())
          }}
        />
      </header>

      <div className="home-controls">
        <div
          ref={pillsRef}
          className={`mode-pills ${step?.target === 'modes' ? 'is-tour-spot' : ''}`}
          role="tablist"
        >
          {PUBLIC_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              title={m.full}
              className={mode === m.id ? 'is-on' : ''}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          ref={searchRef}
          className={`search ${step?.target === 'search' ? 'is-tour-spot' : ''}`}
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      </div>

      <main
        ref={listRef}
        className={`home-list ${step?.target === 'maps' ? 'is-tour-spot' : ''}`}
      >
        {rows.length === 0 ? (
          <div className="empty">
            <p>{emptyGuides ? 'Гайдов нет' : 'Ничего не найдено'}</p>
            {emptyGuides && (
              <button type="button" className="btn" onClick={() => setOnlyGuides(false)}>
                Показать все карты
              </button>
            )}
          </div>
        ) : (
          <ul className="cover-grid">
            {rows.map(({ map: m, clientMode, guided }, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`cover-card ${guided ? '' : 'is-off'} ${hintId === m.id ? 'is-hint' : ''}`}
                  onPointerDown={() => {
                    if (!guided) return
                    const pre = new Image()
                    pre.src = `${import.meta.env.BASE_URL}${mapBoard(m)}`
                  }}
                  onClick={() => {
                    if (!guided) {
                      setHintId((id) => (id === m.id ? null : m.id))
                      return
                    }
                    setOpened(markOpened(m.id))
                    nav(`/maps/${m.id}/${clientMode}`)
                  }}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${mapCover(m)}`}
                    alt=""
                    width={240}
                    height={360}
                    decoding="async"
                    sizes="(max-width: 720px) 50vw, 240px"
                    loading={i < 2 ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : 'low'}
                  />
                  {guided && !opened.has(m.id) && <span className="cover-new">Новый</span>}
                  <span className="cover-name">{m.name}</span>
                  {!guided && <span className="cover-soon">В разработке</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showTour && (
        <TourOverlay
          steps={HOME_TOUR}
          index={tour}
          spot={spot}
          place={step?.target === 'maps' || step?.target === 'status' ? 'under' : undefined}
          preview={
            step?.target === 'status' && PEARL ? (
              <article className="cover-card">
                <img
                  src={`${import.meta.env.BASE_URL}${mapCover(PEARL)}`}
                  alt=""
                  width={240}
                  height={360}
                />
                <span className="cover-new">Новый</span>
                <span className="cover-name">{PEARL.name}</span>
              </article>
            ) : null
          }
          closable={closable}
          onGo={(n) => {
            if (n === 0) setClosable(false)
            setTour(n === 0 ? finishHomeTour() : saveHomeTour(n))
          }}
        />
      )}
    </div>
  )
}
