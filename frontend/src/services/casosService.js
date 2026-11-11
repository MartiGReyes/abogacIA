import { fetchAutenticado } from './authService.js';
const BASE = (import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082').replace(/\/+$/, '');

async function leer(response, mensaje) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || mensaje);
    return data;
}
async function enviar(ruta, method = 'GET', datos) {
    let response;
    try {
        response = await fetchAutenticado(`${BASE}/api/abogados/me/casos${ruta}`, {
            method, headers: datos ? { 'Content-Type': 'application/json' } : {},
            ...(datos ? { body: JSON.stringify(datos) } : {}),
        });
    } catch (e) {
        if (e instanceof TypeError) throw new Error('No se pudo conectar con el servicio de abogados.');
        throw e;
    }
    return leer(response, 'No se pudo guardar el caso.');
}
/** Solo los campos que acepta el backend (rechaza propiedades desconocidas). */
const cuerpo = c => ({
    titulo: c.titulo, area: c.area, descripcion: c.descripcion, situacion: c.situacion, intervencion: c.intervencion,
    resultado: c.resultado, periodo: c.periodo, imagenes: c.imagenes, publicado: c.publicado, consentimiento: c.consentimiento,
});
export const misCasos = () => enviar('');
export const crearCaso = caso => enviar('', 'POST', cuerpo(caso));
export const modificarCaso = caso => enviar(`/${caso.id}`, 'PUT', cuerpo(caso));
export const eliminarCaso = id => enviar(`/${id}`, 'DELETE');

export async function casosPublicos(idAbogado, signal) {
    let response;
    try { response = await fetch(`${BASE}/api/abogados/catalogo/${encodeURIComponent(idAbogado)}/casos`, { signal }); }
    catch { throw new Error('No se pudieron cargar los casos.'); }
    const data = await leer(response, 'No se pudieron cargar los casos.');
    return Array.isArray(data) ? data : [];
}

/** Reduce una imagen a JPEG de hasta 1280 px para guardarla junto al caso. */
export function comprimirImagen(file, lado = 1280, calidad = 0.82) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, lado / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
        img.src = url;
    });
}
