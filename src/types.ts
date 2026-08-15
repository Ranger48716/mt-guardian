export type VehicleType = 'tt' | 'st' | 'pt' | 'lt' | 'sau'
export type Resp = 1 | 2
export type BattleModeId =
  | 'ctf'
  | 'domination'
  | 'assault'
  | 'assault2'
  | 'domination3'
  | 'comp7'

export const VEHICLE_TYPES: { id: VehicleType; label: string; color: string }[] = [
  { id: 'tt', label: 'ТТ', color: '#E24B2D' },
  { id: 'st', label: 'СТ', color: '#FFD166' },
  { id: 'pt', label: 'ПТ', color: '#C084FC' },
  { id: 'lt', label: 'ЛТ', color: '#7DD3FC' },
  { id: 'sau', label: 'САУ', color: '#86EFAC' },
]

export type MapMeta = {
  id: string
  name: string
  image: string
  thumb?: string
  screen?: string
  board?: string
  size?: [number, number]
}

export type PointGroup = {
  id: string
  vehicleType: VehicleType
  name: string
  color?: string
}

export type Point = {
  id: string
  groupId: string
  resp: Resp
  x: number
  y: number
  description: string
}

export type MapVersion = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  groups: PointGroup[]
  points: Point[]
}

export type ModeGuideData = {
  versions: MapVersion[]
  publishedVersionId: string | null
}

/** mapId -> modeId -> guide */
export type Catalog = {
  guides: Record<string, Record<string, ModeGuideData>>
}

export type ResolvedMap = MapMeta & {
  modes: Record<string, ModeGuideData>
}

export type RespawnMarker = {
  team: 1 | 2
  x: number
  y: number
  kind: 'spawn' | 'base'
}

export function groupColor(g: PointGroup): string {
  return g.color || VEHICLE_TYPES.find((t) => t.id === g.vehicleType)?.color || '#fff'
}

export function emptyModeGuide(): ModeGuideData {
  return { versions: [], publishedVersionId: null }
}
