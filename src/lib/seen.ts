const KEY = 'gof:opened-maps'

export function openedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function markOpened(id: string): Set<string> {
  const next = openedIds()
  next.add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    /* ignore quota / private mode */
  }
  return next
}
