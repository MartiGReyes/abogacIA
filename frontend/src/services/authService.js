const KEY = "abogacia.sesion";
const cuentaKey = rol => `${KEY}.${rol}`;
const AUTH_BASE = (import.meta.env?.VITE_AUTH_URL ?? "http://localhost:8081").replace(/\/+$/, "");
export function sesionDeCuenta(rol) {
    try {
        const s = JSON.parse(sessionStorage.getItem(cuentaKey(rol)));
        return s?.rol === rol && s.token && s.expiresAt > Date.now() ? s : null;
    } catch { return null; }
}
export function usarSesionDeCuenta(rol) {
    const s = sesionDeCuenta(rol);
    if (!s) return false;
    sessionStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event('sesion'));
    return true;
}
export function cerrarSesionDeCuenta(rol) {
    if (obtenerSesion()?.rol === rol) cerrarSesion();
    sessionStorage.removeItem(cuentaKey(rol));
}
export function cerrarSesion() {
    const actual = obtenerSesion();
    if (actual?.rol) sessionStorage.removeItem(cuentaKey(actual.rol));
    sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event("sesion"));
}
export function obtenerSesion() {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const sesion = JSON.parse(sessionStorage.getItem(KEY));
        if (sesion?.token && sesion.expiresAt > Date.now()) return sesion;
    } catch { /* Una sesión local inválida se descarta. */ }
    sessionStorage.removeItem(KEY);
    return null;
}
export async function iniciarSesion(mail, contrasena, tipoCuenta) {
    const response = await fetch(`${AUTH_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, contrasena, tipoCuenta })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión. Revisá los datos e intentá nuevamente.");
    const claims = JSON.parse(atob(data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (data.rol !== tipoCuenta || (claims.rol && claims.rol !== tipoCuenta)
        || (claims.sub && claims.sub !== String(data.idUsuario))
        || (claims.cuenta && claims.cuenta !== `${tipoCuenta}:${data.idUsuario}`)) {
        throw new Error("El servicio devolvió una cuenta distinta de la solicitada.");
    }
    const sesion = { ...data, expiresAt: claims.exp * 1000 };
    sessionStorage.setItem(cuentaKey(tipoCuenta), JSON.stringify(sesion));
    sessionStorage.setItem(KEY, JSON.stringify(sesion));
    window.dispatchEvent(new Event("sesion"));
    return sesion;
}
export async function fetchAutenticado(url, options = {}) {
    const sesion = obtenerSesion();
    if (!sesion) {
        cerrarSesion();
        throw new Error("Iniciá sesión para continuar.");
    }
    const response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${sesion.token}` }
    });
    if (response.status === 401) {
        // An old request must not log out a different account selected in the meantime.
        const actual = obtenerSesion();
        if (actual?.token === sesion.token) cerrarSesion();
        else if (sessionStorage.getItem(cuentaKey(sesion.rol)) === JSON.stringify(sesion)) sessionStorage.removeItem(cuentaKey(sesion.rol));
        throw new Error("La sesión venció. Volvé a iniciar sesión.");
    }
    if (response.status === 403) throw new Error("No tenés permiso para acceder a esta cuenta.");
    return response;
}
