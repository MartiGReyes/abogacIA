import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { crearServicioIdentidad } from "./identidadService.js";
import { accesoRegistroVigente as accesoAbogado } from "./abogadoService.js";

const URL = "http://ciudadanos.test/api/ciudadanos/verificacion";
let stored, servicio;
const vigente = () => new Date(Date.now() + 900000).toISOString();
beforeEach(() => {
    stored = new Map();
    globalThis.sessionStorage = {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key),
    };
    servicio = crearServicioIdentidad(URL, "ciudadanos", "acceso-ciudadano-test");
});
test("acceso temporal no guarda contraseña ni produce sesión de usuario", async () => {
    const password = randomUUID(), token = randomUUID();
    globalThis.fetch = async (url, options) => {
        assert.equal(url, `${URL}/acceso`);
        assert.equal(options.headers["X-Registro-Token"], undefined);
        return Response.json({ token, vence: vigente() });
    };
    await servicio.accederRegistro("test@example.com", password);
    assert.equal(servicio.accesoRegistroVigente().token, token);
    assert.equal([...stored.values()].join("").includes(password), false);
    assert.equal(stored.size, 1);
    assert.equal(accesoAbogado(), null);
});
test("solo transmite consentimiento y versión, sin IDs, sesiones o estados inventados", async () => {
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: vigente() });
    await servicio.accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async (url, options) => {
        assert.equal(url, `${URL}/sesion`);
        assert.deepEqual(JSON.parse(options.body), { consentimiento: true, avisoVersion: "test-v1" });
        assert.ok(options.headers["X-Registro-Token"]);
        assert.equal(options.headers.Authorization, undefined);
        assert.equal(options.cache, "no-store");
        return Response.json({ cuenta: { estado: "PENDIENTE" } });
    };
    assert.equal((await servicio.iniciarIdentidad(true, "test-v1")).cuenta.estado, "PENDIENTE");
});
test("token vencido o 401 borra acceso e impide consultar", async () => {
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: "2000-01-01T00:00:00Z" });
    await servicio.accederRegistro("test@example.com", randomUUID());
    await assert.rejects(servicio.consultarIdentidad(), /Ingresá nuevamente/);
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: vigente() });
    await servicio.accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async () => Response.json({ error: "No autorizado" }, { status: 401 });
    await assert.rejects(servicio.consultarIdentidad(), /No autorizado/);
    assert.equal(servicio.accesoRegistroVigente(), null);
});
test("aviso bloqueado no fabrica disponibilidad y cerrar revoca en backend", async () => {
    globalThis.fetch = async () => Response.json({ disponible: false, texto: "Aviso sin configurar" });
    assert.equal((await servicio.avisoIdentidad()).disponible, false);
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: vigente() });
    await servicio.accederRegistro("test@example.com", randomUUID());
    globalThis.fetch = async (url, options) => {
        assert.equal(url, `${URL}/cerrar`); assert.ok(options.headers["X-Registro-Token"]);
        return Response.json({ cerrado: true });
    };
    await servicio.cerrarRegistroRemoto(); assert.equal(servicio.accesoRegistroVigente(), null);
});
