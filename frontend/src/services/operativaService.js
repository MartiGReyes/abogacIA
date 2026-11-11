export const AVISO_OPERATIVO = 'operativa-v1';
export async function apiOperativa(ruta, datos, signal) {
    const response = await fetch(`/api/pruebas-operativas/${ruta}`, {
        method: datos === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal,
        headers: datos === undefined ? {} : { 'Content-Type': 'application/json' },
        ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error || 'No se pudo completar la operación privada.');
        error.status = response.status;
        throw error;
    }
    return body;
}
export function mensajeOperativo({ nombre = '', telefono = '', resumen = '' }) {
    return 'Prueba operativa de abogacIA — contacto técnico.\n'
        + (nombre.trim() ? `Nombre: ${nombre.trim()}\n` : '')
        + (telefono.trim() ? `Teléfono de contacto: ${telefono.trim()}\n` : '')
        + `Resumen revisado: ${resumen.trim()}`;
}
export function enlaceOperativoSeguro(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname === 'wa.me' && !parsed.port
            && !parsed.username && !parsed.password && /^\/549[1-9]\d{9}$/.test(parsed.pathname)
            && parsed.searchParams.size === 1 && parsed.searchParams.has('text') && !parsed.hash;
    } catch { return false; }
}
