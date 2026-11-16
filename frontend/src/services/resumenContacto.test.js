import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirContactoLexi, combinarResumenLexi } from './resumenContacto.js';
import { mensajeWhatsApp } from './contactoService.js';
import { crearConversacion } from './lexiConversation.js';

test('el borrador usa solo los dos textos seleccionados y WhatsApp conserva ambos', () => {
    const textos = { consulta: 'Me despidieron sin causa.', orientacion: 'Revisá la documentación del despido.' };
    const resumen = resumirContactoLexi(textos);
    assert.deepEqual(resumen, textos);
    const mensaje = mensajeWhatsApp({ nombre: 'Profesional', apellido: 'Sintético' }, { nombre: 'Ciudadano', telefono: '+5493510000009', resumen: combinarResumenLexi(resumen) });
    assert.ok(mensaje.includes('Consulta del ciudadano:\n' + textos.consulta));
    assert.ok(mensaje.includes('Orientación de Lexi:\n' + textos.orientacion));
    assert.equal(resumirContactoLexi(null), null);
    assert.equal(resumirContactoLexi({ consulta: 'Texto', orientacion: '' }), null);
});

test('extractos largos son prefijos literales explícitos, sin superar el contrato existente', () => {
    const origen = { consulta: 'Consulta sintética con detalles. '.repeat(100), orientacion: 'Orientación laboral sin conclusiones añadidas. '.repeat(100) };
    const resumen = resumirContactoLexi(origen);
    for (const key of ['consulta', 'orientacion']) {
        assert.ok(resumen[key].endsWith('…'));
        assert.ok(origen[key].startsWith(resumen[key].slice(0, -1)));
    }
    assert.ok(combinarResumenLexi(resumen).length <= 800);
});

test('una consulta nueva revoca contacto anterior incluso con recomendación pendiente', async () => {
    let terminar;
    const chat = crearConversacion(async text => ({ orientacion: 'Orientación ' + text, estado: 'RESPONDIDA', mostrarAbogados: true }), () => new Promise(resolve => { terminar = resolve; }));
    await chat.send('Primera');
    const oldId = chat.getSnapshot().msgs.at(-1).id;
    const pending = chat.decidir(oldId, true);
    const next = chat.send('Segunda');
    assert.deepEqual(chat.getSnapshot().recomendaciones, {});
    await next;
    terminar([{ idAbogado: 1 }]);await pending;
    assert.equal(chat.getSnapshot().recomendaciones[oldId], undefined);
    assert.equal(Object.values(chat.getSnapshot().recomendaciones)[0].consulta, 'Segunda');
});
