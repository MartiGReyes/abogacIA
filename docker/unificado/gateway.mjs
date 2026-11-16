import http from 'node:http';
import { normalizarRespuesta } from './lexiContract.mjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
const publicOrigin = new URL(process.env.ABOGACIA_PUBLIC_ORIGIN || 'http://localhost:5173');
const localHosts = ['localhost', '127.0.0.1'].map(host => `${host}:${publicOrigin.port || '80'}`);
const localOrigins = localHosts.map(host => `http://${host}`);

const testMails = new Set(['abogado.prueba@abogacia.local', 'abogado.otro@abogacia.local', 'ciudadano.prueba@abogacia.local']);
// The habitual gateway must not depend on, or merge data from, isolated services.
const isolatedRouting = process.env.ABOGACIA_ISOLATED_ROUTING_ENABLED === 'true';
const testKey = isolatedRouting ? Buffer.from(process.env.OP_JWT_SECRET, 'base64') : Buffer.alloc(0);
function testSession(authorization = '') {
  if (!isolatedRouting) return false;
  try {
    const [header, payload, signature] = authorization.replace(/^Bearer /, '').split('.');
    const actual = Buffer.from(signature, 'base64url');
    const expected = createHmac('sha256', testKey).update(`${header}.${payload}`).digest();
    const claims = JSON.parse(Buffer.from(payload, 'base64url'));
    return JSON.parse(Buffer.from(header, 'base64url')).alg === 'HS256'
      && actual.length === expected.length && timingSafeEqual(actual, expected)
      && claims.iss === 'abogacia-auth' && claims.exp * 1000 > Date.now();
  } catch { return false; }
}
async function upstream(req, body, target, test = false) {
  const headers = { ...req.headers };
  for (const key of ['host', 'connection', 'content-length', 'transfer-encoding']) delete headers[key];
  if (test) {
    headers.host = 'localhost:5182';
    if (headers.origin && target === 'abogados-operativa:8082') headers.origin = 'http://localhost:5182';
  }
  // Native HTTP preserves the explicit Host required by the isolated runtime.
  return new Promise((resolve, reject) => {
    const outgoing = http.request(`http://${target}${req.url}`, { method: req.method, headers }, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => resolve(new Response(
        [204, 304].includes(incoming.statusCode) ? null : Buffer.concat(chunks),
        { status: incoming.statusCode, headers: { 'content-type': incoming.headers['content-type'] || 'application/json' } },
      )));
    });
    outgoing.setTimeout(70000, () => outgoing.destroy(new Error('Upstream timeout')));
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
http.createServer(async (req, res) => {
  try {
    if (!localHosts.includes(req.headers.host)) return send(res, 403, { error: 'Acceso local exclusivo.' });
    if (req.headers.origin && !localOrigins.includes(req.headers.origin)) return send(res, 403, { error: 'Origen no permitido.' });
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/interno/') || path.startsWith('/api/pruebas-operativas/') || path.startsWith('/api/abogados/desarrollo/')) return send(res, 404, {});
    const chunks = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 8_000_000) return send(res, 413, { error: 'Solicitud demasiado grande.' });
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    let test = testSession(req.headers.authorization);
    if (path === '/api/auth/login' && req.method === 'POST') {
      let login;
      try { login = JSON.parse(body); } catch { return send(res, 400, {}); }
      test = isolatedRouting && testMails.has(String(login.mail).trim().toLowerCase());
    }
    // Both catalogs retain their explicit test markers. IDs are reserved by the existing fixtures.
    if (isolatedRouting && req.method === 'GET' && ['/api/abogados/catalogo', '/api/abogados/recomendaciones'].includes(path)) {
      const publicReq = { ...req, headers: { ...req.headers } };
      delete publicReq.headers.authorization;
      const replies = await Promise.all([upstream(publicReq, body, 'abogados:8082'), upstream(publicReq, body, 'abogados-operativa:8082', true)]);
      if (replies.some(r => !r.ok)) return send(res, 503, { error: 'No se pudo cargar el catálogo completo.' });
      const rows = (await Promise.all(replies.map(r => r.json()))).flat();
      return send(res, 200, rows);
    }
    const publicCase = path.match(/^\/api\/abogados\/catalogo\/(961001|961002)\/(casos|valoraciones)$/);
    if (isolatedRouting && publicCase) test = true;
    let target;
    if (path === '/api/lexi/orientacion') {
      const response = await fetch('http://n8n:5678/webhook/orientacion-legal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(65000) });
      if (!response.ok) return send(res, 503, { error: 'Lexi no está disponible temporalmente. Podés reintentar en unos minutos.' });
      return send(res, 200, normalizarRespuesta(await response.json()));
    }
    if (path.startsWith('/api/auth/')) target = test ? 'auth-operativa:8081' : 'autenticacion:8081';
    else if (path === '/api/ciudadanos' || path.startsWith('/api/ciudadanos/')) target = test ? 'ciudadanos-operativa:8080' : 'ciudadanos:8080';
    else if (path.startsWith('/api/abogados/')) target = test ? 'abogados-operativa:8082' : 'abogados:8082';
    else if (path.startsWith('/api/admin/ciudadanos')) target = 'ciudadanos:8080';
    else if (path.startsWith('/api/admin/abogados')) target = 'abogados:8082';
    else return send(res, 404, {});
    const response = await upstream(req, body, target, test);
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    send(res, 503, { error: 'El servicio no está disponible temporalmente. Podés reintentar.' });
  }
}).listen(3000, '0.0.0.0');
