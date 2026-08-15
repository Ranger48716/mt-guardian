import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PUBLIC_MODES, resolveClientMode, type PublicModeId } from '../lib/arena'
import { loadCatalog } from '../lib/catalog'
import { hasPublished, PUBLIC_MAPS, mapCover } from '../lib/maps'
import type { Catalog } from '../types'

export function AppHome() {
  const [q, setQ] = useState('')
  const [onlyGuides, setOnlyGuides] = useState(true)
  const [mode, setMode] = useState<PublicModeId>('ctf')
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const nav = useNavigate()

  useEffect(() => {
    loadCatalog().then(setCatalog)
  }, [])

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
    <div className="app-shell">
      <div
        className="home-hero"
        style={{
          ['--hero' as string]: `url(${import.meta.env.BASE_URL}ui/hero.jpg)`,
        }}
      >
      <header className="home-top">
        <div className="brand">Guardian Of Fate</div>
        <button
          type="button"
          className={`switch ${onlyGuides ? 'is-on' : ''}`}
          onClick={() => setOnlyGuides((v) => !v)}
          aria-pressed={onlyGuides}
        >
          <span className="switch-knob" />
          Есть гайды
        </button>
      </header>

      <div className="home-controls">
        <div className="mode-pills" role="tablist">
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
          className="search"
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      </div>

      <main className="home-list">
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
                  className={`cover-card ${guided ? '' : 'is-off'}`}
                  disabled={!guided}
                  onClick={() => guided && nav(`/maps/${m.id}/${clientMode}`)}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${mapCover(m)}`}
                    alt=""
                    width={480}
                    height={300}
                    decoding="async"
                    loading={i < 4 ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : 'low'}
                  />
                  <span className="cover-name">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

    </div>
  )
}
