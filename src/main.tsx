import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        disableVerticalSwipes?: () => void
        setHeaderColor?: (c: string) => void
        setBackgroundColor?: (c: string) => void
        BackButton?: {
          show: () => void
          hide: () => void
          onClick: (fn: () => void) => void
          offClick?: (fn: () => void) => void
        }
      }
    }
  }
}

const tg = window.Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand()
  try {
    tg.disableVerticalSwipes?.()
  } catch {
    /* ignore */
  }
  try {
    tg.setHeaderColor?.('#161111')
    tg.setBackgroundColor?.('#0C0A0A')
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
