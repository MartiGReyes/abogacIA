import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServicioAdmin } from './adminService.js';

test('cambios de cuenta requieren confirmación y usan POST en el servicio correcto', async () => {
  const calls = [];
  const api = crearServicioAdmin({ ciudadanos: '/c', abogados: '/a', solicitar: async (url, options) => { calls.push({ url, options }); return Response.json({ estadoCuenta: 'SUSPENDIDO' }); } });
  for (const tipo of ['ciudadanos','abogados']) await api.cambiarCuenta(tipo, 7, 'suspender', true);
  assert.equal(calls[0].url, '/c/api/admin/ciudadanos/7/suspender');
  assert.equal(calls[1].url, '/a/api/admin/abogados/7/suspender');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { confirmacion: true });
  for (const args of [['ADMIN', 7, 'suspender', true], ['ciudadanos', '../7', 'suspender', true], ['abogados',7,'baja',true], ['abogados',7,'rehabilitar',false]]) assert.throws(() => api.cambiarCuenta(...args));
  assert.equal(calls.length, 2);
});

test('carga de padrón valida archivo y confirmación; navegador define boundary multipart', async () => {
  const calls = [];
  const api = crearServicioAdmin({ abogados: '/a', solicitar: async (url, options) => { calls.push({url,options}); return Response.json({filas:1}); } });
  const archivo = new File(['synthetic'], 'padron.xlsx');
  assert.throws(() => api.actualizarPadron(archivo, false));
  assert.throws(() => api.actualizarPadron(new File(['x'], 'padron.csv'), true));
  assert.throws(() => api.actualizarPadron(new File([], 'padron.xlsx'), true));
  assert.throws(() => api.actualizarPadron({ name: 'padron.xlsx', size: 9 * 1024 * 1024 }, true));
  assert.equal(calls.length, 0);
  await api.actualizarPadron(archivo, true);
  assert.equal(calls[0].url, '/a/api/admin/abogados/padron');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers, undefined);
  assert.equal(calls[0].options.body.get('archivo').name, 'padron.xlsx');
  assert.equal(calls[0].options.body.get('confirmacion'), 'true');
});

test('errores de escritura no reintentan ni divulgan el cuerpo del backend', async () => {
  for (const status of [400,403,404,409,413,500]) {
    let calls=0;
    const api = crearServicioAdmin({solicitar: async () => { calls++; return new Response('SECRET', {status}); }});
    await assert.rejects(api.cambiarCuenta('ciudadanos',7,'suspender',true), e => !e.message.includes('SECRET'));
    assert.equal(calls,1);
  }
});
