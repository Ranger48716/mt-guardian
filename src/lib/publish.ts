import type { ModeGuideData, MapVersion } from '../types'

export function publishedVersion(guide: ModeGuideData): MapVersion | null {
  return guide.versions.find((v) => v.id === guide.publishedVersionId) || null
}
