import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('development bundle requests recommendations on the frontend origin', async () => {
    const dockerfile = await read('../../../docker/abogados-dev/frontend.Dockerfile');
    const base = dockerfile.match(/^ENV VITE_ABOGADOS_URL=(.*)$/m)?.[1].trim();
    assert.equal(base, '/');
    const bundle = await build({
        configFile: false, logLevel: 'silent',
        define: { 'import.meta.env.VITE_ABOGADOS_URL': JSON.stringify(base) },
        build: {
            write: false, minify: false,
            lib: { entry: fileURLToPath(new URL('./abogadoService.js', import.meta.url)), formats: ['es'] },
        },
    });
    const output = Array.isArray(bundle) ? bundle[0] : bundle;
    const service = await import(`data:text/javascript;base64,${Buffer.from(output.output[0].code).toString('base64')}`);
    const previous = globalThis.fetch;
    const urls = [];
    try {
        globalThis.fetch = async url => { urls.push(url); return Response.json([]); };
        await service.obtenerRecomendaciones('Derecho Laboral');
        await service.obtenerRecomendaciones();
        assert.deepEqual(urls, [
            '/api/abogados/recomendaciones?especialidad=Derecho+Laboral',
            '/api/abogados/recomendaciones',
        ]);
    } finally { globalThis.fetch = previous; }
});

test('development Nginx preserves Lexi and proxies only the exact recommendations route', async () => {
    const usual = await read('../../nginx.conf');
    const dev = await read('../../nginx.abogados-dev.conf');
    const route = /    # Only recommendations[^]*?    location = \/api\/abogados\/recomendaciones \{[^}]*\}\r?\n/;
    assert.equal(dev.replace(route, ''), usual);
    assert.match(dev, /location = \/api\/abogados\/recomendaciones\s*\{\s*proxy_pass http:\/\/abogados-dev:8082;/);
    const dockerfile = await read('../../../docker/abogados-dev/frontend.Dockerfile');
    assert.match(dockerfile, /COPY nginx\.abogados-dev\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
});
