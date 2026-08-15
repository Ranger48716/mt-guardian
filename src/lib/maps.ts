import mapsJson from '../data/maps.json'
import { modesForMap } from './arena'
import type { Catalog, MapMeta, ModeGuideData, ResolvedMap } from '../types'
import { emptyModeGuide } from '../types'

const HIDDEN_PUBLIC_IDS = new Set([
  '251_br_battle_city3',
  '14_siegfried_line_nom',
  '250_br_battle_city2-1',
  '280_cosmic_2026',
  '108_normandy_nom',
  '252_br_battle_city4',
  '83_kharkiv',
])

export const MAPS: MapMeta[] = (mapsJson as MapMeta[]).filter((m) => modesForMap(m.id).length > 0)

export const PUBLIC_MAPS = MAPS.filter((m) => !HIDDEN_PUBLIC_IDS.has(m.id))

export function getMapMeta(id: string): MapMeta | undefined {
  return MAPS.find((m) => m.id === id) || (mapsJson as MapMeta[]).find((m) => m.id === id)
}

export function resolveMap(meta: MapMeta, catalog: Catalog): ResolvedMap {
  return { ...meta, modes: catalog.guides[meta.id] || {} }
}

export function modeGuide(catalog: Catalog, mapId: string, modeId: string): ModeGuideData {
  return catalog.guides[mapId]?.[modeId] || emptyModeGuide()
}

export function upsertModeGuide(
  catalog: Catalog,
  mapId: string,
  modeId: string,
  guide: ModeGuideData,
): Catalog {
  const mapGuides = { ...(catalog.guides[mapId] || {}), [modeId]: guide }
  return { guides: { ...catalog.guides, [mapId]: mapGuides } }
}

export function mapHasGuides(map: ResolvedMap): boolean {
  return Object.values(map.modes).some((g) => g.versions.length > 0)
}

export function mapGuideCount(map: ResolvedMap): number {
  return Object.values(map.modes).reduce((n, g) => n + g.versions.length, 0)
}

export function resolvePublished(catalog: Catalog): { map: ResolvedMap; modeId: string }[] {
  const out: { map: ResolvedMap; modeId: string }[] = []
  for (const meta of MAPS) {
    const map = resolveMap(meta, catalog)
    for (const [modeId, g] of Object.entries(map.modes)) {
      if (g.publishedVersionId) out.push({ map, modeId })
    }
  }
  return out
}

export function mapThumb(m: { image: string; thumb?: string }): string {
  return m.thumb || m.image
}

/** Загрузочный экран для списка карт; mmap — только fallback. */
export function mapCover(m: { image: string; thumb?: string; screen?: string }): string {
  return m.screen || m.thumb || m.image
}

export function mapBoard(m: { image: string; board?: string }): string {
  return m.board || m.image
}

export function hasPublished(catalog: Catalog, mapId: string, modeId: string): boolean {
  return Boolean(modeGuide(catalog, mapId, modeId).publishedVersionId)
}

export function publishedModes(catalog: Catalog, mapId: string): string[] {
  const modes = catalog.guides[mapId] || {}
  return Object.entries(modes)
    .filter(([, g]) => g.publishedVersionId)
    .map(([id]) => id)
}
