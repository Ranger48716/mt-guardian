import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MODE_ORDER, modeLabel, modeShort, modesForMap } from '../../lib/arena'
import { loadCatalog } from '../../lib/catalog'
import { MAPS, mapHasGuides, mapThumb, modeGuide, resolveMap } from '../../lib/maps'
import type { BattleModeId, Catalog, ResolvedMap } from '../../types'

type GuideTab = 'with' | 'without'
type ModeFilter = 'all' | BattleModeId

export function AdminHome() {
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const [q, setQ] = useState('')
  const [guideTab, setGuideTab] = useState<GuideTab>('without')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ctf')

  useEffect(() => {
    loadCatalog().then(setCatalog)
  }, [])

  const all = useMemo(() => MAPS.map((m) => resolveMap(m, catalog)), [catalog])
  const withGuides = useMemo(() => all.filter(mapHasGuides), [all])
  const withoutGuides = useMemo(() => all.filter((m) => !mapHasGuides(m)), [all])

  const source = guideTab === 'with' ? withGuides : withoutGuides

  const maps = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = source
    if (modeFilter !== 'all') {
      list = list.filter((m) => modesForMap(m.id).includes(modeFilter))
    }
    if (!needle) return list
    return list.filter(
      (m) => m.name.toLowerCase().includes(needle) || m.id.toLowerCase().includes(needle),
    )
  }, [source, q, modeFilter])

  return (
    <div className="stack">
      <h1>Карты</h1>

      <div className="list-toolbar">
        <div className="seg" role="tablist" aria-label="Гайды">
          <button
            type="button"
            role="tab"
            className={guideTab === 'with' ? 'is-on' : ''}
            onClick={() => setGuideTab('with')}
          >
            С гайдами ({withGuides.length})
          </button>
          <button
            type="button"
            role="tab"
            className={guideTab === 'without' ? 'is-on' : ''}
            onClick={() => setGuideTab('without')}
          >
            Без ({withoutGuides.length})
          </button>
        </div>

        <input
          className="search toolbar-search"
          placeholder="Поиск"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mode-chip-row" role="tablist" aria-label="Режим боя">
        <button
          type="button"
          role="tab"
          className={`mode-chip ${modeFilter === 'all' ? 'is-on' : ''}`}
          onClick={() => setModeFilter('all')}
        >
          Все
        </button>
        {MODE_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            className={`mode-chip ${modeFilter === m ? 'is-on' : ''}`}
            title={modeLabel(m)}
            onClick={() => setModeFilter(m)}
          >
            {modeShort(m)}
          </button>
        ))}
      </div>

      <ul className="map-admin-list">
        {maps.map((m) => (
          <MapRow key={m.id} map={m} modeFilter={modeFilter} catalog={catalog} />
        ))}
        {!maps.length && <li className="muted empty-row">Пусто</li>}
      </ul>
    </div>
  )
}

function MapRow({
  map: m,
  modeFilter,
  catalog,
}: {
  map: ResolvedMap
  modeFilter: ModeFilter
  catalog: Catalog
}) {
  const modes = modesForMap(m.id)
  const primary = modeFilter !== 'all' && modes.includes(modeFilter) ? modeFilter : modes[0]
  const versions =
    modeFilter === 'all'
      ? modes.reduce((n, id) => n + modeGuide(catalog, m.id, id).versions.length, 0)
      : modeGuide(catalog, m.id, primary).versions.length

  return (
    <li className="map-admin-row">
      <Link className="map-admin-main" to={`/admin/maps/${m.id}/${primary}`} title={m.name}>
        <img src={`${import.meta.env.BASE_URL}${mapThumb(m)}`} alt="" loading="lazy" />
        <div className="map-admin-meta">
          <strong>{m.name}</strong>
          <span className="muted">
            {versions ? `${versions} вер.` : 'нет версий'}
          </span>
        </div>
      </Link>
      <div className="mode-badges">
        {modes.map((id) => {
          const n = modeGuide(catalog, m.id, id).versions.length
          return (
            <Link
              key={id}
              to={`/admin/maps/${m.id}/${id}`}
              className={`mode-badge ${id === modeFilter ? 'is-on' : ''} ${n ? 'has-guide' : ''}`}
              title={`${modeLabel(id)}${n ? ` · ${n}` : ''}`}
            >
              {modeShort(id)}
              {n > 0 && <em>{n}</em>}
            </Link>
          )
        })}
      </div>
    </li>
  )
}
