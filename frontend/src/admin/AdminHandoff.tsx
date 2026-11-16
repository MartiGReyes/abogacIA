import { useLocation } from 'react-router-dom'

/** Separate origin, with no credentials or session forwarded. Deployment may be pending. */
export function AdminHandoff() {
  const { pathname } = useLocation()
  const origin = new URL(import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5174').origin
  return <main className="product-page"><h1>Administración independiente</h1>
    <p>Ingresá con tu cuenta administrativa en la aplicación de gestión.</p>
    <a className="btn btn-primary" href={`${origin}${pathname}`} rel="noreferrer">Abrir administración</a>
  </main>
}
