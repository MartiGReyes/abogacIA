import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerOrientacion } from './lexiService.js';
import { crearConversacion } from './lexiConversation.js';

test('envía el contrato real a un proxy del mismo origen', async () => {
    const reply = await obtenerOrientacion('Consulta laboral', { fetchImpl: async (url, options) => {
        assert.equal(url, '/api/lexi/orientacion');
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), { chatInput: 'Consulta laboral' });
        assert.equal(options.headers.Authorization, undefined);
        return Response.json({ orientacion: 'Orientación del workflow' });
    } });
    assert.equal(reply, 'Orientación del workflow');
});

test('rechaza errores HTTP y respuestas sin orientación válida', async () => {
    for (const status of [401, 403, 404, 500]) {
        await assert.rejects(obtenerOrientacion('Consulta', { fetchImpl: async () => new Response('', { status }) }));
    }
    for (const data of [{}, { orientacion: '' }, { orientacion: 12 }]) {
        await assert.rejects(obtenerOrientacion('Consulta', { fetchImpl: async () => Response.json(data) }), /inválida/);
    }
});

test('timeout y fallo de red son recuperables', async () => {
    await assert.rejects(obtenerOrientacion('Consulta', { fetchImpl: async () => { throw new TypeError('network'); } }), /conectar/);
    await assert.rejects(obtenerOrientacion('Consulta', { timeoutMs: 5, fetchImpl: (_, { signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('abort')));
    }) }), /demoró/);
});

test('evita envíos simultáneos y conserva historial al volver a suscribirse', async () => {
    let resolve;
    let calls = 0;
    const chat = crearConversacion(() => { calls++; return new Promise(r => { resolve = r; }); });
    const unsubscribe = chat.subscribe(() => {});
    const pending = chat.send('Consulta');
    await chat.send('Duplicada');
    unsubscribe();
    resolve('Respuesta real');
    await pending;
    const stop = chat.subscribe(() => {});
    assert.equal(calls, 1);
    assert.equal(chat.getSnapshot().msgs.length, 3);
    assert.equal(chat.getSnapshot().msgs[2].text, 'Respuesta real');
    assert.equal(chat.getSnapshot().typing, false);
    stop();
});

test('reintentar conserva la consulta sin duplicarla y no fabrica orientación', async () => {
    let fails = true;
    const chat = crearConversacion(async () => { if (fails) throw new Error('Sin conexión'); return 'Respuesta'; });
    await chat.send('Consulta');
    assert.equal(chat.getSnapshot().msgs.length, 2);
    assert.equal(chat.getSnapshot().error, 'Sin conexión');
    fails = false;
    await chat.retry();
    assert.equal(chat.getSnapshot().msgs.length, 3);
    assert.equal(chat.getSnapshot().error, '');
});
