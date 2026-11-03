import { fetchAutenticado } from './authService.js';

export const puedeAdministrar = sesion => sesion?.rol === 'ADMIN' && sesion.expiresAt > Date.now();

export function crearServicioAdmin({ solicitar = fetchAutenticado,
    ciudadanos = import.meta.env?.VITE_ADMIN_CIUDADANOS_URL ?? 'http://localhost:8080',
    abogados = import.meta.env?.VITE_ADMIN_ABOGADOS_URL ?? 'http://localhost:8082' } = {}) {
    async function leer(base, ruta, signal) {
        let response;
        try {
            response = await solicitar(`${base.replace(/\/+$/, '')}/api/admin/${ruta}`, {
                method: 'GET', cache: 'no-store',
                signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
            });
        } catch (error) {
            if (signal?.aborted) throw error;
            throw new Error('No se pudo consultar el servicio administrativo. Revisá tu sesión y reintentá.');
        }
        if (!response.ok) throw new Error(response.status === 404 ? 'Cuenta no encontrada.' : 'No se pudo completar la consulta administrativa.');
        const body = await response.json().catch(() => null);
        if (!body || typeof body !== 'object') throw new Error('Respuesta administrativa inválida.');
        return body;
    }
    async function escribir(base, ruta, body, json = true) {
        let response;
        try {
            response = await solicitar(`${base.replace(/\/+$/, '')}/api/admin/${ruta}`, {
                method: 'POST', cache: 'no-store',
                ...(json ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { body }),
                signal: AbortSignal.timeout(60000),
            });
        } catch {
            throw new Error('No se pudo confirmar el resultado. Actualizá el listado o el estado del padrón antes de reintentar.');
        }
        if (!response.ok) {
            const mensajes = {
                400: 'Revisá la confirmación y el formato del archivo o la cuenta seleccionada.',
                401: 'La sesión venció. Volvé a iniciar sesión.',
                403: 'No tenés permiso para realizar esta operación.',
                404: 'Cuenta no encontrada.',
                409: 'El estado de la cuenta cambió o no permite esta operación. Actualizá el listado.',
                413: 'El archivo supera el máximo de 8 MiB.',
            };
            throw new Error(mensajes[response.status] || 'No se pudo confirmar la operación. Consultá el estado antes de reintentar.');
        }
        const data = await response.json().catch(() => null);
        if (!data || typeof data !== 'object') throw new Error('Respuesta inválida. Consultá el estado antes de reintentar.');
        return data;
    }
    function validarCuenta(tipo, id) {
        if (!['ciudadanos', 'abogados'].includes(tipo) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
            throw new Error('Ingresá un identificador de cuenta válido.');
    }
    return {
        cambiarCuenta(tipo, id, accion, confirmacion) {
            validarCuenta(tipo, id);
            if (!['suspender', 'rehabilitar'].includes(accion) || confirmacion !== true)
                throw new Error('Confirmá la operación sobre la cuenta seleccionada.');
            return escribir(tipo === 'ciudadanos' ? ciudadanos : abogados, `${tipo}/${id}/${accion}`, { confirmacion: true });
        },
        padron(signal) { return leer(abogados, 'abogados/padron', signal); },
        actualizarPadron(archivo, confirmacion) {
            if (!archivo || !/\.xlsx$/i.test(archivo.name) || archivo.size === 0 || archivo.size > 8 * 1024 * 1024)
                throw new Error('Seleccioná un archivo .xlsx de hasta 8 MiB.');
            if (confirmacion !== true) throw new Error('Confirmá el reemplazo del padrón.');
            const form = new FormData(); form.append('archivo', archivo); form.append('confirmacion', 'true');
            return escribir(abogados, 'abogados/padron', form, false);
        },
        indicadores(tipo, signal) {
            if (!['ciudadanos', 'abogados'].includes(tipo)) throw new Error('Tipo de cuenta inválido.');
            return leer(tipo === 'ciudadanos' ? ciudadanos : abogados, `${tipo}/indicadores`, signal);
        },
        abogados(filtros = {}, signal) {
            const params = new URLSearchParams();
            for (const campo of ['q', 'estado', 'identidad', 'matricula', 'pagina', 'tamano']) {
                if (filtros[campo] !== undefined && filtros[campo] !== '') params.set(campo, filtros[campo]);
            }
            return leer(abogados, `abogados?${params}`, signal);
        },
        ciudadanos(filtros = {}, signal) {
            const params = new URLSearchParams();
            for (const campo of ['q', 'pagina', 'tamano']) {
                if (filtros[campo] !== undefined && filtros[campo] !== '') params.set(campo, filtros[campo]);
            }
            return leer(ciudadanos, `ciudadanos?${params}`, signal);
        },
        identidad(tipo, id, signal) {
            if (!['ciudadanos', 'abogados'].includes(tipo) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
                throw new Error('Ingresá un identificador de cuenta válido.');
            return leer(tipo === 'ciudadanos' ? ciudadanos : abogados, `${tipo}/${id}/identidad`, signal);
        },
    };
}
export const adminService = crearServicioAdmin();
