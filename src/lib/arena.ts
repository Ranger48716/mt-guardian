import arenaJson from '../data/arena_index.json'
import type { BattleModeId } from '../types'

type ArenaIndex = {
  labels: Record<string, string>
  order: BattleModeId[]
  maps: Record<string, BattleModeId[]>
}

const arena = arenaJson as ArenaIndex

export const MODE_ORDER = arena.order
export const MODE_LABELS = arena.labels

export function modesForMap(mapId: string): BattleModeId[] {
  return arena.maps?.[mapId] || []
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
