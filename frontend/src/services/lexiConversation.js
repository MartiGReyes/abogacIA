import { obtenerOrientacion } from './lexiService.js';
import { obtenerRecomendaciones } from './abogadoService.js';

// Only the citizen's words are classified, never an AI-generated specialty or profile.
export function inferirEspecialidad(text) {
    const normalized = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const matches = [
        ['Derecho Laboral', /despid|despido|indemniz|vacacion|periodo de prueba|laboral|trabaj|sueldo|\b92\s*bis\b/],
        ['Defensa del Consumidor', /consumidor|compra|garantia|producto|servicio defectuoso/],
        ['Derecho Civil', /contrato civil|contractual civil|alquiler|arrend|derecho civil/],
    ].filter(([, pattern]) => pattern.test(normalized));
    return matches.length === 1 ? matches[0][0] : null;
}

// Shared in memory by both responsive chat views; no legal queries in persistent storage.
export function crearConversacion(orientar = obtenerOrientacion, recomendar = obtenerRecomendaciones) {
    let state = {
        msgs: [{ id: 'saludo', from: 'lexi', text: '¡Hola! Soy Lexi. Puedo ayudarte a obtener una orientación inicial sobre tu situación legal. ¿En qué puedo ayudarte hoy?' }],
        typing: false, error: '', retry: null, recomendaciones: {},
    };
    let sequence = 0;
    const listeners = new Set();
    const update = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
    async function send(value, retryId = null) {
        const text = value.trim();
        if (!text || state.typing) return;
        const id = retryId ?? `consulta-${++sequence}`;
        update({ typing: true, error: '', retry: null,
            msgs: retryId ? state.msgs : [...state.msgs, { id, from: 'user', text }] });
        try {
            const reply = await orientar(text);
            const replyId = `${id}-respuesta`;
            update({ msgs: [...state.msgs, { id: replyId, from: 'lexi', text: reply }],
                recomendaciones: { ...state.recomendaciones, [replyId]: {
                    estado: 'oferta', especialidad: inferirEspecialidad(text), abogados: [], error: '',
                    consulta: text, orientacion: reply,
                } } });
        } catch (error) {
            update({ error: error.message, retry: { text, id } });
        } finally {
            update({ typing: false });
        }
    }
    function cambiarRecomendacion(id, patch) {
        update({ recomendaciones: { ...state.recomendaciones,
            [id]: { ...state.recomendaciones[id], ...patch } } });
    }
    async function decidir(id, aceptar) {
        const current = state.recomendaciones[id];
        if (!current || !['oferta', 'error'].includes(current.estado)) return;
        if (!aceptar) { cambiarRecomendacion(id, { estado: 'rechazada', error: '' }); return; }
        cambiarRecomendacion(id, { estado: 'cargando', error: '' });
        try {
            const abogados = await recomendar(current.especialidad);
            cambiarRecomendacion(id, { estado: 'lista', abogados });
        } catch (error) {
            cambiarRecomendacion(id, { estado: 'error', error: error.message });
        }
    }
    return {
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        getSnapshot: () => state,
        send,
        decidir,
        retry() { if (state.retry) return send(state.retry.text, state.retry.id); },
    };
}
export const conversacionLexi = crearConversacion();
