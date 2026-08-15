import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapBoard } from '../../components/MapBoard'
import { modeLabel, respawnsFor } from '../../lib/arena'
import { loadCatalog, saveCatalog } from '../../lib/catalog'
import { squareAt } from '../../lib/grid'
import { uid } from '../../lib/id'
import { vehicleIcon } from '../../lib/icons'
import { getMapMeta, modeGuide, upsertModeGuide } from '../../lib/maps'
import {
  VEHICLE_TYPES,
  groupColor,
  type Catalog,
  type MapVersion,
  type Point,
  type PointGroup,
  type Resp,
  type VehicleType,
} from '../../types'

export function MapEditor() {
  const { mapId = '', modeId = 'ctf', versionId = '' } = useParams()
  const meta = getMapMeta(mapId)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const [catalog, setCatalog] = useState<Catalog>({ guides: {} })
  const [draft, setDraft] = useState<MapVersion | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [resp, setResp] = useState<Resp>(1)
  const [groupId, setGroupId] = useState('')
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [msg, setMsg] = useState('')
  const [dirty, setDirty] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupType, setNewGroupType] = useState<VehicleType>('tt')
  const [newGroupName, setNewGroupName] = useState('')

  const respawns = useMemo(() => respawnsFor(mapId, modeId), [mapId, modeId])

  useEffect(() => {
    loadCatalog().then((c) => {
      setCatalog(c)
      const guide = modeGuide(c, mapId, modeId)
      const ver = guide.versions.find((v) => v.id === versionId) || null
      const copy = ver ? structuredClone(ver) : null
      setDraft(copy)
      setDirty(false)
      if (copy?.groups[0]) setGroupId(copy.groups[0].id)
    })
  }, [mapId, modeId, versionId])

  const selected = draft?.points.find((p) => p.id === selectedPoint)
  const activeGroup = draft?.groups.find((g) => g.id === groupId)

  useEffect(() => {
    const p = draftRef.current?.points.find((x) => x.id === selectedPoint)
    setDescDraft(p?.description || '')
    if (selectedPoint) queueMicrotask(() => descRef.current?.focus())
  }, [selectedPoint])

  const visiblePoints = useMemo(
    () => (draft?.points || []).filter((p) => p.resp === resp),
    [draft, resp],
  )

  function touch(next: MapVersion) {
    setDraft(next)
    setDirty(true)
  }

  function addGroup() {
    if (!draft || !newGroupName.trim()) return
    const g: PointGroup = {
      id: uid('grp'),
      vehicleType: newGroupType,
      name: newGroupName.trim(),
    }
    touch({ ...draft, groups: [...draft.groups, g] })
    setGroupId(g.id)
    setNewGroupName('')
    setShowNewGroup(false)
    setMsg('')
  }

  function placePoint(x: number, y: number) {
    if (!draft) return
    if (!groupId) {
      setShowNewGroup(true)
      setMsg('Создай или выбери группу')
      return
    }
    applyDesc()
    const p: Point = { id: uid('pt'), groupId, resp, x, y, description: '' }
    touch({ ...draft, points: [...draft.points, p] })
    setSelectedPoint(p.id)
    setDescDraft('')
    setMsg('')
  }

  function movePoint(id: string, x: number, y: number) {
    if (!draft) return
    touch({
      ...draft,
      points: draft.points.map((p) => (p.id === id ? { ...p, x, y } : p)),
    })
  }

  function applyDesc() {
    if (!draft || !selectedPoint) return
    const cur = draft.points.find((p) => p.id === selectedPoint)
    if (!cur || descDraft === cur.description) return
    touch({
      ...draft,
      points: draft.points.map((p) =>
        p.id === selectedPoint ? { ...p, description: descDraft } : p,
      ),
    })
  }

  function selectPoint(id: string) {
    applyDesc()
    setSelectedPoint(id)
    const p = draft?.points.find((x) => x.id === id)
    if (p) setGroupId(p.groupId)
  }

  function removePoint() {
    if (!draft || !selectedPoint) return
    touch({ ...draft, points: draft.points.filter((p) => p.id !== selectedPoint) })
    setSelectedPoint(null)
    setDescDraft('')
  }

  async function saveVersion(publish = false) {
    if (!draft || !meta) return
    const now = new Date().toISOString()
    const clean: MapVersion = {
      id: draft.id,
      name: draft.name,
      createdAt: draft.createdAt,
      updatedAt: now,
      groups: draft.groups,
      points: draft.points.map((p) =>
        p.id === selectedPoint ? { ...p, description: descDraft } : p,
      ),
    }
    try {
      const guide = modeGuide(catalog, mapId, modeId)
      const versions = guide.versions.map((v) => (v.id === clean.id ? clean : v))
      const nextGuide = {
        versions,
        publishedVersionId: publish ? clean.id : guide.publishedVersionId,
      }
      const next = upsertModeGuide(catalog, mapId, modeId, nextGuide)
      await saveCatalog(next)
      setCatalog(next)
      setDraft(clean)
      setDirty(false)
      setMsg(publish ? 'Сохранено и опубликовано' : 'Версия сохранена')
    } catch (e) {
      setMsg(String(e))
    }
  }

  if (!meta) {
    return (
      <div className="stack">
        <Link to="/admin">← Карты</Link>
        <p>Карта не найдена</p>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="stack">
        <Link to={`/admin/maps/${mapId}/${modeId}`}>← Версии</Link>
        <p>Версия не найдена</p>
      </div>
    )
  }

  const selectedSq = selected ? squareAt(selected.x, selected.y) : null

  return (
    <div className="stack editor">
      <div className="row between wrap">
        <div>
          <Link to={`/admin/maps/${mapId}/${modeId}`}>← {modeLabel(modeId)}</Link>
          <h1>
            {meta.name} · {modeLabel(modeId)} · {draft.name}
          </h1>
          {dirty && <p className="muted">Есть несохранённые изменения</p>}
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => saveVersion(false)}>
            Сохранить версию
          </button>
          <button className="btn ghost" type="button" onClick={() => saveVersion(true)}>
            Сохранить и опубликовать
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <MapBoard
          image={meta.image}
          points={visiblePoints}
          groups={draft.groups}
          respawns={respawns}
          selectedId={selectedPoint}
          interactive
          onPlace={placePoint}
          onSelect={selectPoint}
          onMove={movePoint}
        />

        <aside className="panel editor-side stack">
          <div className="seg full">
            <button type="button" className={resp === 1 ? 'is-on' : ''} onClick={() => setResp(1)}>
              Респ 1
            </button>
            <button type="button" className={resp === 2 ? 'is-on' : ''} onClick={() => setResp(2)}>
              Респ 2
            </button>
          </div>

          <div>
            <div className="side-label">Группа точек</div>
            <div className="chip-row">
              {draft.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`chip ${groupId === g.id ? 'is-on' : ''}`}
                  style={{ ['--chip' as string]: groupColor(g) }}
                  onClick={() => setGroupId(g.id)}
                >
                  <img className="chip-icon" src={vehicleIcon(g.vehicleType)} alt="" />
                  {g.name}
                </button>
              ))}
              <button
                type="button"
                className={`chip ghost ${showNewGroup ? 'is-on' : ''}`}
                onClick={() => setShowNewGroup((v) => !v)}
              >
                + Группа
              </button>
            </div>

            {showNewGroup && (
              <div className="new-group">
                <div className="chip-row">
                  {VEHICLE_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`chip sm ${newGroupType === t.id ? 'is-on' : ''}`}
                      style={{ ['--chip' as string]: t.color }}
                      onClick={() => setNewGroupType(t.id)}
                    >
                      <img className="chip-icon" src={vehicleIcon(t.id)} alt="" />
                      {t.label}
                    </button>
                  ))}
                </div>
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addGroup()
                  }}
                >
                  <input
                    autoFocus
                    placeholder="Название, напр. Медленные ТТ"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <button className="btn" type="submit">
                    OK
                  </button>
                </form>
              </div>
            )}

            {!draft.groups.length && !showNewGroup && (
              <p className="muted tight">Создай группу — потом кликай по карте.</p>
            )}
            {activeGroup && (
              <p className="muted tight">
                Ставишь:{' '}
                <strong style={{ color: groupColor(activeGroup) }}>{activeGroup.name}</strong>
              </p>
            )}
          </div>

          <div className="desc-box">
            <div className="side-label">
              Описание точки
              {selectedSq ? ` · ${selectedSq}` : ''}
            </div>
            {selected ? (
              <>
                <textarea
                  ref={descRef}
                  rows={7}
                  value={descDraft}
                  onChange={(e) => {
                    setDescDraft(e.target.value)
                    setDirty(true)
                  }}
                  onBlur={applyDesc}
                  placeholder="Куда ехать, как стоять…"
                />
                <button className="btn danger" type="button" onClick={removePoint}>
                  Удалить точку
                </button>
              </>
            ) : null}
          </div>

          {msg && <p className="muted">{msg}</p>}
        </aside>
      </div>
    </div>
  )
}
