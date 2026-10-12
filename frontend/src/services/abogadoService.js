const BASE = import.meta.env?.VITE_ABOGADOS_URL || "http://localhost:8082";
async function enviar(ruta, datos) {
    let response;
    try {
        response = await fetch(`${BASE}/api/abogados${ruta}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
        });
    } catch { throw new Error("No se pudo conectar con el servicio de abogados."); }
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || "No se pudo completar la solicitud.");
    return resultado;
}
export const registrarAbogado = datos => enviar("", datos);
export const confirmarAbogado = (mail, codigo) => enviar("/confirmar", { mail, codigo });

const ACCESO_KEY = "abogacia-registro-temporal";
export function accesoRegistroVigente() {
    try {
        const acceso = JSON.parse(sessionStorage.getItem(ACCESO_KEY));
        if (acceso?.token && Date.parse(acceso.vence) > Date.now()) return acceso;
    } catch { /* Invalid or unavailable storage cannot authorize a request. */ }
    cerrarAccesoRegistro();
    return null;
}
export function cerrarAccesoRegistro() {
    sessionStorage.removeItem(ACCESO_KEY);
}
async function verificacion(ruta, metodo = "GET", datos, protegido = true) {
    const headers = { "Content-Type": "application/json" };
    if (protegido) {
        const acceso = accesoRegistroVigente();
        if (!acceso) throw new Error("Ingresá nuevamente para acceder a tu solicitud.");
        headers["X-Registro-Token"] = acceso.token;
    }
    let response;
    try {
        response = await fetch(`${BASE}/api/abogados/verificacion/${ruta}`, {
            method: metodo, headers, body: datos === undefined ? undefined : JSON.stringify(datos),
            cache: "no-store", referrerPolicy: "no-referrer",
        });
    } catch { throw new Error("No se pudo conectar con el servicio de abogados."); }
    const resultado = await response.json();
    if (response.status === 401 && protegido) cerrarAccesoRegistro();
    if (!response.ok) throw new Error(resultado.error || "No se pudo completar la verificación.");
    return resultado;
}
export async function accederRegistro(mail, contrasena) {
    cerrarAccesoRegistro();
    const acceso = await verificacion("acceso", "POST", { mail, contrasena }, false);
    sessionStorage.setItem(ACCESO_KEY, JSON.stringify(acceso));
    return acceso;
}
export const avisoIdentidad = () => verificacion("aviso", "GET", undefined, false);
export const estadoIdentidad = () => verificacion("estado");
export const consultarIdentidad = () => verificacion("consultar", "POST");
export const iniciarIdentidad = (consentimiento, avisoVersion) => verificacion("sesion", "POST", { consentimiento, avisoVersion });
export async function cerrarRegistroRemoto() {
    try { await verificacion("cerrar", "POST"); }
    finally { cerrarAccesoRegistro(); }
}
