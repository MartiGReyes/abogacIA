import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoPublicaUrl, guardarFoto, eliminarFoto, obtenerFotoPropia } from './fotoPerfilService.js';
let session = { token: 'synthetic-owner', rol: 'ABOGADO', expiresAt: Date.now() + 60000 };
globalThis.sessionStorage = { getItem: () => JSON.stringify(session), removeItem() {} };
globalThis.window = new EventTarget();
test('URL pública no permite rutas ni destinos arbitrarios', () => {
  assert.match(fotoPublicaUrl(12), /\/catalogo\/12\/foto$/);
  for (const value of ['../../secreto', 'https://external.test', '-1', '1?otro=2']) assert.equal(fotoPublicaUrl(value), '');
});
test('subida usa multipart autenticado sin forzar JSON y eliminación usa la ruta propia', async () => {
  const old = globalThis.fetch; let count = 0;
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/me\/foto$/); assert.equal(options.headers.Authorization, 'Bearer synthetic-owner');
    assert.equal(options.headers['Content-Type'], undefined);
    if (count++ === 0) { assert.equal(options.method, 'PUT'); assert.ok(options.body instanceof FormData); assert.equal(options.body.get('foto').name, 'prueba.png'); }
    else assert.equal(options.method, 'DELETE');
    return new Response(null, { status: 204 });
  };
  try { await guardarFoto(new File(['synthetic'], 'prueba.png', { type: 'image/png' })); await eliminarFoto(); assert.equal(count, 2); }
  finally { globalThis.fetch = old; }
});
test('errores y fotos ausentes no se interpretan como imágenes', async () => {
  const old = globalThis.fetch;
  try { globalThis.fetch = async () => new Response(null, { status: 404 }); assert.equal(await obtenerFotoPropia(), null);
    globalThis.fetch = async () => new Response(null, { status: 413 }); await assert.rejects(guardarFoto(new File(['x'], 'x.png', { type: 'image/png' })), /5 MB/);
  } finally { globalThis.fetch = old; }
});
test('una respuesta de otra sesión no anuncia un cambio de foto a la cuenta activa', async () => {
  const old = globalThis.fetch, previous = session; let notified = false; const handler = () => { notified = true; }; window.addEventListener('abogacia-foto-perfil', handler);
  globalThis.fetch = async () => { session = { ...session, token: 'synthetic-other' }; return new Response(null, { status: 204 }); };
  try { await assert.rejects(eliminarFoto(), /cuenta cambió/); assert.equal(notified, false); }
  finally { session = previous; globalThis.fetch = old; window.removeEventListener('abogacia-foto-perfil', handler); }
});
