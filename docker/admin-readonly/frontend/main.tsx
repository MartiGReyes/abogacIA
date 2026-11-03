// Copied into frontend/src only inside the isolated image build.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useSesion } from './AuthContext'
import { cerrarSesion } from './services/authService'
import { useNavegar } from './ui'
import LoginPage from './pages/Login'
import { AdminProtegido, AdminPanel, AdminAbogados, AdminIdentidad } from './pages/Admin'
import { AdminUsuarios, AdminPadron } from './pages/AdminGestion'
import './index.css'

function PruebaAdministrativa() {
  const navigate = useNavegar()
  const sesion = useSesion()
  return <div className="min-h-screen bg-navy-950 text-ink">
    <header className="fixed inset-x-0 top-0 z-50 bg-navy-900 border-b border-line px-5 py-3 flex items-center justify-between gap-3">
      <p className="font-semibold text-gold-400">EP06 · ENTORNO AISLADO · DATOS FICTICIOS</p>
      {sesion && <button className="btn btn-secondary btn-sm" onClick={() => { cerrarSesion(); navigate('home') }}>Cerrar sesión</button>}
    </header>
    <Routes>
      <Route path="/admin/iniciar-sesion" element={<LoginPage navigate={navigate} admin />} />
      <Route path="/admin" element={<AdminProtegido><AdminPanel /></AdminProtegido>} />
      <Route path="/admin/abogados" element={<AdminProtegido><AdminAbogados /></AdminProtegido>} />
      <Route path="/admin/usuarios" element={<AdminProtegido><AdminUsuarios /></AdminProtegido>} />
      <Route path="/admin/padron" element={<AdminProtegido><AdminPadron /></AdminProtegido>} />
      <Route path="/admin/identidad" element={<AdminProtegido><AdminIdentidad /></AdminProtegido>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><BrowserRouter><PruebaAdministrativa /></BrowserRouter></AuthProvider></StrictMode>)
