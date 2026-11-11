import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
const base = 'http://127.0.0.1:5181';
let uno, dos, vacio;
async function login(n) {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mail: `abogado${n}.dashboard@example.com`, contrasena: 'Dashboard-Prueba-2026!', tipoCuenta: 'ABOGADO' }) });
    assert.equal(r.status, 200, `login sintético ${n}`);
    return (await r.json()).token;
}
async function get(path, token = uno, query = '') {
    return fetch(`${base}/api/abogados/me/dashboard/${path}${query ? '?' + query : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
async function data(path, token = uno, query = '') { const r = await get(path, token, query); assert.equal(r.status, 200, path); assert.match(r.headers.get('cache-control'), /no-store/); return r.json(); }
before(async () => { uno = await login(1); dos = await login(2); vacio = await login(3); });
test('conteos, promedios e ingresos salen de PostgreSQL sin multiplicar filas', async () => {
    const r = await data('resumen');
    assert.equal(r.aceptadas, 2); assert.equal(r.finalizados, 1);
    assert.equal(Number(r.valoraciones.promedio), 4); assert.equal(r.valoraciones.cantidad, 2);
    assert.equal(Number(r.historico.find(f => f.moneda === 'ARS').total), 25000);
    assert.equal(Number(r.historico.find(f => f.moneda === 'USD').total), 25);
    assert.equal(Number(r.periodo.find(f => f.moneda === 'ARS').total), 20000);
});
test('agrupación por área cuenta cada asesoramiento una vez', async () => {
    const r = await data('por-area'); assert.equal(r.length, 2);
    assert.ok(r.every(f => Number(f.cantidad) === 1 && Number(f.porcentaje) === 50));
    const filtrado = await data('resumen', uno, 'area=Derecho%20Laboral'); assert.equal(filtrado.aceptadas, 1); assert.equal(filtrado.finalizados, 0);
});
test('series de tiempo y cobros mensuales no incluyen importes pendientes ni ajenos', async () => {
    const r = await data('por-periodo'); assert.equal(r.length, 30);
    assert.equal(r.reduce((n, f) => n + Number(f.inicios), 0), 2);
    assert.equal(r.reduce((n, f) => n + Number(f.finalizados), 0), 1);
    const m = await data('ingresos/mensuales'); assert.equal(m.serie.length, 12);
    assert.equal(m.serie.reduce((n, f) => n + Number(f.total), 0), 25000);
});
test('listados, finalizados, ingresos por caso y cuotas iguales legítimas', async () => {
    const a = await data('solicitudes'); assert.equal(a.total, 2);
    const f = await data('asesoramientos', uno, 'estado=FINALIZADO&fechaBase=finalizacion'); assert.equal(f.total, 1);
    const p = await data('ingresos/por-asesoramiento', uno, 'orden=importe'); assert.equal(p.total, 1); assert.equal(Number(p.contenido[0].total), 20000);
    const cuotas = await data('asesoramientos/1/pagos'); assert.equal(cuotas.total, 3); // dos cuotas ARS + USD
    const detalle = await data('asesoramientos/1'); assert.equal(detalle.id, 1); assert.equal(Number(detalle.ingresos.find(f => f.moneda === 'ARS').total), 20000);
});
test('todos los recursos aíslan al segundo abogado y no exponen datos personales', async () => {
    assert.equal((await data('resumen', dos)).aceptadas, 1);
    assert.equal(Number((await data('valoraciones', dos)).promedio), 1);
    assert.equal((await data('por-area', dos)).reduce((n, f) => n + Number(f.cantidad), 0), 1);
    assert.equal((await data('por-periodo', dos)).reduce((n, f) => n + Number(f.inicios), 0), 1);
    assert.deepEqual((await data('asesoramientos', dos)).contenido.map(f => f.id), [4]);
    assert.equal(Number((await data('ingresos/por-asesoramiento', dos)).contenido[0].total), 999999);
    assert.equal((await data('ingresos/mensuales', dos)).serie.reduce((n, f) => n + Number(f.total), 0), 999999);
    for (const ruta of ['asesoramientos/1', 'asesoramientos/1/pagos']) assert.equal((await get(ruta, dos)).status, 404);
    for (const ruta of ['resumen', 'solicitudes', 'asesoramientos', 'por-area', 'por-periodo', 'valoraciones', 'ingresos/mensuales', 'ingresos/por-asesoramiento']) {
        assert.equal((await get(ruta, null)).status, 401);
    }
    const listado = await data('asesoramientos'); assert.ok(!JSON.stringify(listado).includes('dni'));
});
test('JWT de otro rol, vencido, emisor incorrecto y titular inválido se rechazan', async () => {
    const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
    const secret = Buffer.from(env.match(/^DASHBOARD_JWT_SECRET=(.+)$/m)[1].trim(), 'base64');
    const encode = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const sign = c => { const body = `${encode({ alg: 'HS256' })}.${encode(c)}`; return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`; };
    const claims = { iss: 'abogacia-auth', sub: '1', rol: 'ABOGADO', exp: Math.floor(Date.now() / 1000) + 300 };
    for (const rol of ['CIUDADANO', 'ADMIN']) assert.equal((await get('resumen', sign({ ...claims, rol }))).status, 403);
    assert.equal((await get('resumen', sign({ ...claims, sub: 'no-numerico' }))).status, 403);
    assert.equal((await get('resumen', sign({ ...claims, exp: 1 }))).status, 401);
    assert.equal((await get('resumen', sign({ ...claims, iss: 'otro' }))).status, 401);
    assert.equal((await get('resumen', uno + 'x')).status, 401);
});
test('filtros, paginación y períodos vacíos', async () => {
    const r = await data('asesoramientos', uno, 'tamano=1&pagina=1'); assert.equal(r.total, 2); assert.equal(r.contenido.length, 1);
    assert.equal((await get('resumen', uno, 'desde=2026-02-30')).status, 400);
    assert.equal((await get('asesoramientos', uno, 'orden=drop%20table')).status, 400);
    const vacias = await data('resumen', uno, 'desde=2020-01-01&hasta=2020-01-31'); assert.equal(vacias.aceptadas, 0); assert.equal(vacias.finalizados, 0);
});
test('cuenta sin actividad devuelve estados vacíos y promedio nulo', async () => {
    const r = await data('resumen', vacio); assert.equal(r.aceptadas, 0); assert.equal(r.finalizados, 0);
    assert.equal(r.valoraciones.promedio, null); assert.equal(r.valoraciones.cantidad, 0); assert.deepEqual(r.historico, []);
    assert.equal((await data('asesoramientos', vacio)).total, 0);
    assert.equal((await data('ingresos/mensuales', vacio)).variacion, null);
});
