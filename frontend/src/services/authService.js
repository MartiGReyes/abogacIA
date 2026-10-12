const KEY = "abogacia.sesion";
export function cerrarSesion() {
    sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event("sesion"));
}
export function obtenerSesion() {
    try {
        const sesion = JSON.parse(sessionStorage.getItem(KEY));
        if (sesion?.token && sesion.expiresAt > Date.now()) return sesion;
    } catch { /* Una sesión local inválida se descarta. */ }
    sessionStorage.removeItem(KEY);
    return null;
}
export async function iniciarSesion(mail, contrasena, tipoCuenta) {
    const response = await fetch("http://localhost:8081/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, contrasena, tipoCuenta })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión. Revisá los datos e intentá nuevamente.");
    const claims = JSON.parse(atob(data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const sesion = { ...data, expiresAt: claims.exp * 1000 };
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
        cerrarSesion();
        throw new Error("La sesión venció. Volvé a iniciar sesión.");
    }
    if (response.status === 403) throw new Error("No tenés permiso para acceder a esta cuenta.");
    return response;
}
