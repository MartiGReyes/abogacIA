import { fetchAutenticado, obtenerSesion } from './authService.js';
const BASE = (import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082').replace(/\/+$/, '');
export const FOTO_CAMBIADA = 'abogacia-foto-perfil';
export const fotoPublicaUrl = id => /^\d+$/.test(String(id)) ? `${BASE}/api/abogados/catalogo/${id}/foto` : '';
export async function obtenerFotoPropia(signal) {
    const response = await fetchAutenticado(`${BASE}/api/abogados/me/foto`, { signal, cache: 'no-store' });
    if ([404, 503].includes(response.status)) return null;
    if (!response.ok) throw new Error('No pudimos consultar la foto.');
    return response.blob();
}
export async function guardarFoto(file) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Usá JPEG, PNG o WebP de hasta 5 MB.');
    const body = new FormData(); body.append('foto', file);
    return cambiar('PUT', body);
}
export const eliminarFoto = () => cambiar('DELETE');
async function cambiar(method, body) {
    const token = obtenerSesion()?.token;
    const response = await fetchAutenticado(`${BASE}/api/abogados/me/foto`, { method, body });
    if (!response.ok) throw new Error(response.status === 413 ? 'La foto debe pesar hasta 5 MB.' : response.status === 503 ? 'Las fotos no están disponibles. Intentá nuevamente más tarde.' : 'No pudimos guardar el cambio. Usá una imagen JPEG, PNG o WebP válida de hasta 16 megapíxeles.');
    if (obtenerSesion()?.token !== token) throw new Error('La cuenta cambió. Volvé a consultar tu perfil.');
    window.dispatchEvent(new Event(FOTO_CAMBIADA));
}
