import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSelectorIdentidad } from './selectorIdentidad.js';
import { crearServicioAdmin } from './adminService.js';

const pagina = (contenido = [], total = contenido.length) => ({ contenido, total, paginas: Math.ceil(total / 10) });
const diferida = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('ciudadanos usa su endpoint con filtros permitidos y GET sin datos sensibles', async () => {
    const api = crearServicioAdmin({ ciudadanos: 'http://solo-prueba', solicitar: async (url, options) => {
        const parsed = new URL(url);
        assert.equal(parsed.pathname, '/api/admin/ciudadanos');
        assert.deepEqual(Object.fromEntries(parsed.searchParams), { q: 'Ficticio & prueba', pagina: '1', tamano: '10' });
        assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store'); assert.equal(options.body, undefined);
        return Response.json(pagina());
    } });
    await api.ciudadanos({ q: 'Ficticio & prueba', pagina: 1, tamano: 10, dni: 'NO-ENVIAR', token: 'NO-ENVIAR' });
});

test('listado, búsqueda y paginación reutilizan los servicios de cada tipo', async () => {
    const calls = [];
    const api = { ciudadanos: async filtros => { calls.push(['ciudadanos', filtros]); return pagina([], 18); },
        abogados: async filtros => { calls.push(['abogados', filtros]); return pagina([], 45); } };
    const model = crearSelectorIdentidad(api);
    await model.iniciar(); await model.pagina(1); await model.buscar('Ficticio'); await model.cambiarTipo('abogados');
    assert.deepEqual(calls, [
        ['ciudadanos', { q: '', pagina: 0, tamano: 10 }], ['ciudadanos', { q: '', pagina: 1, tamano: 10 }],
        ['ciudadanos', { q: 'Ficticio', pagina: 0, tamano: 10 }], ['abogados', { q: '', pagina: 0, tamano: 10 }],
    ]);
    assert.equal(model.getSnapshot().lista.datos.total, 45);
});

test('seleccionar otra persona limpia inmediatamente el detalle y descarta respuestas tardías', async () => {
    const first = diferida(), second = diferida(); const signals = [];
    const model = crearSelectorIdentidad({ identidad: (_, id, signal) => { signals.push(signal); return id === 1 ? first.promise : second.promise; } });
    const old = model.seleccionar({ id: 1, nombre: 'Uno' });
    const current = model.seleccionar({ id: 2, nombre: 'Dos' });
    assert.equal(signals[0].aborted, true);
    assert.equal(model.getSnapshot().seleccion.id, 2);
    assert.deepEqual(model.getSnapshot().detalle, { cargando: true });
    second.resolve({ id: 2, estadoSesion: 'In Progress' }); await current;
    first.resolve({ id: 1, estadoSesion: 'Approved' }); await old;
    assert.equal(model.getSnapshot().detalle.datos.id, 2);
});

test('cambiar de tipo cancela listado y detalle anteriores, incluso si el transporte ignora abort', async () => {
    const oldList = diferida(), oldDetail = diferida();
    const model = crearSelectorIdentidad({ ciudadanos: () => oldList.promise, abogados: async () => pagina([{ id: 9 }]), identidad: () => oldDetail.promise });
    const loading = model.iniciar(); const selected = model.seleccionar({ id: 1 });
    await model.cambiarTipo('abogados');
    oldList.resolve(pagina([{ id: 1 }])); oldDetail.reject(new Error('Error tardío')); await loading; await selected;
    assert.equal(model.getSnapshot().tipo, 'abogados');
    assert.deepEqual(model.getSnapshot().lista.datos.contenido, [{ id: 9 }]);
    assert.equal(model.getSnapshot().seleccion, null);
    assert.deepEqual(model.getSnapshot().detalle, { cargando: false });
});

test('buscar cancela la selección anterior y las respuestas de búsquedas previas', async () => {
    const old = diferida();
    const model = crearSelectorIdentidad({ ciudadanos: ({ q }) => q === 'vieja' ? old.promise : Promise.resolve(pagina([{ id: 2 }])), identidad: async () => ({ id: 1 }) });
    await model.seleccionar({ id: 1 });
    const pending = model.buscar('vieja'); await model.buscar('nueva');
    old.resolve(pagina([{ id: 1 }])); await pending;
    assert.equal(model.getSnapshot().seleccion, null);
    assert.equal(model.getSnapshot().lista.datos.contenido[0].id, 2);
});

test('errores recuperables, listado vacío y enlaces existentes con ID siguen funcionando', async () => {
    let failList = true, failDetail = true;
    const model = crearSelectorIdentidad({ abogados: async () => { if (failList) throw new Error('Sin conexión'); return pagina(); },
        identidad: async (tipo, id) => { assert.equal(tipo, 'abogados'); assert.equal(id, '5'); if (failDetail) throw new Error('Temporal'); return { id: 5, estadoSesion: 'SIN_SESION', inicio: null }; },
    }, 'abogados', '5');
    await model.iniciar();
    assert.equal(model.getSnapshot().lista.error, 'Sin conexión');
    assert.equal(model.getSnapshot().detalle.error, 'Temporal');
    failList = failDetail = false;
    await model.reintentarLista(); await model.reintentarDetalle();
    assert.deepEqual(model.getSnapshot().lista.datos.contenido, []);
    assert.equal(model.getSnapshot().detalle.datos.estadoSesion, 'SIN_SESION');
    assert.equal(model.getSnapshot().detalle.datos.inicio, null);
});

test('desmontar descarta respuestas y no publica datos después de cancelar', async () => {
    const pending = diferida(); const model = crearSelectorIdentidad({ ciudadanos: () => pending.promise });
    const request = model.iniciar(); model.cancelar(); pending.resolve(pagina([{ id: 1 }])); await request;
    assert.equal(model.getSnapshot().lista.datos, undefined);
});
