import test from "node:test";
import assert from "node:assert/strict";
import { registrarAbogado, confirmarAbogado } from "./abogadoService.js";

test("registro transmite datos, no fabrica una verificación y conserva estados pendientes", async () => {
    const anterior = globalThis.fetch;
    try {
        globalThis.fetch = async (url, opciones) => {
            assert.equal(url, "http://localhost:8082/api/abogados");
            const datos = JSON.parse(opciones.body);
            assert.equal(datos.dni, "12345678");
            assert.equal(datos.dniVerificado, undefined);
            assert.equal(opciones.headers.Authorization, undefined);
            return { ok: true, json: async () => ({ estado: "PENDIENTE", verificacionDni: "PENDIENTE" }) };
        };
        assert.equal((await registrarAbogado({ dni: "12345678" })).estado, "PENDIENTE");
    } finally { globalThis.fetch = anterior; }
});
test("confirmación identifica correo y código y propaga errores claros", async () => {
    const anterior = globalThis.fetch;
    try {
        globalThis.fetch = async (url, opciones) => {
            assert.equal(url, "http://localhost:8082/api/abogados/confirmar");
            assert.deepEqual(JSON.parse(opciones.body), { mail: "ana@example.com", codigo: "incorrecto" });
            return { ok: false, json: async () => ({ error: "Código inválido." }) };
        };
        await assert.rejects(confirmarAbogado("ana@example.com", "incorrecto"), /Código inválido/);
        globalThis.fetch = async () => { throw new TypeError("offline"); };
        await assert.rejects(registrarAbogado({}), /No se pudo conectar/);
    } finally { globalThis.fetch = anterior; }
});
