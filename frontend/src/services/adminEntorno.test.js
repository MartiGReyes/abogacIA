import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const base = '../../../docker/admin-readonly/';

test('el login compilado para EP06 usa únicamente la ruta relativa de prueba', async () => {
    const result = await build({ configFile: false, logLevel: 'silent',
        define: { 'import.meta.env.VITE_AUTH_URL': JSON.stringify('/') },
        build: { write: false, minify: false, lib: { entry: fileURLToPath(new URL('./authService.js', import.meta.url)), formats: ['es'] } },
    });
    const output = Array.isArray(result) ? result[0] : result;
    const api = await import(`data:text/javascript;base64,${Buffer.from(output.output[0].code).toString('base64')}`);
    const previous = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
    const stored = new Map();
    globalThis.window = new EventTarget();
    globalThis.sessionStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/auth/login');
        assert.equal(options.method, 'POST');
        assert.equal(JSON.parse(options.body).tipoCuenta, 'ADMIN');
        return Response.json({ rol: 'ADMIN', idUsuario: 'admin', token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test` });
    };
    try { assert.equal((await api.iniciarSesion('admin.ep06@example.com', 'only-unit-test', 'ADMIN')).rol, 'ADMIN'); }
    finally { Object.assign(globalThis, previous); }
});

test('el frontend aislado compila con el login existente y sin portal, registro, Lexi ni destinos habituales', async () => {
    const overlay = fileURLToPath(new URL('../adminIsolatedMain.tsx', import.meta.url)).replaceAll('\\', '/');
    const source = await read(`${base}frontend/main.tsx`);
    const html = await read(`${base}frontend/index.html`);
    const result = await build({ logLevel: 'silent',
        define: {
            'import.meta.env.VITE_AUTH_URL': JSON.stringify('/'),
            'import.meta.env.VITE_ADMIN_CIUDADANOS_URL': JSON.stringify('/'),
            'import.meta.env.VITE_ADMIN_ABOGADOS_URL': JSON.stringify('/'),
        },
        plugins: [{ name: 'ep06-image-overlay-test', enforce: 'pre',
            transformIndexHtml: { order: 'pre', handler: () => html },
            resolveId(id) { if (id.endsWith('/src/adminIsolatedMain.tsx')) return overlay; },
            load(id) { if (id === overlay) return source; },
        }],
        build: { write: false },
    });
    const output = Array.isArray(result) ? result[0] : result;
    const js = output.output.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
    assert.match(js, /ENTORNO AISLADO/);
    assert.match(js, /\/api\/auth\/login/);
    for (const forbidden of ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'webhook/orientacion-legal', 'wa.me', '/api/lexi/orientacion']) assert.ok(!js.includes(forbidden), forbidden);
    assert.ok(!source.includes('HomePage'));
    assert.match(js, /\/admin\/usuarios/);
    assert.match(js, /\/admin\/padron/);
    assert.ok(!source.includes('soloLectura'));

    const nginx = await read(`${base}nginx.conf`);
    assert.match(nginx, /location \/api\/ \{ return 404; \}/);
    assert.match(nginx, /location = \/api\/admin\/ciudadanos\s*\{\s*limit_except GET \{ deny all; \}\s*proxy_pass http:\/\/ciudadanos-admin-test:8080;/);
    assert.ok(!nginx.includes('n8n'));
    assert.match(nginx, /suspender\|rehabilitar/);
    assert.match(nginx, /location = \/api\/admin\/abogados\/padron/);
    assert.match(nginx, /client_max_body_size 9m/);
});

test('Postman cubre los seis endpoints con ADMIN, sin token, otros roles y token inválido; secretos vacíos', async () => {
    const collection = JSON.parse(await read(`${base}postman/EP06.postman_collection.json`));
    const environment = JSON.parse(await read(`${base}postman/EP06.postman_environment.json`));
    assert.equal(environment.values.find(v => v.key === 'baseUrl').value, 'http://localhost:5180');
    for (const item of environment.values.filter(v => v.type === 'secret')) assert.equal(item.value, '');
    assert.equal(collection.item.length, 8);
    for (const folder of collection.item.slice(1, 6)) {
        assert.equal(folder.item.length, 6);
        assert.ok(folder.item.some(item => item.request.url.includes('/api/admin/ciudadanos?')));
    }
    for (const event of collection.event) assert.doesNotThrow(() => new Function(event.script.exec.join('\n')));
    for (const request of collection.item.flatMap(folder => folder.item)) {
        assert.ok(request.request.url.startsWith('{{baseUrl}}/api/'));
        assert.ok(['GET', 'POST'].includes(request.request.method));
        if (request.request.method === 'POST') assert.equal(request.request.url, '{{baseUrl}}/api/auth/login');
        for (const event of request.event) assert.doesNotThrow(() => new Function(event.script.exec.join('\n')));
    }
});
