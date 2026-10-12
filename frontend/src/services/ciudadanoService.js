import { fetchAutenticado } from "./authService.js";
import { crearServicioIdentidad } from "./identidadService.js";
const API_URL = "http://localhost:8080/api/ciudadanos";

export const identidadCiudadano = crearServicioIdentidad(`${API_URL}/verificacion`, "ciudadanos", "abogacia-registro-temporal-ciudadano");

/** El backend responde {error} o, en validaciones, un mapa campo → mensaje. */
async function resultado(response, mensajePorDefecto) {
    const datos = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(datos.error || Object.values(datos)[0] || mensajePorDefecto);
    return datos;
}
async function enviar(url, opciones, mensajePorDefecto, autenticado = false) {
    let response;
    try {
        response = autenticado ? await fetchAutenticado(url, opciones) : await fetch(url, opciones);
    } catch (e) {
        if (e instanceof TypeError) throw new Error("No se pudo conectar con el servicio de ciudadanos.");
        throw e;
    }
    return resultado(response, mensajePorDefecto);
}
const json = (method, datos) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });

export const registrarCiudadano = ciudadano => enviar(API_URL, json("POST", ciudadano), "Error al registrar ciudadano");
export const confirmarRegistro = codigo => enviar(`${API_URL}/confirmar`, json("POST", { codigo }), "Error al confirmar registro");
export const obtenerMisDatos = () => enviar(`${API_URL}/me`, {}, "No se pudieron cargar tus datos.", true);
export const modificarCiudadano = (dni, ciudadano) => enviar(`${API_URL}/${dni}`, json("PUT", ciudadano), "Error al modificar tus datos", true);
export const darDeBajaCiudadano = dni => enviar(`${API_URL}/${dni}/baja`, { method: "PATCH" }, "Error al dar de baja la cuenta", true);
