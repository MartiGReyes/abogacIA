import { fetchAutenticado, obtenerSesion } from './authService.js';
const BASE = (import.meta.env?.VITE_CIUDADANOS_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const URL_HISTORIAL = `${BASE}/api/ciudadanos/me/consultas-lexi`;

async function solicitar(url, opciones, mensaje) {
    let response;
    try { response = await fetchAutenticado(url, opciones); }
    catch (e) {
        if (e instanceof TypeError) throw new Error('No se pudo conectar con el servicio de ciudadanos.');
        throw e;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || mensaje);
    return data;
}

export const listarHistorial = () => solicitar(URL_HISTORIAL, {}, 'No se pudo cargar el historial.');
export const eliminarDelHistorial = id => solicitar(`${URL_HISTORIAL}/${id}`, { method: 'DELETE' }, 'No se pudo eliminar la consulta.');

/** Guarda la consulta solo si hay un ciudadano con sesión; nunca interrumpe el chat si falla. */
export async function guardarEnHistorial(consulta, respuesta, especialidad) {
    if (obtenerSesion()?.rol !== 'CIUDADANO') return null;
    try {
        return await solicitar(URL_HISTORIAL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consulta: consulta.slice(0, 2000), respuesta: respuesta.slice(0, 20000), especialidad: especialidad ?? null }),
        }, 'No se pudo guardar la consulta.');
    } catch { return null; }
}
