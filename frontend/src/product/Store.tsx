import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
import { obtenerSesion } from "../services/authService.js"

interface Sesion {
  rol: "CIUDADANO" | "ABOGADO" | "ADMIN"
  token: string
}

/** Orientación real (n8n) y, si hay un ciudadano con sesión, copia en su historial. */
async function orientarYGuardar(texto: string) {
  const cuentaOrigen = obtenerSesion()?.token
  const respuesta = await obtenerOrientacion(texto)
  if (cuentaOrigen && obtenerSesion()?.token === cuentaOrigen) {
    void guardarEnHistorial(texto, respuesta.orientacion, inferirEspecialidad(texto))
  }
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
  const [contactLexi, setContactLexi] = useState<{ consulta: string; orientacion: string } | null>(null)
  const [pendingContact, setPendingContact] = useState<Lawyer | null>(null)
  const cuentaAnterior = useRef(sesion?.token)
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

  const profileRecommendation = useRef<string | null>(null)
  const contactRecommendation = useRef<string | null>(null)
  const pendingRecommendation = useRef<string | null>(null)
  const authorized = useCallback((id: string) => {
    const offers = conversation.getSnapshot().recomendaciones as Record<string, { mostrarAbogados?: boolean; estado: string }>
    const offer = offers[id]
    return offer?.mostrarAbogados === true && offer.estado === "lista"
  }, [conversation])
  const selectProfile = useCallback((lawyer: Lawyer | null, recommendationId?: string) => {
    if (lawyer && recommendationId && !authorized(recommendationId)) return
    profileRecommendation.current = recommendationId ?? null
    setProfile(lawyer)
  }, [authorized])
  const setContact = useCallback((lawyer: Lawyer | null, seed = "", recommendationId?: string) => {
    const source = recommendationId ?? (lawyer && profile?.id === lawyer.id ? profileRecommendation.current : null)
    if (lawyer && source && !authorized(source)) return
    contactRecommendation.current = source ?? null
    const offers = conversation.getSnapshot().recomendaciones as Record<string, { consulta?: string; orientacion?: string }>
    setContactSeed(seed || (source ? offers[source]?.consulta ?? "" : ""))
    const offer = source ? offers[source] : null
    setContactLexi(offer?.consulta && offer?.orientacion ? { consulta: offer.consulta, orientacion: offer.orientacion } : null)
    setContactState(lawyer)
  }, [authorized, profile, conversation])
  const selectPendingContact = useCallback((lawyer: Lawyer | null) => {
    const source = contactRecommendation.current ?? profileRecommendation.current
    if (lawyer && source && !authorized(source)) return
    pendingRecommendation.current = lawyer ? source : null
    setPendingContact(lawyer)
  }, [authorized])

  useEffect(() => {
    const unsubscribe = conversation.subscribe(() => {
      const invalid = [profileRecommendation.current, contactRecommendation.current, pendingRecommendation.current].some(id => id && !authorized(id))
      if (!invalid) return
      profileRecommendation.current = null
      contactRecommendation.current = null
      pendingRecommendation.current = null
      setProfile(null)
      setContactState(null)
      setContactSeed("")
      setContactLexi(null)
      setPendingContact(null)
    })
    return () => { unsubscribe() }
  }, [conversation, authorized])

  // Retoma el contacto elegido antes de iniciar sesión.
  useEffect(() => {
    if (sesion?.rol === "CIUDADANO" && pendingContact) {
      contactRecommendation.current = pendingRecommendation.current
      pendingRecommendation.current = null
      setContactState(pendingContact)
      setPendingContact(null)
    }
  }, [sesion, pendingContact])

  useEffect(() => {
    if (!sesion || (cuentaAnterior.current && cuentaAnterior.current !== sesion.token)) {
      setProfile(null)
      setContactState(null)
      setContactLexi(null)
      setContactSeed("")
      setPendingContact(null)
      setPerfil(null)
    }
    cuentaAnterior.current = sesion?.token
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
    setProfile: selectProfile,
    contact,
    contactSeed,
    contactLexi,
    setContact,
    pendingContact,
    setPendingContact: selectPendingContact,
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
