import { useEffect, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider, useSesion } from "./AuthContext"
import { cerrarSesion } from "./services/authService"
import { RUTAS, useNavegar, type Page } from "./ui"
import { useLocale } from "./i18n/useLocale"
import { ProductProvider, useProduct } from "./product/Store"
import { Navigation } from "./product/Navigation"
import { HomePage } from "./product/Home"
import { Dashboard } from "./product/Dashboard"
import { CitizenConsultations, ProductOverlays } from "./product/PublicExperience"
import LoginPage from "./pages/Login"
import RegisterCitizenPage from "./pages/RegisterCitizen"
import VerifyCitizenPage from "./pages/VerifyCitizen"
import RegisterLawyerPage from "./pages/RegisterLawyer"
import LawyerPendingPage from "./pages/LawyerPending"
import LawyerProfilePage from "./pages/LawyerProfile"
import ProfilePage from "./pages/Profile"
import HistoryPage from "./pages/History"
import { AdminUsuarios, AdminPadron } from "./pages/AdminGestion"
import { AdminProtegido, AdminPanel, AdminAbogados, AdminIdentidad } from "./pages/Admin"

type Rol = "CIUDADANO" | "ABOGADO" | "ADMIN"

function Solo({ rol, children }: { rol: Rol; children: ReactNode }) {
  const sesion = useSesion() as { rol: Rol } | null
  if (!sesion) return <Navigate to="/iniciar-sesion" replace />
  if (sesion.rol !== rol) return <Navigate to={sesion.rol === "ABOGADO" ? "/panel" : "/"} replace />
  return <>{children}</>
}

/** Pantallas heredadas (Didit, registro profesional, admin): mismo contenido, paleta del diseño. */
const Legacy = ({ children }: { children: ReactNode }) => <div className="legacy-page">{children}</div>

function paginaActual(pathname: string): Page | undefined {
  const entry = (Object.entries(RUTAS) as [Page, string][]).find(([, ruta]) => ruta === pathname)
  if (pathname.startsWith("/admin")) return "admin"
  return entry?.[0]
}

function Shell() {
  const store = useProduct()
  const sesion = store.sesion
  const navigate = useNavegar()
  const location = useLocation()
  const page = paginaActual(location.pathname)
  const pageForNav: Page | undefined = page === "profile" && sesion?.rol === "ABOGADO" ? "lawyer-profile" : page

  // Ir a una sección de la home desde otra pantalla (por ejemplo "Buscar abogados").
  const { homeSection, setHomeSection } = store
  useEffect(() => {
    if (location.pathname !== "/" || !homeSection) return
    const id = setTimeout(() => {
      document.getElementById(homeSection)?.scrollIntoView({ behavior: "smooth" })
      setHomeSection("")
    }, 80)
    return () => clearTimeout(id)
  }, [location.pathname, homeSection, setHomeSection])

  function handleLogout() {
    cerrarSesion()
    navigate("home")
  }

  return (
    <div className="min-h-screen bg-[#f7f2e7] text-[#102247]">
      <Navigation navigate={navigate} user={store.user} onLogout={handleLogout} page={pageForNav} />
      <div id="main-content" tabIndex={-1} className="main-anchor" />
      <ProductOverlays navigate={navigate} />
      <Routes>
        <Route path="/" element={sesion?.rol === "ABOGADO" ? <Navigate to="/panel" replace /> : <HomePage navigate={navigate} user={store.user} />} />
        <Route path="/panel" element={<Solo rol="ABOGADO"><Dashboard section="dashboard" navigate={navigate} /></Solo>} />
        <Route path="/panel/casos" element={<Solo rol="ABOGADO"><Dashboard section="cases" navigate={navigate} /></Solo>} />
        <Route path="/panel/estadisticas" element={<Solo rol="ABOGADO"><Dashboard section="statistics" navigate={navigate} /></Solo>} />
        <Route path="/dashboard-abogado/*" element={<Navigate to="/panel" replace />} />
        <Route path="/iniciar-sesion" element={<LoginPage navigate={navigate} />} />
        <Route path="/admin/iniciar-sesion" element={<LoginPage navigate={navigate} admin />} />
        <Route path="/admin" element={<Legacy><AdminProtegido><AdminPanel /></AdminProtegido></Legacy>} />
        <Route path="/admin/abogados" element={<Legacy><AdminProtegido><AdminAbogados /></AdminProtegido></Legacy>} />
        <Route path="/admin/usuarios" element={<Legacy><AdminProtegido><AdminUsuarios /></AdminProtegido></Legacy>} />
        <Route path="/admin/padron" element={<Legacy><AdminProtegido><AdminPadron /></AdminProtegido></Legacy>} />
        <Route path="/admin/identidad" element={<Legacy><AdminProtegido><AdminIdentidad /></AdminProtegido></Legacy>} />
        <Route path="/registro" element={<RegisterCitizenPage navigate={navigate} />} />
        {/* Didit vuelve a estas dos URLs al terminar la verificación. */}
        <Route path="/verificar-identidad-ciudadano" element={<Legacy><VerifyCitizenPage navigate={navigate} /></Legacy>} />
        <Route path="/registro-abogado" element={<Legacy><RegisterLawyerPage navigate={navigate} /></Legacy>} />
        <Route path="/cuenta-profesional" element={<Legacy><LawyerPendingPage navigate={navigate} /></Legacy>} />
        <Route
          path="/mis-datos"
          element={
            sesion?.rol === "CIUDADANO" ? (
              <ProfilePage navigate={navigate} onUpdated={store.refreshUser} />
            ) : sesion?.rol === "ABOGADO" ? (
              <Legacy><LawyerProfilePage navigate={navigate} onUpdated={store.refreshUser} /></Legacy>
            ) : (
              <Navigate to="/iniciar-sesion" replace />
            )
          }
        />
        <Route path="/mis-consultas" element={<Solo rol="CIUDADANO"><CitizenConsultations navigate={navigate} /></Solo>} />
        <Route path="/historial" element={<Solo rol="CIUDADANO"><HistoryPage navigate={navigate} /></Solo>} />
        <Route path="/verificar-identidad" element={<Navigate to="/registro-abogado" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  useLocale()
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProductProvider>
          <Shell />
        </ProductProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
