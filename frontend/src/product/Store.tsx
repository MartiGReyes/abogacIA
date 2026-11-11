import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { ProductContext } from "./Context"
import { toLawyer, type Lawyer, type PerfilContacto, type SessionUser } from "./model"
import { useSesion } from "../AuthContext"
import { obtenerCatalogo } from "../services/contactoService.js"
import { obtenerMisDatos } from "../services/ciudadanoService.js"
import { obtenerMiPerfilAbogado } from "../services/abogadoService.js"
import { crearConversacion, inferirEspecialidad } from "../services/lexiConversation.js"
import { obtenerOrientacion } from "../services/lexiService.js"
import { obtenerRecomendaciones } from "../services/abogadoService.js"
import { guardarEnHistorial } from "../services/historialService.js"

interface Sesion {
  rol: "CIUDADANO" | "ABOGADO" | "ADMIN"
  token: string
}

/** Orientación real (n8n) y, si hay un ciudadano con sesión, copia en su historial. */
async function orientarYGuardar(texto: string) {
  const respuesta = await obtenerOrientacion(texto)
  void guardarEnHistorial(texto, respuesta, inferirEspecialidad(texto))
  return respuesta
}

function useStoreValue() {
  const sesion = useSesion() as Sesion | null
  const [perfil, setPerfil] = useState<{ nombre: string; apellido: string; mail: string; cuentaPrueba?: boolean } | null>(null)
  const [perfilVersion, setPerfilVersion] = useState(0)
  const [catalog, setCatalog] = useState<Lawyer[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [profile, setProfile] = useState<Lawyer | null>(null)
  const [contact, setContactState] = useState<Lawyer | null>(null)
  const [contactSeed, setContactSeed] = useState("")
  const [pendingContact, setPendingContact] = useState<Lawyer | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [information, setInformation] = useState<{ title: string; body: string } | null>(null)
  const [homeSection, setHomeSection] = useState("")

  // Datos de la barra de navegación: perfil del ciudadano o del abogado con sesión.
  useEffect(() => {
    if (!sesion || !["CIUDADANO", "ABOGADO"].includes(sesion.rol)) {
      setPerfil(null)
      return
    }
    let activo = true
    const datos = sesion.rol === "ABOGADO" ? obtenerMiPerfilAbogado() : obtenerMisDatos()
    datos
      .then((c: { nombre: string; apellido: string; mail: string; cuentaPrueba?: boolean }) => {
        if (activo) setPerfil(c)
      })
      .catch(() => {
        if (activo) setPerfil(null)
      })
    return () => {
      activo = false
    }
  }, [sesion, perfilVersion])

  // El catálogo depende de la sesión (las cuentas de prueba solo se ven en el entorno local).
  useEffect(() => {
    const abort = new AbortController()
    setCatalogLoading(true)
    setCatalogError("")
    obtenerCatalogo(abort.signal)
      .then((rows: PerfilContacto[]) => {
        if (!abort.signal.aborted) setCatalog(rows.map(toLawyer))
      })
      .catch((e: Error) => {
        if (!abort.signal.aborted) {
          setCatalog([])
          setCatalogError(e.message)
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setCatalogLoading(false)
      })
    return () => abort.abort()
  }, [catalogVersion, sesion?.token])

  // Una conversación nueva por sesión: no se mezclan consultas de distintas cuentas.
  const conversation = useMemo(
    () => crearConversacion(orientarYGuardar, obtenerRecomendaciones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sesion?.token],
  )

  const user: SessionUser | null = !sesion
    ? null
    : sesion.rol === "ADMIN"
      ? { nombre: "Administrador", apellido: "", email: "", role: "admin" }
      : {
          nombre: perfil?.nombre ?? (sesion.rol === "ABOGADO" ? "Abogado" : "Ciudadano"),
          apellido: perfil?.apellido ?? "",
          email: perfil?.mail ?? "",
          role: sesion.rol === "ABOGADO" ? "lawyer" : "citizen",
          cuentaPrueba: perfil?.cuentaPrueba,
        }

  const setContact = useCallback((lawyer: Lawyer | null, seed = "") => {
    setContactSeed(seed)
    setContactState(lawyer)
  }, [])

  // Retoma el contacto elegido antes de iniciar sesión.
  useEffect(() => {
    if (sesion?.rol === "CIUDADANO" && pendingContact) {
      setContactState(pendingContact)
      setPendingContact(null)
    }
  }, [sesion, pendingContact])

  useEffect(() => {
    if (!sesion) {
      setProfile(null)
      setContactState(null)
    }
  }, [sesion])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(""), 5500)
    return () => clearTimeout(id)
  }, [toast])

  return {
    sesion,
    user,
    refreshUser: () => setPerfilVersion((v) => v + 1),
    lawyers: catalog,
    catalogLoading,
    catalogError,
    reloadCatalog: () => setCatalogVersion((v) => v + 1),
    profile,
    setProfile,
    contact,
    contactSeed,
    setContact,
    pendingContact,
    setPendingContact,
    chatOpen,
    setChatOpen,
    toast,
    setToast,
    information,
    setInformation,
    homeSection,
    setHomeSection,
    conversation,
  }
}
export type ProductStore = ReturnType<typeof useStoreValue>
export function ProductProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}
export function useProduct() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error("ProductProvider is required")
  return ctx
}
