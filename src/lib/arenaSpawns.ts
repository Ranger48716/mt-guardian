import arenaJson from '../data/arena_modes.json'
import type { RespawnMarker } from '../types'

type ModeData = {
  spawns: { '1': number[][]; '2': number[][] }
  bases: Record<string, number[]>
}

type ArenaFile = {
  maps: Record<string, { modes: Record<string, ModeData> }>
}

const arena = arenaJson as ArenaFile

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
      const same = (mode.spawns[team] || []).some(
        ([x, y]) => Math.abs(x - base[0]) < 0.2 && Math.abs(y - base[1]) < 0.2,
      )
      if (!same) out.push({ team: t, x: base[0], y: base[1], kind: 'base' })
    }
  }
  return out
}
