import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppHome } from './pages/AppHome'

const MapGuide = lazy(() => import('./pages/MapGuide').then((m) => ({ default: m.MapGuide })))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminHome = lazy(() => import('./pages/admin/AdminHome').then((m) => ({ default: m.AdminHome })))
const MapEditor = lazy(() => import('./pages/admin/MapEditor').then((m) => ({ default: m.MapEditor })))
const MapVersions = lazy(() => import('./pages/admin/MapVersions').then((m) => ({ default: m.MapVersions })))

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<AppHome />} />
          <Route path="/maps/:mapId" element={<MapGuide />} />
          <Route path="/maps/:mapId/:modeId" element={<MapGuide />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="maps/:mapId/:modeId" element={<MapVersions />} />
            <Route path="maps/:mapId/:modeId/versions/:versionId" element={<MapEditor />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
