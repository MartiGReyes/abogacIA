import { adminService } from './adminService.js';

// Only the latest request may publish results, even if a transport ignores abort.
/** @param {string|null} idInicial */
export function crearSelectorIdentidad(api = adminService, tipo = 'ciudadanos', idInicial = null) {
    let state = { tipo, q: '', pagina: 0, lista: { cargando: true }, seleccion: null, detalle: { cargando: false } };
    const listeners = new Set();
    let listaController, detalleController;
    const update = patch => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
    function limpiarDetalle() {
        detalleController?.abort();
        update({ seleccion: null, detalle: { cargando: false } });
    }
    async function cargarLista() {
        listaController?.abort();
        const controller = listaController = new AbortController();
        const { tipo, q, pagina } = state;
        update({ lista: { cargando: true } });
        try {
            const datos = await api[tipo]({ q, pagina, tamano: 10 }, controller.signal);
            if (!controller.signal.aborted) update({ lista: { cargando: false, datos } });
        } catch (error) {
            if (!controller.signal.aborted) update({ lista: { cargando: false, error: error.message } });
        }
    }
    async function seleccionar(cuenta) {
        detalleController?.abort();
        const controller = detalleController = new AbortController();
        const { tipo } = state;
        update({ seleccion: cuenta, detalle: { cargando: true } });
        try {
            const datos = await api.identidad(tipo, cuenta.id, controller.signal);
            if (!controller.signal.aborted) update({ detalle: { cargando: false, datos } });
        } catch (error) {
            if (!controller.signal.aborted) update({ detalle: { cargando: false, error: error.message } });
        }
    }
    return {
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        getSnapshot: () => state,
        iniciar() {
            const lista = cargarLista();
            const detalle = idInicial ? seleccionar({ id: idInicial, nombre: null, apellido: null }) : Promise.resolve();
            return Promise.all([lista, detalle]);
        },
        cambiarTipo(tipo) {
            if (!['ciudadanos', 'abogados'].includes(tipo)) throw new Error('Tipo de cuenta inválido.');
            listaController?.abort();
            limpiarDetalle();
            update({ tipo, q: '', pagina: 0, lista: { cargando: true } });
            return cargarLista();
        },
        buscar(q) { limpiarDetalle(); update({ q, pagina: 0 }); return cargarLista(); },
        pagina(pagina) { limpiarDetalle(); update({ pagina }); return cargarLista(); },
        seleccionar,
        reintentarLista: cargarLista,
        reintentarDetalle() { return state.seleccion ? seleccionar(state.seleccion) : Promise.resolve(); },
        cancelar() { listaController?.abort(); detalleController?.abort(); },
    };
}
