export const MENSAJES = Object.freeze({
    FUERA_DE_ALCANCE: 'No puedo responder esa consulta',
    LENGUAJE_INAPROPIADO: 'Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto',
});

export function normalizarRespuesta(data) {
    // Legacy text remains readable, but never implicitly authorizes recommendations.
    if (typeof data === 'string') data = { orientacion: data };
    if (typeof data?.orientacion !== 'string' || !data.orientacion.trim() || data.orientacion.length > 20000) {
        throw new Error('Respuesta inválida.');
    }
    if (Object.hasOwn(MENSAJES, data.estado)) return {
        orientacion: MENSAJES[data.estado], estado: data.estado, mostrarAbogados: false,
    };
    return {
        orientacion: data.orientacion.trim(),
        estado: data.estado === 'RESPONDIDA' ? 'RESPONDIDA' : null,
        mostrarAbogados: data.estado === 'RESPONDIDA' && data.mostrarAbogados === true,
    };
}
