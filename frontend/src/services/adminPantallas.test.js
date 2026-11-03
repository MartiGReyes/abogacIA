import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

test('rutas administrativas protegen el contenido y muestran formularios y carga accesibles', async () => {
    const entry = 'virtual:admin-render-test';
    const context = 'virtual:admin-test-context';
    const component = fileURLToPath(new URL('../pages/Admin.tsx', import.meta.url)).replaceAll('\\', '/');
    const result = await build({
        configFile: false, logLevel: 'silent', plugins: [
            { name: 'admin-render-fixture', enforce: 'pre',
                resolveId(id) {
                    if (id.endsWith(entry)) return entry;
                    if (id === context) return id;
                    if (id.endsWith('/AuthContext') || id.endsWith('/AuthContext.jsx')) return context;
                },
                load(id) {
                    if (id === context) return 'let sesion; export function setSesion(value) { sesion = value; } export function useSesion() { return sesion; }';
                    if (id === entry) return `
                        import React from 'react';
                        import { renderToStaticMarkup } from 'react-dom/server.node';
                        import { MemoryRouter } from 'react-router-dom';
                        import { AdminProtegido, AdminPanel, AdminAbogados, AdminIdentidad } from ${JSON.stringify(component)};
                        import { AdminUsuarios, AdminPadron } from ${JSON.stringify(component.replace('/Admin.tsx', '/AdminGestion.tsx'))};
                        import { setSesion } from '${context}';
                        export function render(sesion, vista) {
                            setSesion(sesion);
                            const Content = { panel: AdminPanel, abogados: AdminAbogados, identidad: AdminIdentidad, usuarios: AdminUsuarios, padron: AdminPadron }[vista];
                            return renderToStaticMarkup(React.createElement(MemoryRouter, null,
                                React.createElement(AdminProtegido, null, React.createElement(Content))));
                        }
                    `;
                },
            }, react(),
        ],
        define: { 'process.env.NODE_ENV': JSON.stringify('production') },
        build: { write: false, minify: false, lib: { entry, formats: ['es'] },
            rolldownOptions: { external: ['stream', 'util', 'async_hooks', 'crypto', 'node:stream', 'node:util', 'node:async_hooks', 'node:crypto'] } },
    });
    const output = Array.isArray(result) ? result[0] : result;
    const code = `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});\n${output.output[0].code}\n//# sourceURL=admin-render-test.js`;
    const { render } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    for (const sesion of [null, { rol: 'CIUDADANO', expiresAt: Date.now() + 60000 }, { rol: 'ABOGADO', expiresAt: Date.now() + 60000 }]) {
        assert.ok(!render(sesion, 'panel').includes('cuentas en total'));
        assert.ok(!render(sesion, 'abogados').includes('Nombre o apellido'));
        assert.ok(!render(sesion, 'identidad').includes('Buscar cuentas'));
        assert.ok(!render(sesion, 'usuarios').includes('Buscar usuarios'));
        assert.ok(!render(sesion, 'padron').includes('Archivo del padrón'));
    }
    const admin = { rol: 'ADMIN', expiresAt: Date.now() + 60000 };
    const panel = render(admin, 'panel');
    assert.match(panel, /Panel de control/);
    assert.equal((panel.match(/Cargando indicadores/g) || []).length, 2);
    const listado = render(admin, 'abogados');
    for (const label of ['Nombre o apellido', 'Estado de cuenta', 'Identidad', 'Matrícula', 'Resultados por página', 'Cargando abogados']) assert.ok(listado.includes(label));
    assert.match(render(admin, 'usuarios'), /Buscar usuarios/);
    assert.match(render(admin, 'padron'), /Archivo del padrón/);
    assert.match(render(admin, 'padron'), /Confirmo que quiero reemplazar/);
    const previous = globalThis.window;
    globalThis.window = { location: { search: '' } };
    try {
        const identidad = render(admin, 'identidad');
        assert.match(identidad, /No inicia verificaciones/);
        assert.match(identidad, /Nombre o apellido/);
        assert.match(identidad, /Buscar cuentas/);
        assert.match(identidad, /Buscando cuentas/);
        assert.ok(!identidad.includes('Identificador de cuenta'));
        assert.ok(!identidad.includes('iframe'));
    } finally { globalThis.window = previous; }
});
