import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearConversacion, inferirEspecialidad } from './lexiConversation.js';
import { obtenerRecomendaciones } from './abogadoService.js';
import { readFile } from 'node:fs/promises';

test('fixtures preparados son sintéticos, identificables y sin verificaciones falsas', async () => {
    const profiles = JSON.parse(await readFile(new URL('../../../scripts/dev/abogados-prueba.json', import.meta.url), 'utf8'));
    assert.equal(profiles.length, 3);
    assert.equal(new Set(profiles.map(p => p.fixtureId)).size, 3);
    assert.equal(new Set(profiles.map(p => p.dni)).size, 3);
    for (const p of profiles) {
        assert.equal(p.perfilPrueba, true);
        assert.match(p.dni, /^TEST\d{4}$/);
        assert.match(p.mail, /@example\.com$/);
        assert.equal(p.estado, 'PENDIENTE');
        assert.equal(p.dniVerificado, false);
        assert.equal(p.matriculaVerificada, false);
        assert.equal(p.correoConfirmado, false);
        assert.equal(p.nroMatricula, null);
        assert.equal(p.nroCelular, null);
        assert.equal(p.advertencia, 'PERFIL DE PRUEBA — NO ES UN ABOGADO REAL');
    }
});

test('clasifica únicamente especialidades reconocidas y evita ambigüedad', () => {
    assert.equal(inferirEspecialidad('Me despidieron sin causa'), 'Derecho Laboral');
    assert.equal(inferirEspecialidad('Artículo 92 bis'), 'Derecho Laboral');
    assert.equal(inferirEspecialidad('Garantía de una compra'), 'Defensa del Consumidor');
    assert.equal(inferirEspecialidad('Conflicto contractual civil'), 'Derecho Civil');
    assert.equal(inferirEspecialidad('Consulta general'), null);
    assert.equal(inferirEspecialidad('Despido y garantía de una compra'), null);
});

test('ofrece solo después de la orientación, acepta una vez y guarda las tarjetas', async () => {
    let finish;
    let calls = 0;
    const lawyers = [{ idAbogado: 1, nombre: 'Prueba' }];
    const chat = crearConversacion(async () => 'Orientación', especialidad => {
        calls++; assert.equal(especialidad, 'Derecho Laboral');
        return new Promise(resolve => { finish = () => resolve(lawyers); });
    });
    assert.deepEqual(chat.getSnapshot().recomendaciones, {});
    await chat.send('Me despidieron');
    const id = chat.getSnapshot().msgs.at(-1).id;
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'oferta');
    assert.equal(calls, 0);
    const pending = chat.decidir(id, true);
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'cargando');
    await chat.decidir(id, true);
    finish(); await pending;
    await chat.decidir(id, true);
    assert.equal(calls, 1);
    assert.deepEqual(chat.getSnapshot().recomendaciones[id].abogados, lawyers);
    await chat.send('Otra consulta');
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'lista');
});

test('rechazar no consulta el backend ni repite la oferta de ese mensaje', async () => {
    const chat = crearConversacion(async () => 'Orientación', () => { assert.fail('No debe consultar'); });
    await chat.send('Consulta');
    const id = chat.getSnapshot().msgs.at(-1).id;
    await chat.decidir(id, false);
    await chat.decidir(id, true);
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'rechazada');
    await chat.send('Continuar');
    assert.equal(chat.getSnapshot().msgs.length, 5);
});

test('maneja ausencia, errores recuperables y búsqueda general sin perder historial', async () => {
    let fail = true;
    const chat = crearConversacion(async () => 'Orientación', async filter => {
        assert.equal(filter, null);
        if (fail) throw new Error('Temporal');
        return [];
    });
    await chat.send('Consulta general');
    const id = chat.getSnapshot().msgs.at(-1).id;
    await chat.decidir(id, true);
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'error');
    await chat.send('Podemos seguir');
    fail = false;
    await chat.decidir(id, true);
    assert.equal(chat.getSnapshot().recomendaciones[id].estado, 'lista');
    assert.deepEqual(chat.getSnapshot().recomendaciones[id].abogados, []);
    assert.equal(chat.getSnapshot().msgs.length, 5);
});

test('no ofrece recomendaciones tras un fallo de orientación', async () => {
    const chat = crearConversacion(async () => { throw new Error('Temporal'); });
    await chat.send('Consulta');
    assert.deepEqual(chat.getSnapshot().recomendaciones, {});
});

test('servicio usa solo filtro codificado y valida errores y tarjetas', async () => {
    const previous = globalThis.fetch;
    try {
        globalThis.fetch = async url => {
            const parsed = new URL(url);
            assert.equal(parsed.pathname, '/api/abogados/recomendaciones');
            assert.equal(parsed.searchParams.get('especialidad'), 'Derecho Laboral');
            assert.equal([...parsed.searchParams].length, 1);
            return Response.json([{ idAbogado: 1, nombre: 'Perfil', apellido: 'Test', especialidades: [], perfilPrueba: false }]);
        };
        assert.equal((await obtenerRecomendaciones('Derecho Laboral')).length, 1);
        globalThis.fetch = async () => Response.json({ dni: 'secreto' });
        await assert.rejects(obtenerRecomendaciones(), /inválida/);
        globalThis.fetch = async () => new Response('', { status: 503 });
        await assert.rejects(obtenerRecomendaciones(), /reintentar/);
    } finally { globalThis.fetch = previous; }
});
