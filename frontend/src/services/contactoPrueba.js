// Extract text verbatim, without turning Lexi's suggestions into facts about the citizen.
function extracto(texto = '', max = 260) {
    const text = texto.trim();
    if (text.length <= max) return text;
    const fragment = text.slice(0, max);
    const corte = fragment.lastIndexOf(' ');
    return `${fragment.slice(0, corte > 0 ? corte : max)}…`;
}

export function crearBorradorContacto(consulta = '', orientacion = '') {
    return {
        nombre: '', telefono: '', descripcion: consulta,
        resumen: `Consulta del ciudadano (extracto): ${extracto(consulta)}\n\nOrientación de Lexi (extracto, no verificada): ${extracto(orientacion)}`,
    };
}

export function mensajeContacto(abogado, datos) {
    return `SIMULACIÓN — NO SE ENVÍA\nPERFIL DE PRUEBA — NO ES UN ABOGADO REAL\n\nHola ${abogado.nombre} ${abogado.apellido}. Quisiera consultar por mi caso.\n\nNombre: ${datos.nombre.trim()}\nTeléfono del ciudadano: ${datos.telefono.trim()}\n\nDescripción del caso:\n${datos.descripcion.trim()}\n\nResumen revisado por el ciudadano:\n${datos.resumen.trim()}`;
}

export function simularContacto(abogado, datos, mensajeConfirmado) {
    if (abogado.perfilPrueba !== true) throw new Error('Este contacto solo admite perfiles ficticios.');
    if (Object.values(datos).some(value => typeof value !== 'string' || !value.trim()))
        throw new Error('Completá nombre, teléfono, descripción y resumen.');
    const mensaje = mensajeContacto(abogado, datos);
    if (mensajeConfirmado !== mensaje) throw new Error('Confirmá la vista previa actual antes de simular el contacto.');
    // No network, browser navigation, recipient phone number or persistent storage.
    return { simulado: true, mensaje };
}
