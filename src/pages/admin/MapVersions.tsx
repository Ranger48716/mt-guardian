import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { MapBoard } from '../../components/MapBoard'
import { modeLabel, modesForMap } from '../../lib/arena'
import { respawnsFor } from '../../lib/arenaSpawns'
import { loadCatalog, saveCatalog } from '../../lib/catalog'
import { uid } from '../../lib/id'
import { getMapMeta, modeGuide, upsertModeGuide } from '../../lib/maps'
import type { Catalog, MapVersion } from '../../types'

export function MapVersions() {
  const { mapId = '', modeId = '' } = useParams()
  const nav = useNavigate()
  const meta = getMapMeta(mapId)
  const modes = useMemo(() => modesForMap(mapId), [mapId])
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadCatalog().then(setCatalog)
  }, [mapId, modeId])

  const guide = modeGuide(catalog, mapId, modeId)
  const respawns = useMemo(() => respawnsFor(mapId, modeId), [mapId, modeId])

  if (!meta) {
    return (
      <div className="stack">
        <Link to="/admin">← Карты</Link>
        <p>Карта не найдена</p>
      </div>
    )
  }

  if (!modes.includes(modeId as (typeof modes)[number])) {
    const fallback = modes[0]
    if (!fallback) {
      return (
        <div className="stack">
          <Link to="/admin">← Карты</Link>
          <p>Для карты нет режимов</p>
        </div>
      )
    }
    return <Navigate to={`/admin/maps/${mapId}/${fallback}`} replace />
  }

  async function createVersion() {
    setBusy(true)
    setMsg('')
    try {
      const now = new Date().toISOString()
      const current = modeGuide(catalog, mapId, modeId)
      const version: MapVersion = {
        id: uid('ver'),
        name: name.trim() || `v${current.versions.length + 1}`,
        createdAt: now,
        updatedAt: now,
        groups: [],
        points: [],
      }
      const nextGuide = { ...current, versions: [...current.versions, version] }
      const next = upsertModeGuide(catalog, mapId, modeId, nextGuide)
      await saveCatalog(next)
      setCatalog(next)
      nav(`/admin/maps/${mapId}/${modeId}/versions/${version.id}`)
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function publish(versionId: string) {
    try {
      const current = modeGuide(catalog, mapId, modeId)
      const next = upsertModeGuide(catalog, mapId, modeId, {
        ...current,
        publishedVersionId: versionId,
      })
      await saveCatalog(next)
      setCatalog(next)
      setMsg('Версия опубликована')
    } catch (e) {
      setMsg(String(e))
    }
  }

  return (
    <div className="stack">
      <Link to="/admin">← Карты</Link>
      <div className="row between wrap">
        <div>
          <h1>{meta.name}</h1>
          <p className="muted">
            {meta.id} · {modeLabel(modeId)}
          </p>
        </div>
      </div>

      <MapBoard image={meta.image} points={[]} groups={[]} respawns={respawns} />

      <section className="panel">
        <h2>Новая версия</h2>
        <div className="row wrap">
          <input
            placeholder="Название версии, напр. v1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="button" disabled={busy} onClick={createVersion}>
            Создать версию
          </button>
        </div>
      </section>

      <section className="panel stack">
        <h2>Гайды режима</h2>
        {!guide.versions.length && <p className="muted">Пока нет версий для этого режима</p>}
        <ul className="version-list">
          {guide.versions.map((v) => (
            <li key={v.id}>
              <div>
                <strong>{v.name}</strong>
                <span className="muted">
                  {guide.publishedVersionId === v.id ? 'published · ' : ''}
                  точек: {v.points.length}
                </span>
              </div>
              <div className="row">
                <Link className="btn" to={`/admin/maps/${mapId}/${modeId}/versions/${v.id}`}>
                  Редактор
                </Link>
                <button className="btn ghost" type="button" onClick={() => publish(v.id)}>
                  Опубликовать
                </button>
              </div>
            </li>
          ))}
        </ul>
        {msg && <p className="muted">{msg}</p>}
      </section>
    </div>
  )
}
