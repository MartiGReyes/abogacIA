import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { confirmarAbogado, iniciarSolicitudAbogado, crearCuentaAbogado, accesoRegistroVigente } from "./abogadoService.js";

beforeEach(() => {
    const stored = new Map();
    globalThis.sessionStorage = {
        getItem: key => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key),
    };
});
test("la solicitud envía solo DNI, correo y teléfono y guarda el acceso temporal", async () => {
    const token = randomUUID();
    globalThis.fetch = async (url, opciones) => {
        assert.equal(url, "http://localhost:8082/api/abogados/verificacion/solicitud");
        assert.deepEqual(JSON.parse(opciones.body), { dni: "12345678", mail: "ana@example.com", nroCelular: "351" });
        assert.equal(opciones.headers["X-Registro-Token"], undefined);
        return Response.json({ token, vence: new Date(Date.now() + 3600000).toISOString() }, { status: 201 });
    };
    await iniciarSolicitudAbogado("12345678", "ana@example.com", "351");
    assert.equal(accesoRegistroVigente().token, token);
});
test("crear la cuenta usa el acceso temporal y no envía datos personales", async () => {
    globalThis.fetch = async () => Response.json({ token: randomUUID(), vence: new Date(Date.now() + 3600000).toISOString() });
    await iniciarSolicitudAbogado("12345678", "ana@example.com", "351");
    globalThis.fetch = async (url, opciones) => {
        assert.ok(url.endsWith("/verificacion/cuenta"));
        assert.ok(opciones.headers["X-Registro-Token"]);
        assert.equal(JSON.parse(opciones.body).nombre, undefined);
        return Response.json({ estado: "PENDIENTE", verificacionDni: "APROBADA" }, { status: 201 });
    };
    assert.equal((await crearCuentaAbogado({ especialidades: ["Derecho Civil"] })).verificacionDni, "APROBADA");
});
test("confirmación identifica correo y código y propaga errores claros", async () => {
    globalThis.fetch = async (url, opciones) => {
        assert.equal(url, "http://localhost:8082/api/abogados/confirmar");
        assert.deepEqual(JSON.parse(opciones.body), { mail: "ana@example.com", codigo: "000000" });
        return Response.json({ error: "Código inválido." }, { status: 400 });
    };
    await assert.rejects(confirmarAbogado("ana@example.com", "000000"), /Código inválido/);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    await assert.rejects(confirmarAbogado("ana@example.com", "1"), /No se pudo conectar/);
});
