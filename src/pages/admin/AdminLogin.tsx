import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../lib/auth'

export function AdminLogin() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!login(password)) {
      setError('Неверный пароль')
      return
    }
    nav('/admin', { replace: true })
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Админка</h1>
        <p className="muted">Доступ только для редактора карт</p>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Войти
        </button>
      </form>
    </div>
  )
}
