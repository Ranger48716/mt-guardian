const KEY = 'mtg_admin'

export function isAuthed(): boolean {
  return sessionStorage.getItem(KEY) === '1'
}

export function login(password: string): boolean {
  const expected = import.meta.env.VITE_ADMIN_PASSWORD || 'admin'
  if (password !== expected) return false
  sessionStorage.setItem(KEY, '1')
  return true
}

export function logout(): void {
  sessionStorage.removeItem(KEY)
}
