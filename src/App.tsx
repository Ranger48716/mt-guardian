import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminHome } from './pages/admin/AdminHome'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLogin } from './pages/admin/AdminLogin'
import { MapEditor } from './pages/admin/MapEditor'
import { MapVersions } from './pages/admin/MapVersions'
import { AppHome } from './pages/AppHome'
import { MapGuide } from './pages/MapGuide'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
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
    </BrowserRouter>
  )
}
