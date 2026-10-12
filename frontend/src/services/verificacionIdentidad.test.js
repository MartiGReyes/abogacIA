import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { accederRegistro, accesoRegistroVigente, iniciarIdentidad, consultarIdentidad, cerrarRegistroRemoto, avisoIdentidad } from "./abogadoService.js";
let stored;
beforeEach(() => {
    stored = new Map();
    globalThis.sessionStorage = {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key),
    };
});
test("acceso temporal no guarda contraseña ni produce sesión profesional", async () => {
    const password = randomUUID(), token = randomUUID();
    globalThis.fetch = async (_url, options) => {
        assert.equal(options.headers["X-Registro-Token"], undefined);
        return Response.json({ token, vence: new Date(Date.now() + 900000).toISOString() });
    };
    await accederRegistro("test@example.com", password);
    assert.equal(accesoRegistroVigente().token, token);
    assert.equal([...stored.values()].join("").includes(password), false);
    assert.equal(stored.size, 1);
});
test("solo transmite consentimiento y versión, sin IDs, sesiones o estados inventados", async () => {
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: new Date(Date.now() + 900000).toISOString() });
    await accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async (url, options) => {
        assert.ok(url.endsWith("/verificacion/sesion"));
        assert.deepEqual(JSON.parse(options.body), { consentimiento: true, avisoVersion: "test-v1" });
        assert.ok(options.headers["X-Registro-Token"]);
        assert.equal(options.headers.Authorization, undefined);
        assert.equal(options.cache, "no-store");
        return Response.json({ cuenta: { estado: "PENDIENTE" } });
    };
    assert.equal((await iniciarIdentidad(true, "test-v1")).cuenta.estado, "PENDIENTE");
});
test("token vencido o 401 borra acceso e impide consultar", async () => {
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: "2000-01-01T00:00:00Z" });
    await accederRegistro("test@example.com", randomUUID());
    await assert.rejects(consultarIdentidad(), /Ingresá nuevamente/);
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: new Date(Date.now() + 900000).toISOString() });
    await accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async () => Response.json({ error: "No autorizado" }, { status: 401 });
    await assert.rejects(consultarIdentidad(), /No autorizado/);
    assert.equal(accesoRegistroVigente(), null);
});
test("aviso bloqueado no fabrica disponibilidad y cerrar revoca en backend", async () => {
    globalThis.fetch = async () => Response.json({ disponible: false, texto: "Aviso sin configurar" });
    assert.equal((await avisoIdentidad()).disponible, false);
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: new Date(Date.now() + 900000).toISOString() });
    await accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async (url, options) => {
        assert.ok(url.endsWith("/cerrar")); assert.ok(options.headers["X-Registro-Token"]);
        return Response.json({ cerrado: true });
    };
    await cerrarRegistroRemoto(); assert.equal(accesoRegistroVigente(), null);
});
