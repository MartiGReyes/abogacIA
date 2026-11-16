import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider, useSesion } from '../AuthContext'
import { cerrarSesion } from '../services/authService'
import LoginPage from '../pages/Login'
import { AdminProtegido, AdminPanel, AdminAbogados, AdminIdentidad } from '../pages/Admin'
import { AdminUsuarios, AdminPadron } from '../pages/AdminGestion'
import { useLocale } from '../i18n/useLocale'

function Workspace() {
  const navigate = useNavigate()
  const sesion = useSesion()
  return <div className="min-h-screen bg-[#f7f2e7] text-[#102247] legacy-page">
    <header className="flex justify-between gap-4 p-4"><a href="http://localhost:5173/">abogacIA</a>
      {sesion && <button className="btn btn-secondary" onClick={() => { cerrarSesion(); navigate('/admin/iniciar-sesion') }}>Cerrar sesión</button>}</header>
    <Routes>
      <Route path="/admin/iniciar-sesion" element={<LoginPage admin navigate={() => navigate('/admin')} />} />
      <Route path="/admin" element={<AdminProtegido><AdminPanel /></AdminProtegido>} />
      <Route path="/admin/abogados" element={<AdminProtegido><AdminAbogados /></AdminProtegido>} />
      <Route path="/admin/usuarios" element={<AdminProtegido><AdminUsuarios /></AdminProtegido>} />
      <Route path="/admin/padron" element={<AdminProtegido><AdminPadron /></AdminProtegido>} />
      <Route path="/admin/identidad" element={<AdminProtegido><AdminIdentidad /></AdminProtegido>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </div>
}

export default function AdminApp() {
  useLocale()
  return <AuthProvider><BrowserRouter><Workspace /></BrowserRouter></AuthProvider>
}
