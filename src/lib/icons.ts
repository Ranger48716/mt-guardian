import type { VehicleType } from '../types'

const BASE = import.meta.env.BASE_URL

export function vehicleIcon(type: VehicleType): string {
  return `${BASE}icons/vehicle/${type}.png`
}

export function baseIcon(team: 1 | 2): string {
  return `${BASE}icons/base/team${team}_base.png`
}
