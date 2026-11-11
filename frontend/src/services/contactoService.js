import { fetchAutenticado, obtenerSesion } from './authService.js';
import { enlaceOperativoSeguro } from './operativaService.js';
const BASE = (import.meta.env?.VITE_ABOGADOS_URL ?? 'http://localhost:8082').replace(/\/+$/, '');
export const AVISO_CONTACTO = 'contacto-whatsapp-v1';
export function adaptarPerfil(a) {
    return { ...a, referencia: { tipo: a.perfilPrueba && !a.cuentaPrueba ? 'FICTICIO' : 'PROFESIONAL', id: String(a.idAbogado) }, contactoHabilitado: a.contactoHabilitado === true };
}
export async function obtenerCatalogo(signal) {
    const r = await (obtenerSesion() ? fetchAutenticado : fetch)(BASE+'/api/abogados/catalogo', { signal });
    if (!r.ok) throw new Error('No se pudo consultar el catálogo. Podés reintentar.');
    const data = await r.json(); if (!Array.isArray(data)) throw new Error('El catálogo devolvió una respuesta inválida.');
    return data.map(adaptarPerfil);
}
async function listarContactos(url) {
    const r = await fetchAutenticado(url, { cache: 'no-store' });
    const data = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(data)) throw new Error(data?.error || 'No se pudieron cargar las consultas.');
    return data;
}
/** Formularios de contacto que el ciudadano confirmó ("Mis consultas"). */
export const misContactos = () => listarContactos(`${BASE}/api/abogados/contactos/mios`);
/** Contactos que recibió el abogado autenticado. */
export const contactosRecibidos = () => listarContactos(`${BASE}/api/abogados/me/contactos`);
export function mensajeWhatsApp(abogado, datos) {
    const destino = `${abogado.nombre} ${abogado.apellido || ''}`.trim();
    return `Hola, ${destino}. Quisiera realizar una consulta.\n\nNombre: ${datos.nombre.trim()}\nTeléfono de contacto: ${datos.telefono.trim()}\nResumen: ${datos.resumen.trim()}`;
}
export async function prepararContacto(abogado, datos, mensajeConfirmado) {
    const r = await fetchAutenticado(`${BASE}/api/abogados/contacto/whatsapp`, {
        method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abogado: abogado.referencia, ...datos, mensajeConfirmado, consentimiento: mensajeConfirmado === mensajeWhatsApp(abogado, datos), avisoVersion: AVISO_CONTACTO }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || 'Contacto no disponible');
    if (!enlaceOperativoSeguro(body.url)) throw new Error('Contacto no disponible');
    return body;
}
