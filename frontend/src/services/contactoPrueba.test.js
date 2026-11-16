import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBorradorContacto, mensajeContacto, simularContacto } from './contactoPrueba.js';
import { crearConversacion } from './lexiConversation.js';

const abogado = { nombre: 'Valentina', apellido: 'Torres', perfilPrueba: true, nroCelular: '+5491112345678' };
const datos = () => ({ ...crearBorradorContacto('Me despidieron.', 'Podrías reunir la documentación.'), nombre: 'Ciudadano ficticio', telefono: 'TELÉFONO DE PRUEBA' });

test('el borrador separa hechos y orientación con extractos literales, sin inventar datos', () => {
    const draft = crearBorradorContacto('Me despidieron.', 'Podrías reunir la documentación.');
    assert.equal(draft.nombre, '');
    assert.equal(draft.telefono, '');
    assert.equal(draft.descripcion, 'Me despidieron.');
    assert.equal(draft.resumen, 'Consulta del ciudadano (extracto): Me despidieron.\n\nOrientación de Lexi (extracto, no verificada): Podrías reunir la documentación.');
    const largo = crearBorradorContacto('palabra '.repeat(200), 'orientación '.repeat(200));
    assert.ok(largo.resumen.length < 650);
    assert.match(largo.resumen, /…/);
});

test('una consulta nueva retira la recomendación anterior y conserva su propio contexto', async () => {
    const chat = crearConversacion(async consulta => ({ orientacion: `Orientación sobre: ${consulta}`, estado: 'RESPONDIDA', mostrarAbogados: true }), async () => [abogado]);
    await chat.send('Me despidieron.');
    const id = chat.getSnapshot().msgs.at(-1).id;
    await chat.decidir(id, true);
    await chat.send('Otra consulta diferente.');
    assert.equal(chat.getSnapshot().recomendaciones[id], undefined);
    const current = chat.getSnapshot().recomendaciones[chat.getSnapshot().msgs.at(-1).id];
    assert.equal(current.consulta, 'Otra consulta diferente.');
    assert.equal(current.orientacion, 'Orientación sobre: Otra consulta diferente.');
});

test('la vista previa refleja las ediciones y omite el número de destino incluso si existe', () => {
    const draft = datos();
    draft.descripcion = 'Descripción corregida por mí.';
    draft.resumen = 'Resumen corregido por mí.';
    const mensaje = mensajeContacto(abogado, draft);
    assert.match(mensaje, /Descripción corregida por mí\./);
    assert.match(mensaje, /Resumen corregido por mí\./);
    assert.match(mensaje, /PERFIL DE PRUEBA — NO ES UN ABOGADO REAL/);
    assert.ok(!mensaje.includes(abogado.nroCelular));
    assert.ok(!mensaje.includes('wa.me'));
});

test('la simulación exige confirmación del mensaje exacto y rechaza cambios posteriores', () => {
    const draft = datos();
    const preview = mensajeContacto(abogado, draft);
    assert.throws(() => simularContacto(abogado, draft, null), /Confirmá/);
    assert.throws(() => simularContacto(abogado, draft, true), /Confirmá/);
    for (const campo of ['nombre', 'telefono', 'descripcion', 'resumen']) {
        assert.throws(() => simularContacto(abogado, { ...draft, [campo]: 'Editado' }, preview), /Confirmá/);
        assert.throws(() => simularContacto(abogado, { ...draft, [campo]: '   ' }, preview), /Completá/);
    }
    assert.throws(() => simularContacto({ ...abogado, perfilPrueba: false }, draft, preview), /ficticios/);
    assert.deepEqual(simularContacto(abogado, draft, preview), { simulado: true, mensaje: preview });
});

test('confirmar la simulación no accede a red, navegación ni almacenamiento', () => {
    const previous = globalThis.fetch;
    globalThis.fetch = () => { assert.fail('La simulación no debe hacer solicitudes'); };
    try {
        const draft = datos();
        // Node has no window, location or localStorage: accessing any would fail.
        assert.equal(simularContacto(abogado, draft, mensajeContacto(abogado, draft)).simulado, true);
    } finally { globalThis.fetch = previous; }
});
