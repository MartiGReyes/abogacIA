import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { consultarDashboard, periodoDashboard } from './dashboardAbogadoService.js';
beforeEach(() => {
    const valores = new Map();
    globalThis.sessionStorage = { getItem: k => valores.get(k), setItem: (k, v) => valores.set(k, v), removeItem: k => valores.delete(k) };
    globalThis.window = { dispatchEvent() {} };
    sessionStorage.setItem('abogacia.sesion', JSON.stringify({ token: 'synthetic', expiresAt: Date.now() + 60000 }));
});
test('últimos 30 días incluye hoy y los 29 anteriores', () => {
    assert.deepEqual(periodoDashboard('30', new Date('2026-11-10T15:00:00Z')), { desde: '2026-10-12', hasta: '2026-11-10' });
});
test('restar meses conserva último día válido', () => {
    assert.deepEqual(periodoDashboard('6', new Date('2026-08-31T15:00:00Z')), { desde: '2026-02-28', hasta: '2026-08-31' });
});
test('usa JWT y filtros sin ID libre de abogado', async () => {
    globalThis.fetch = async (url, options) => {
        assert.match(url, /\/me\/dashboard\/resumen\?desde=2026-01-01/);
        assert.equal(options.headers.Authorization, 'Bearer synthetic');
        return Response.json({ aceptadas: 0 });
    };
    assert.deepEqual(await consultarDashboard('resumen', { desde: '2026-01-01' }), { aceptadas: 0 });
});
test('un error nunca se convierte en métricas cero', async () => {
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(consultarDashboard('resumen'), /No pudimos consultar/);
});
test('rechaza recursos arbitrarios antes de consultar', async () => {
    globalThis.fetch = () => assert.fail('No debe llamar a la red');
    await assert.rejects(consultarDashboard('../../admin'), /inválida/);
});
test('propaga cancelación de consultas anteriores', async () => {
    const controller = new AbortController();
    globalThis.fetch = async (_, options) => { assert.equal(options.signal, controller.signal); throw new DOMException('Abortado', 'AbortError'); };
    await assert.rejects(consultarDashboard('resumen', {}, controller.signal), { name: 'AbortError' });
});
