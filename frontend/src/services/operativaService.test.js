import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeOperativo, enlaceOperativoSeguro, apiOperativa } from './operativaService.js';
test('vista previa mínima omite campos opcionales vacíos y datos de verificación', () => {
    const texto = mensajeOperativo({ resumen: 'Consulta técnica sintética.' });
    assert.equal(texto, 'Prueba operativa de abogacIA — contacto técnico.\nResumen revisado: Consulta técnica sintética.');
    assert.ok(!/DNI|matrícula|Didit/.test(texto));
});
test('solo acepta enlaces oficiales de wa.me con destino argentino y texto', () => {
    assert.equal(enlaceOperativoSeguro('https://wa.me/5493510000000?text=prueba'), true);
    for (const url of ['javascript:alert(1)', 'http://wa.me/5493510000000?text=x', 'https://wa.me.ejemplo.com/5493510000000?text=x', 'https://wa.me/5493510000000?text=x&otra=y', 'https://wa.me/543510000000?text=x', 'https://user@wa.me/5493510000000?text=x']) assert.equal(enlaceOperativoSeguro(url), false);
});
test('API privada usa cookie same-origin sin almacenar datos ni usar sesión profesional', async () => {
    const previo = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, '/api/pruebas-operativas/perfiles');
        assert.equal(options.credentials, 'same-origin');
        assert.equal(options.headers.Authorization, undefined);
        return Response.json({ existe: true });
    };
    try { assert.deepEqual(await apiOperativa('perfiles', { nombre: 'AUTOTEST' }), { existe: true }); }
    finally { globalThis.fetch = previo; }
});
test('errores conservan estado HTTP sin mostrar cuerpos de petición', async () => {
    const previo = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ error: 'Acceso cerrado.' }, { status: 401 });
    try { await assert.rejects(apiOperativa('sesion'), e => e.status === 401 && e.message === 'Acceso cerrado.'); }
    finally { globalThis.fetch = previo; }
});
