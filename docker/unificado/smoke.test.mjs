import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const password = readFileSync(new URL('../../../.private-contacto-operativo/password-cuentas.txt', import.meta.url), 'utf8').trim();
const base = 'http://localhost:5173';
async function request(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  return fetch(base + path, { method, headers: { Origin: base, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
}
async function login(mail, tipoCuenta) {
  const r = await request('/api/auth/login', { body: { mail, tipoCuenta, contrasena: password } });
  assert.equal(r.status, 200, `login ${tipoCuenta}`);
  return (await r.json()).token;
}
test('5173: cuentas, catálogo, aislamiento, casos e historial', async () => {
  const abogado = await login('abogado.prueba@abogacia.local', 'ABOGADO');
  const otro = await login('abogado.otro@abogacia.local', 'ABOGADO');
  const ciudadano = await login('ciudadano.prueba@abogacia.local', 'CIUDADANO');
  for (const [token, path] of [[abogado, '/api/abogados/me'], [abogado, '/api/abogados/me/contactos'], [ciudadano, '/api/ciudadanos/me'], [ciudadano, '/api/abogados/contactos/mios']]) {
    assert.equal((await request(path, { token })).status, 200, path);
  }
  const catalog = await request('/api/abogados/catalogo');
  assert.equal(catalog.status, 200);
  assert.ok((await catalog.json()).some(a => a.idAbogado === 961001 && a.cuentaPrueba && !a.matriculaVerificada));
  assert.equal((await request('/api/abogados/verificacion/aviso')).status, 200, 'registro principal conservado');
  assert.equal((await request('/api/abogados/me/casos')).status, 401, 'sin sesión');
  assert.equal((await request('/api/interno/abogados/validar-credenciales')).status, 404, 'API interna bloqueada');
  const forged = abogado.slice(0, -8) + 'AAAAAAAA';
  assert.equal((await request('/api/abogados/me/casos', { token: forged })).status, 401, 'firma inválida');
  let caseId, historyId;
  try {
    const created = await request('/api/abogados/me/casos', { token: abogado, body: { titulo: 'Prueba técnica de integración', area: 'Derecho Laboral', publicado: false, consentimiento: false, imagenes: [] } });
    assert.ok([200, 201].includes(created.status), `crear caso: ${created.status}`);
    caseId = (await created.json()).id;
    const otherCases = await request('/api/abogados/me/casos', { token: otro });
    assert.equal(otherCases.status, 200);
    assert.ok(!(await otherCases.json()).some(c => c.id === caseId), 'otro titular no ve el caso');
    const saved = await request('/api/ciudadanos/me/consultas-lexi', { token: ciudadano, body: { consulta: 'Prueba técnica local.', respuesta: 'Respuesta sintética de prueba, sin orientación legal.', especialidad: 'Prueba' } });
    assert.equal(saved.status, 201, 'guardar historial');
    historyId = (await saved.json()).id;
    assert.equal((await request('/api/ciudadanos/me/consultas-lexi', { token: ciudadano })).status, 200);
  } finally {
    if (caseId) assert.equal((await request(`/api/abogados/me/casos/${caseId}`, { token: abogado, method: 'DELETE' })).status, 200);
    if (historyId) assert.equal((await request(`/api/ciudadanos/me/consultas-lexi/${historyId}`, { token: ciudadano, method: 'DELETE' })).status, 200);
  }
});
