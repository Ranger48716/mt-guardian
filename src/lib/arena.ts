import arenaJson from '../data/arena_modes.json'
import type { BattleModeId, RespawnMarker } from '../types'

type ModeData = {
  spawns: { '1': number[][]; '2': number[][] }
  bases: Record<string, number[]>
}

type ArenaFile = {
  labels: Record<string, string>
  order: BattleModeId[]
  maps: Record<string, { modes: Record<string, ModeData> }>
}

const arena = arenaJson as ArenaFile

export const MODE_ORDER = arena.order
export const MODE_LABELS = arena.labels

export function modesForMap(mapId: string): BattleModeId[] {
  const m = arena.maps[mapId]
  if (!m) return []
  return MODE_ORDER.filter((id) => id in m.modes)
}

export function modeLabel(id: string): string {
  return MODE_LABELS[id] || id
}

const MODE_SHORT: Record<string, string> = {
  ctf: 'Станд.',
  domination: 'Встреч.',
  assault: 'Штурм',
  assault2: 'А/О',
  domination3: 'Столкн.',
  comp7: 'Натиск',
}

export function modeShort(id: string): string {
  return MODE_SHORT[id] || modeLabel(id)
}

export const PUBLIC_MODES = [
  { id: 'ctf', label: 'Стандарт', full: 'Стандартный бой' },
  { id: 'domination', label: 'Встречный', full: 'Встречный бой' },
  { id: 'assault', label: 'Штурм', full: 'Штурм' },
  { id: 'comp7', label: 'Натиск', full: 'Натиск' },
] as const

export type PublicModeId = (typeof PUBLIC_MODES)[number]['id']

export function isAssaultMode(modeId: string): boolean {
  return modeId === 'assault' || modeId === 'assault2'
}

export function publicModeLabel(modeId: string): string {
  if (isAssaultMode(modeId)) return 'Штурм'
  return modeLabel(modeId)
}

export function clientModesForPublic(publicId: PublicModeId): BattleModeId[] {
  if (publicId === 'assault') return ['assault', 'assault2']
  return [publicId]
}

export function resolveClientMode(mapId: string, publicId: PublicModeId): BattleModeId | null {
  const have = new Set(modesForMap(mapId))
  for (const id of clientModesForPublic(publicId)) {
    if (have.has(id)) return id
  }
  return null
}

export function respawnsFor(mapId: string, modeId: string): RespawnMarker[] {
  const mode = arena.maps[mapId]?.modes[modeId]
  if (!mode) return []
  const out: RespawnMarker[] = []
  for (const team of ['1', '2'] as const) {
    const t = Number(team) as 1 | 2
    for (const [x, y] of mode.spawns[team] || []) {
      out.push({ team: t, x, y, kind: 'spawn' })
    }
    const base = mode.bases[team]
    if (base) {
      // база отдельно, если не совпадает со спавном
      const same = (mode.spawns[team] || []).some(
        ([x, y]) => Math.abs(x - base[0]) < 0.2 && Math.abs(y - base[1]) < 0.2,
      )
      if (!same) out.push({ team: t, x: base[0], y: base[1], kind: 'base' })
    }
  }
  return out
}
