import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('\r\n', '\n');

test('cuentas de prueba ligadas al registro profesional y circuito anterior retirado', () => {
    const sql = read('../../microservicio-abogados/src/main/resources/db/cuentas-autenticadas-v1.sql');
    assert.equal(sql, read('./init/40-cuentas-autenticadas.sql'));
    assert.match(sql, /id_abogado bigint PRIMARY KEY REFERENCES public.abogados_registrados/);
    assert.match(sql, /current_database\(\) <> 'contacto_operativo_test'/);
    assert.match(sql, /dni_cifrado bytea/);
    assert.match(read('../../microservicio-abogados/src/main/resources/application.properties'), /ABOGADOS_CUENTAS_PRUEBA_ENABLED:false/);
    const compose = read('../../docker-compose.contacto-operativo-test.yml');
    assert.ok(!compose.includes('ABOGADOS_DESARROLLO_LOCAL_ENABLED'));
    assert.ok(!read('../../frontend/src/pages/Home.tsx').includes('PerfilLocal'));
    assert.match(read('./nginx.conf'), /location \/api\/abogados\/desarrollo\/ \{ return 404; \}/);
});

test('perfil local cifrado, migración restringida y excepción desactivada por defecto', () => {
    const sql = read('../../microservicio-abogados/src/main/resources/db/perfil-local-v1.sql');
    assert.equal(read('./init/30-perfil-local.sql'), sql);
    assert.match(sql, /current_database\(\) <> 'contacto_operativo_test'/);
    assert.match(sql, /current_user <> 'operativa_owner'/);
    assert.match(sql, /dni_cifrado bytea NOT NULL/);
    assert.match(sql, /telefono_cifrado bytea NOT NULL/);
    assert.ok(!/DROP|DELETE|TRUNCATE|ALTER TABLE/i.test(sql));
    assert.match(read('../../microservicio-abogados/src/main/resources/application.properties'), /ABOGADOS_DESARROLLO_LOCAL_ENABLED:false/);
    const app = read('../../frontend/src/App.tsx');
    assert.ok(!app.includes('OperativaPage'));
    assert.ok(!read('../../frontend/src/services/contactoService.js').includes('perfilesCampania'));
});
test('migración de autorización explícita, idéntica en init y limitada a la base aislada', () => {
    const sql = read('../../microservicio-abogados/src/main/resources/db/whatsapp-v1.sql');
    assert.equal(read('./init/20-whatsapp.sql'), sql);
    assert.match(sql, /current_database\(\) <> 'contacto_operativo_test'/);
    assert.match(sql, /permitido boolean NOT NULL DEFAULT false/);
    assert.ok(!/ALTER TABLE.*abogados_registrados/i.test(sql));
});
test('esquema aislado corresponde al modelo SQL y no guarda DNI ni teléfono en texto', () => {
    const modelo = read('../../microservicio-abogados/src/main/resources/db/operativa-v1.sql');
    assert.ok(read('./init/10-schema.sql').includes(modelo));
    assert.match(modelo, /dni_cifrado bytea NOT NULL/); assert.match(modelo, /telefono_cifrado bytea NOT NULL/);
    assert.ok(!/\bdni\s+(?:varchar|text)|\btelefono\s+(?:varchar|text)/.test(modelo));
});
test('Compose no monta volúmenes existentes ni ejecuta migraciones sobre bases habituales', () => {
    const compose = read('../../docker-compose.contacto-operativo-test.yml');
    assert.match(compose, /name: abogacia-contacto-operativo-test/); assert.match(compose, /127\.0\.0\.1:5182:80/);
    for (const prohibido of ['pgdata', 'n8n_data', 'ep06_', 'abogados_dev_data', 'dashboard_test_data', 'external:', 'container_name:']) assert.ok(!compose.includes(prohibido));
    assert.match(read('../../microservicio-abogados/src/main/resources/application-contacto-operativo-test.properties'), /ddl-auto=validate/);
});
test('clave y acceso locales están fuera de la raíz del repositorio', () => {
    const env = read('./.env');
    const repo = resolve(new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    for (const nombre of ['OP_KEY_PATH', 'OP_OPERATOR_PATH']) {
        const path = env.match(new RegExp('^' + nombre + '=(.+)$', 'm'))[1].trim();
        assert.ok(relative(repo, path).startsWith('..'), 'Secretos fuera del repositorio');
        assert.ok(readFileSync(path).length >= 43);
    }
});
