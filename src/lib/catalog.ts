import type { Catalog } from '../types'

const empty: Catalog = { guides: {} }

let cache: Promise<Catalog> | null = null

/** Миграция старого формата { guides: { mapId: { versions, published } } } */
function normalize(raw: unknown): Catalog {
  if (!raw || typeof raw !== 'object') return empty
  const guides = (raw as { guides?: Record<string, unknown> }).guides
  if (!guides) return empty

  const out: Catalog = { guides: {} }
  for (const [mapId, val] of Object.entries(guides)) {
    if (!val || typeof val !== 'object') continue
    if ('versions' in val) {
      out.guides[mapId] = { ctf: val as Catalog['guides'][string][string] }
    } else {
      out.guides[mapId] = val as Catalog['guides'][string]
    }
  }
  return out
}

export function loadCatalog(): Promise<Catalog> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
      .then(async (res) => {
        if (!res.ok) return empty
        return normalize(await res.json())
      })
      .catch(() => empty)
  }
  return cache
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  const res = await fetch('/api/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalog, null, 2),
  })
  if (!res.ok) throw new Error('Не удалось сохранить. Запусти npm run dev.')
  cache = Promise.resolve(catalog)
}
