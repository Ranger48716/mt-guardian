import { useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { isAuthed, logout } from '../../lib/auth'

export function AdminLayout() {
  const nav = useNavigate()

  useEffect(() => {
    if (!isAuthed()) nav('/admin/login', { replace: true })
  }, [nav])

  if (!isAuthed()) return null

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <Link to="/admin" className="brand">
          Guardian Of Fate · Admin
        </Link>
        <div className="admin-top-actions">
          <Link to="/">Mini App</Link>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              logout()
              nav('/admin/login')
            }}
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
