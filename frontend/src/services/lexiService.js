// Same-origin endpoint: the browser never connects directly to n8n.
export async function obtenerOrientacion(chatInput, { fetchImpl = globalThis.fetch, timeoutMs = 60000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl('/api/lexi/orientacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatInput }),
            signal: controller.signal,
        });
        if (!response.ok) {
            if (response.status === 404) throw new Error('El servicio de orientación no está disponible. Verificá que el workflow de Lexi esté publicado y activo.');
            if ([401, 403].includes(response.status)) throw new Error('El servicio de orientación requiere autorización.');
            throw new Error('No se pudo obtener la orientación. Podés volver a intentar.');
        }
        const data = await response.json().catch(() => null);
        if (typeof data?.orientacion !== 'string' || !data.orientacion.trim()) {
            throw new Error('El servicio devolvió una respuesta inválida. Podés volver a intentar.');
        }
        return data.orientacion.trim();
    } catch (error) {
        if (controller.signal.aborted) throw new Error('La consulta demoró demasiado. Podés volver a intentar.');
        if (error instanceof TypeError) throw new Error('No se pudo conectar con Lexi. Podés volver a intentar.');
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
