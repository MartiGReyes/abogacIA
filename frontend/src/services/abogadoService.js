import { crearServicioIdentidad } from "./identidadService.js";
const BASE = import.meta.env?.VITE_ABOGADOS_URL || "http://localhost:8082";
async function enviar(ruta, datos) {
    let response;
    try {
        response = await fetch(`${BASE}/api/abogados${ruta}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
        });
    } catch { throw new Error("No se pudo conectar con el servicio de abogados."); }
    const resultado = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resultado.error || "No se pudo completar la solicitud.");
    return resultado;
}
export const confirmarAbogado = (mail, codigo) => enviar("/confirmar", { mail, codigo });

export const identidadAbogado = crearServicioIdentidad(`${BASE}/api/abogados/verificacion`, "abogados", "abogacia-registro-temporal");
export const { accesoRegistroVigente, cerrarAccesoRegistro, avisoIdentidad,
    estadoIdentidad, consultarIdentidad, iniciarIdentidad, cerrarRegistroRemoto } = identidadAbogado;

/** Paso 1: DNI, correo y teléfono. Guarda el acceso temporal que sirve para Didit y para crear la cuenta. */
export const iniciarSolicitudAbogado = (dni, mail, nroCelular) => identidadAbogado.obtenerAcceso("solicitud", { dni, mail, nroCelular });
/** Paso 4: datos profesionales y contraseña. Nombre, nacimiento, género y domicilio los aporta Didit. */
export const crearCuentaAbogado = datos => identidadAbogado.enviar("cuenta", datos);
