import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
test('baseline aislado incluye exactamente el modelo SQL del microservicio', () => {
    const modelo = read('../../microservicio-abogados/src/main/resources/db/dashboard-v1.sql');
    assert.ok(read('./init/10-schema.sql').includes(modelo));
});
test('Compose solo usa red, volumen y base propios del dashboard', () => {
    const compose = read('../../docker-compose.dashboard-test.yml');
    assert.match(compose, /name: abogacia-dashboard-test/);
    assert.match(compose, /127\.0\.0\.1:5181:80/);
    for (const prohibido of ['pgdata', 'n8n_data', 'ep06_', 'abogados_dev_data', 'abogacia_default', 'external:']) assert.ok(!compose.includes(prohibido));
    const perfil = read('../../microservicio-abogados/src/main/resources/application-dashboard-test.properties');
    assert.match(perfil, /ddl-auto=validate/); assert.match(perfil, /spring.sql.init.mode=never/);
});
