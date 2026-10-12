import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useSesion } from './AuthContext'
import { cerrarSesion } from './services/authService'
import { obtenerMisDatos } from './services/ciudadanoService'
import { useNavegar, type User } from './ui'
import Navbar from './Navbar'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import RegisterCitizenPage from './pages/RegisterCitizen'
import VerifyCitizenPage from './pages/VerifyCitizen'
import RegisterLawyerPage from './pages/RegisterLawyer'
import LawyerPendingPage from './pages/LawyerPending'
import ProfilePage from './pages/Profile'
import HistoryPage from './pages/History'

interface Sesion { rol: 'CIUDADANO' | 'ABOGADO' | 'ADMIN'; idUsuario: string }

function Shell() {
  const sesion = useSesion() as Sesion | null
  const navigate = useNavegar()
  const location = useLocation()
  const [perfil, setPerfil] = useState<User | null>(null)
  const [datosVersion, setDatosVersion] = useState(0)
  const [lexiSignal, setLexiSignal] = useState(0)

  // La barra muestra el nombre del ciudadano; las cuentas sin perfil muestran su rol.
  useEffect(() => {
    if (sesion?.rol !== 'CIUDADANO') return
    let activo = true
    obtenerMisDatos()
      .then((c: { nombre: string; apellido: string; mail: string }) => { if (activo) setPerfil({ nombre: c.nombre, apellido: c.apellido, email: c.mail }) })
      .catch(() => { if (activo) setPerfil(null) })
    return () => { activo = false }
  }, [sesion, datosVersion])
  const user: User | null = !sesion ? null
    : sesion.rol === 'CIUDADANO' ? perfil
    : { nombre: sesion.rol === 'ADMIN' ? 'Administrador' : 'Abogado', apellido: '', email: '' }

  function handleLogout() { cerrarSesion(); navigate('home') }

  function goToSection(id: string) {
    // Desde el inicio no se navega: subir y volver a bajar hacía saltar la página.
    if (id === 'lexi') { if (location.pathname !== '/') navigate('home'); setLexiSignal(n => n + 1); return }
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    if (location.pathname === '/') scroll()
    else { navigate('home'); setTimeout(scroll, 60) }
  }

  const ciudadano = sesion?.rol === 'CIUDADANO'

  return (
    <div className="min-h-screen bg-navy-950 text-ink">
      <Navbar navigate={navigate} user={user} onLogout={handleLogout} onSection={goToSection} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage navigate={navigate} user={user} lexiSignal={lexiSignal} onLexiHandled={() => setLexiSignal(0)} />} />
          <Route path="/iniciar-sesion" element={<LoginPage navigate={navigate} />} />
          <Route path="/admin/iniciar-sesion" element={<LoginPage navigate={navigate} admin />} />
          <Route path="/registro" element={<RegisterCitizenPage navigate={navigate} />} />
          {/* Didit vuelve a estas dos URLs al terminar la verificación. */}
          <Route path="/verificar-identidad-ciudadano" element={<VerifyCitizenPage navigate={navigate} />} />
          <Route path="/registro-abogado" element={<RegisterLawyerPage navigate={navigate} />} />
          <Route path="/cuenta-profesional" element={<LawyerPendingPage navigate={navigate} />} />
          <Route path="/mis-datos" element={ciudadano ? <ProfilePage navigate={navigate} onUpdated={() => setDatosVersion(v => v + 1)} /> : <Navigate to="/iniciar-sesion" replace />} />
          <Route path="/historial" element={sesion ? <HistoryPage navigate={navigate} /> : <Navigate to="/iniciar-sesion" replace />} />
          <Route path="/verificar-identidad" element={<Navigate to="/registro-abogado" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><BrowserRouter><Shell /></BrowserRouter></AuthProvider>
}
