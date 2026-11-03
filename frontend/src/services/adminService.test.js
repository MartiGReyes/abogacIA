import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServicioAdmin, puedeAdministrar } from './adminService.js';

test('solo una sesión ADMIN vigente habilita la navegación administrativa', () => {
    for (const rol of ['CIUDADANO', 'ABOGADO', 'admin', undefined]) {
        assert.equal(puedeAdministrar({ rol, expiresAt: Date.now() + 60000 }), false);
    }
    assert.equal(puedeAdministrar(null), false);
    assert.equal(puedeAdministrar({ rol: 'ADMIN', expiresAt: Date.now() - 1 }), false);
    assert.equal(puedeAdministrar({ rol: 'ADMIN', expiresAt: Date.now() + 60000 }), true);
});

test('consultas de lectura usan GET, no-store, filtros codificados y orígenes configurables', async () => {
    const calls = [];
    const api = crearServicioAdmin({ ciudadanos: 'http://prueba-ciudadanos/', abogados: 'http://prueba-abogados/',
        solicitar: async (url, options) => { calls.push({ url, options }); return Response.json({ total: 0 }); },
    });
    await api.indicadores('ciudadanos');
    await api.indicadores('abogados');
    await api.abogados({ q: 'Ana & Pérez', estado: 'REGISTRADO', identidad: 'APROBADA', matricula: 'VALIDADA', pagina: 2, tamano: 10, token: 'NO-INCLUIR' });
    await api.identidad('abogados', 7);
    await api.identidad('ciudadanos', 8);
    assert.equal(calls[0].url, 'http://prueba-ciudadanos/api/admin/ciudadanos/indicadores');
    assert.equal(calls[1].url, 'http://prueba-abogados/api/admin/abogados/indicadores');
    const listado = new URL(calls[2].url);
    assert.equal(listado.searchParams.get('q'), 'Ana & Pérez');
    assert.equal(listado.searchParams.get('pagina'), '2');
    assert.equal(listado.searchParams.get('tamano'), '10');
    assert.equal(listado.searchParams.has('token'), false);
    assert.equal(calls[3].url, 'http://prueba-abogados/api/admin/abogados/7/identidad');
    assert.equal(calls[4].url, 'http://prueba-ciudadanos/api/admin/ciudadanos/8/identidad');
    for (const { options } of calls) {
        assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store');
        assert.ok(options.signal instanceof AbortSignal); assert.equal(options.body, undefined);
    }
});

test('rechaza tipos e identificadores inválidos sin hacer solicitudes', () => {
    const api = crearServicioAdmin({ solicitar: () => assert.fail('No debe consultar') });
    for (const id of [-1, 0, '../indicadores', '1/identidad', '1e3', '9007199254740993']) {
        assert.throws(() => api.identidad('ciudadanos', id), /identificador/);
    }
    assert.throws(() => api.identidad('ADMIN', 1), /identificador/);
    assert.throws(() => api.indicadores('ADMIN'), /Tipo/);
});

test('errores de red, permisos, cuenta inexistente y JSON inválido son recuperables y no exponen cuerpos', async () => {
    for (const status of [403, 404, 500]) {
        const api = crearServicioAdmin({ solicitar: async () => new Response('SECRET-BACKEND', { status }) });
        await assert.rejects(api.indicadores('abogados'), error => !error.message.includes('SECRET') && /consulta|encontrada/.test(error.message));
    }
    const offline = crearServicioAdmin({ solicitar: async () => { throw new Error('SECRET-CONNECTION'); } });
    await assert.rejects(offline.indicadores('ciudadanos'), /No se pudo consultar/);
    const invalid = crearServicioAdmin({ solicitar: async () => new Response('not-json') });
    await assert.rejects(invalid.indicadores('ciudadanos'), /inválida/);
});

test('cancelación de consultas anteriores se propaga a la solicitud', async () => {
    const controller = new AbortController();
    const api = crearServicioAdmin({ solicitar: async (_, options) => {
        controller.abort();
        assert.equal(options.signal.aborted, true);
        throw new DOMException('Cancelada', 'AbortError');
    } });
    await assert.rejects(api.indicadores('ciudadanos', controller.signal), { name: 'AbortError' });
});
